import { useMemo, useState } from "react";
import { read as xlsxRead, utils as xlsxUtils } from "xlsx";
import {
  useListLocations,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
  useCreateLocationNote,
  useDeleteLocationNote,
  useListClasses,
  useCreateClass,
  useUpdateClass,
  getListLocationsQueryKey,
  getListClassesQueryKey,
  type LocationDetail,
  type ClassSession,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  MapPin,
  User,
  Mail,
  Phone,
  CalendarDays,
  AlertTriangle,
  MessageSquare,
  Trash2,
  Pencil,
  Search,
  ChevronDown,
  ChevronUp,
  Send,
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  FileText,
  Building2,
  CalendarPlus,
  Clock,
  Users,
  Check,
  X,
} from "lucide-react";
import { useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDate } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CERT_LABELS: Record<string, string> = {
  cpr_aed_first_aid: "CPR+AED",
  stop_the_bleed: "Stop the Bleed",
  cpr_aed_first_aid_stop_the_bleed: "CPR+STB",
};

// ─── Business unit helpers ────────────────────────────────────────────────────

/** Extract the "Business Unit: …" value from a notes string. */
function parseBusinessUnit(notes: string): string {
  const m = notes.match(/^Business Unit:\s*(.+)$/m);
  return m?.[1]?.trim() ?? "";
}

/**
 * Classify a location's certification status based on last class date.
 * Certs are valid 2 years; warn at 1.5 years (18 months).
 */
function certStatusFromLastClass(lastClassDate: string | null | undefined): "expired" | "expiring" | null {
  if (!lastClassDate) return null;
  const days = (Date.now() - new Date(lastClassDate).getTime()) / 86_400_000;
  if (days > 730) return "expired";
  if (days > 548) return "expiring";
  return null;
}

/** Return notes stripped of Business Unit and Last Class Held lines (for display in comm notes). */
function importedNotesBody(notes: string): string {
  return notes
    .replace(/^Business Unit:.*$/m, "")
    .replace(/^Last Class Held:.*$/m, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/** Deterministic pastel color class for a given business unit name. */
const BU_PALETTE = [
  "bg-sky-100 text-sky-800",
  "bg-teal-100 text-teal-800",
  "bg-indigo-100 text-indigo-800",
  "bg-violet-100 text-violet-800",
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-800",
  "bg-rose-100 text-rose-800",
  "bg-orange-100 text-orange-800",
  "bg-cyan-100 text-cyan-800",
  "bg-purple-100 text-purple-800",
] as const;

// Manual overrides for business units that need a specific color.
const BU_COLOR_OVERRIDES: Record<string, string> = {
  "FOX Television Stations": "bg-orange-100 text-orange-800",
};

function buColor(name: string): string {
  if (BU_COLOR_OVERRIDES[name]) return BU_COLOR_OVERRIDES[name]!;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return BU_PALETTE[Math.abs(h) % BU_PALETTE.length]!;
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

const CSV_COLUMNS = ["name", "address", "contactName", "contactEmail", "contactPhone", "notes"] as const;
type CsvCol = (typeof CSV_COLUMNS)[number];

const COL_LABELS: Record<CsvCol, string> = {
  name: "Name *",
  address: "Address",
  contactName: "Contact Name",
  contactEmail: "Contact Email",
  contactPhone: "Contact Phone",
  notes: "Notes",
};

type CsvRow = Record<CsvCol, string> & { _valid: boolean; _error?: string };

function downloadTemplate() {
  const header = CSV_COLUMNS.join(",");
  const example = [
    '"Riverside Fire Station 4","123 Main St, Springfield, IL 62701","Jane Smith","jane@riverside.gov","(555) 123-4567","Prefers morning sessions. Loading dock entrance."',
    '"Central Community Center","456 Oak Ave, Springfield, IL 62702","Bob Lee","bob@ccc.org","(555) 987-6543",""',
  ].join("\n");
  const blob = new Blob([header + "\n" + example], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "locations_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// Strip everything except a-z and 0-9 so "FOX Contact", "fox_contact",
// "Fox Contact", "foxcontact" all normalize to "foxcontact".
function nh(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Extract "Last Class Held: YYYY-MM-DD" from a notes string.
function parseLastClassHeld(notes: string): string | null {
  const m = notes.match(/Last Class Held:\s*(\d{4}-\d{2}-\d{2})/i);
  return m ? m[1]! : null;
}

// Columns that get grouped together under a "Notes" heading on import.
// Each entry is [normalizedHeader, displayLabel].
const NOTES_COLS: [string, string][] = [
  ["plustrac",        "PlusTrac"],
  ["othernotes",      "Other Notes"],
  ["othernote",       "Other Notes"],
  ["aednotes",        "AED Notes"],
  ["aednote",         "AED Notes"],
  ["ordered",         "Ordered"],
  ["onlinescheduler", "Online Scheduler"],
  ["lastclassheld",   "Last Class Held"],
  ["lastclassdate",   "Last Class Held"],
  ["lastclass",       "Last Class Held"],
  ["businessunit",    "Business Unit"],
  ["unit",            "Business Unit"],
  ["notes",           ""],
  ["note",            ""],
  ["comments",        ""],
  ["comment",         ""],
];

// Build a CsvRow from an arbitrary key→value object (works for both CSV and XLSX).
function buildRowFromObj(obj: Record<string, unknown>): CsvRow {
  // Normalize all keys once up-front
  const raw: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const norm = nh(k);
    if (norm) raw[norm] = String(v ?? "").trim();
  }

  // ── Name ──
  const name =
    raw["name"] ?? raw["locationname"] ?? raw["location"] ?? "";

  // ── Address: combine street + city + state ──
  const street = raw["address"] ?? raw["streetaddress"] ?? raw["street"] ?? "";
  const city   = raw["city"] ?? "";
  const state  = raw["state"] ?? "";
  const addressParts = [street, city, state].filter(Boolean);
  const address = addressParts.join(", ");

  // ── Contact ──
  const contactName =
    raw["foxcontact"] ??
    raw["contact"] ??
    raw["contactname"] ??
    raw["contactperson"] ??
    raw["poc"] ??
    "";
  const contactEmail =
    raw["contactemail"] ?? raw["email"] ?? raw["emailaddress"] ?? "";
  const contactPhone =
    raw["contactphone"] ?? raw["phone"] ?? raw["phonenumber"] ?? raw["tel"] ?? "";

  // ── Notes: merge all note-ish columns ──
  const noteParts: string[] = [];
  const usedKeys = new Set<string>();
  for (const [key, label] of NOTES_COLS) {
    if (usedKeys.has(key)) continue;
    const val = raw[key];
    if (val) {
      noteParts.push(label ? `${label}: ${val}` : val);
      usedKeys.add(key);
    }
  }
  const notes = noteParts.join("\n");

  return {
    name: name.trim(),
    address: address.trim(),
    contactName: contactName.trim(),
    contactEmail: contactEmail.trim(),
    contactPhone: contactPhone.trim(),
    notes: notes.trim(),
    _valid: name.trim().length > 0,
    _error: name.trim().length === 0 ? "Name is required" : undefined,
  };
}

// Shared CSV line parser (handles quoted fields and escaped quotes).
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(cur.trim()); cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const rawHeaders = parseCsvLine(lines[0]!);
  return lines.slice(1)
    .map((line) => {
      const vals = parseCsvLine(line);
      const obj: Record<string, unknown> = {};
      rawHeaders.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
      return buildRowFromObj(obj);
    })
    .filter((r) => CSV_COLUMNS.some((c) => r[c] !== ""));
}

function parseXlsxBuffer(buffer: ArrayBuffer): CsvRow[] {
  const workbook = xlsxRead(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  // Read as a 2-D array so we can skip any title rows that appear before
  // the real header row (e.g. "CPR Training 2026" title rows).
  const raw = xlsxUtils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  // Find the first row that contains a cell normalising to "name" — that
  // is the true header row.
  const headerIdx = raw.findIndex((row) =>
    (row as unknown[]).some((cell) => nh(String(cell)) === "name"),
  );
  if (headerIdx === -1) return [];

  const headers = raw[headerIdx] as string[];

  return (raw.slice(headerIdx + 1) as string[][])
    .map((vals) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
      return buildRowFromObj(obj);
    })
    .filter((r) => CSV_COLUMNS.some((c) => r[c] !== ""));
}

// ─── CSV Import dialog ─────────────────────────────────────────────────────────

function CsvImportDialog({ onImported }: { onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ ok: number; fail: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const validRows = rows.filter((r) => r._valid);
  const invalidRows = rows.filter((r) => !r._valid);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isXlsx = /\.(xlsx|xls|xlsm|xlsb)$/i.test(file.name);
    const reader = new FileReader();
    if (isXlsx) {
      reader.onload = (ev) => {
        const buffer = ev.target?.result as ArrayBuffer;
        const parsed = parseXlsxBuffer(buffer);
        setRows(parsed);
        setResults(null);
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const parsed = parseCsv(text);
        setRows(parsed);
        setResults(null);
      };
      reader.readAsText(file);
    }
    // reset so same file can be re-selected
    e.target.value = "";
  }

  async function handleImport() {
    setImporting(true);
    let ok = 0;
    let fail = 0;
    for (const row of validRows) {
      try {
        const res = await fetch("/api/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: row.name,
            address: row.address || undefined,
            contactName: row.contactName || undefined,
            contactEmail: row.contactEmail || undefined,
            contactPhone: row.contactPhone || undefined,
            notes: row.notes || undefined,
          }),
        });
        if (res.ok) {
          ok++;
          // If the row has a Last Class Held date, create a historical class record
          const lastHeld = parseLastClassHeld(row.notes ?? "");
          if (lastHeld) {
            await fetch("/api/classes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: row.name,
                location: row.name,
                date: lastHeld,
                startTime: "09:00",
                capacity: 20,
                status: "completed",
                certificationType: "cpr_aed_first_aid",
              }),
            });
          }
        } else {
          fail++;
        }
      } catch {
        fail++;
      }
    }
    setImporting(false);
    setResults({ ok, fail });
    qc.invalidateQueries({ queryKey: getListLocationsQueryKey() });
    qc.invalidateQueries({ queryKey: getListClassesQueryKey() });
    if (ok > 0) onImported();
  }

  function handleClose(v: boolean) {
    if (!v) {
      setRows([]);
      setResults(null);
    }
    setOpen(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-import-csv">
          <Upload className="h-4 w-4 mr-1.5" /> Import file
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import locations from CSV or Excel
          </DialogTitle>
        </DialogHeader>

        {/* ── Template download ── */}
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
          <Download className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-medium">Expected columns</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              <code className="font-mono">name</code> (required),{" "}
              <code className="font-mono">address</code>,{" "}
              <code className="font-mono">contactName</code>,{" "}
              <code className="font-mono">contactEmail</code>,{" "}
              <code className="font-mono">contactPhone</code>,{" "}
              <code className="font-mono">notes</code>
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 h-7 text-xs"
            onClick={downloadTemplate}
            data-testid="button-download-template"
          >
            <Download className="h-3 w-3 mr-1" /> Download template
          </Button>
        </div>

        {/* ── File picker ── */}
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileRef.current?.click()}
          data-testid="csv-drop-zone"
        >
          <Upload className="h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-medium">Click to choose a file</p>
          <p className="text-xs text-muted-foreground">
            CSV <span className="mx-1 text-muted-foreground/50">·</span> Excel (.xlsx, .xls)
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,.xlsx,.xls,.xlsm,.xlsb,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={handleFile}
            data-testid="input-csv-file"
          />
        </div>

        {/* ── Preview table ── */}
        {rows.length > 0 && !results && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{rows.length} row{rows.length !== 1 ? "s" : ""} parsed</span>
              {validRows.length > 0 && (
                <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px]">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {validRows.length} valid
                </Badge>
              )}
              {invalidRows.length > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  <XCircle className="h-3 w-3 mr-1" />
                  {invalidRows.length} invalid
                </Badge>
              )}
            </div>
            <ScrollArea className="h-56 rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-6 text-center">✓</TableHead>
                    {CSV_COLUMNS.map((c) => (
                      <TableHead key={c} className="text-xs whitespace-nowrap">
                        {COL_LABELS[c]}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow
                      key={i}
                      className={cn(!row._valid && "bg-destructive/5")}
                      data-testid={`csv-preview-row-${i}`}
                    >
                      <TableCell className="text-center">
                        {row._valid ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 inline" />
                        ) : (
                          <span title={row._error}><XCircle className="h-3.5 w-3.5 text-destructive inline" /></span>
                        )}
                      </TableCell>
                      {CSV_COLUMNS.map((c) => (
                        <TableCell
                          key={c}
                          className={cn(
                            "text-xs max-w-[140px] truncate",
                            c === "name" && !row._valid && "text-destructive font-medium",
                          )}
                          title={row[c]}
                        >
                          {row[c] || <span className="text-muted-foreground italic">—</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            {invalidRows.length > 0 && (
              <p className="text-xs text-muted-foreground">
                <XCircle className="h-3 w-3 inline text-destructive mr-1" />
                Invalid rows (missing name) will be skipped.
              </p>
            )}
          </div>
        )}

        {/* ── Results ── */}
        {results && (
          <div className="flex items-center gap-4 rounded-lg border border-border px-4 py-3 text-sm">
            {results.ok > 0 && (
              <span className="flex items-center gap-1.5 text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                {results.ok} location{results.ok !== 1 ? "s" : ""} imported
              </span>
            )}
            {results.fail > 0 && (
              <span className="flex items-center gap-1.5 text-destructive">
                <XCircle className="h-4 w-4" />
                {results.fail} failed
              </span>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {results ? "Close" : "Cancel"}
          </Button>
          {!results && (
            <Button
              disabled={validRows.length === 0 || importing}
              onClick={handleImport}
              data-testid="button-confirm-import"
            >
              {importing
                ? `Importing… (${validRows.length})`
                : `Import ${validRows.length} location${validRows.length !== 1 ? "s" : ""}`}
            </Button>
          )}
          {results && (
            <Button
              variant="outline"
              onClick={() => {
                setRows([]);
                setResults(null);
              }}
            >
              Import another file
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add / Edit dialog ────────────────────────────────────────────────────────

type LocationForm = {
  name: string;
  address: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
};

const EMPTY_FORM: LocationForm = {
  name: "",
  address: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  notes: "",
};

function LocationFormDialog({
  initial,
  trigger,
  onSave,
  isPending,
}: {
  initial?: LocationForm;
  trigger: React.ReactNode;
  onSave: (form: LocationForm) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LocationForm>(initial ?? EMPTY_FORM);

  function handleOpen(v: boolean) {
    if (v) setForm(initial ?? EMPTY_FORM);
    setOpen(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit location" : "Add location"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label>Location name *</Label>
            <Input
              placeholder="e.g. Riverside Fire Station 4"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="input-location-name"
            />
          </div>
          <div>
            <Label>Address</Label>
            <Input
              placeholder="123 Main St, City, State 12345"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Contact name</Label>
              <Input
                placeholder="Jane Smith"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
            </div>
            <div>
              <Label>Contact phone</Label>
              <Input
                placeholder="(555) 000-0000"
                value={form.contactPhone}
                onChange={(e) =>
                  setForm({ ...form, contactPhone: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <Label>Contact email</Label>
            <Input
              type="email"
              placeholder="contact@example.com"
              value={form.contactEmail}
              onChange={(e) =>
                setForm({ ...form, contactEmail: e.target.value })
              }
            />
          </div>
          <div>
            <Label>General notes</Label>
            <Textarea
              rows={3}
              placeholder="Parking info, building access, scheduling preferences…"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!form.name.trim() || isPending}
            onClick={() => {
              onSave(form);
              setOpen(false);
            }}
            data-testid="button-save-location"
          >
            {initial ? "Save changes" : "Add location"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add note inline ──────────────────────────────────────────────────────────

// ─── Schedule class for a location ────────────────────────────────────────────

const CERT_OPTIONS: { value: string; label: string }[] = [
  { value: "cpr_aed_first_aid",               label: "CPR + AED + First Aid" },
  { value: "stop_the_bleed",                  label: "Stop the Bleed" },
  { value: "cpr_aed_first_aid_stop_the_bleed", label: "CPR + AED + First Aid + Stop the Bleed" },
];

type ClassForm = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  certificationType: string;
  capacity: string;
};

function ScheduleClassDialog({
  locationName,
  onCreated,
  trigger,
}: {
  locationName: string;
  onCreated: () => void;
  trigger?: React.ReactNode;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ClassForm>({
    title: locationName,
    date: "",
    startTime: "09:00",
    endTime: "",
    certificationType: "cpr_aed_first_aid",
    capacity: "20",
  });

  function handleOpen(v: boolean) {
    if (v) setForm({ title: locationName, date: "", startTime: "09:00", endTime: "", certificationType: "cpr_aed_first_aid", capacity: "20" });
    setOpen(v);
  }

  const create = useCreateClass({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListClassesQueryKey() });
        qc.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        setOpen(false);
        onCreated();
        toast({ title: "Class scheduled" });
      },
      onError: () => toast({ title: "Failed to schedule class", variant: "destructive" }),
    },
  });

  const valid = form.title.trim() && form.date && form.startTime && Number(form.capacity) >= 1;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
            <CalendarPlus className="h-3 w-3 mr-1" /> Add class
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a class</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label>Class title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. KCPQ Seattle CPR Training" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label>Capacity *</Label>
              <Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start time *</Label>
              <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div>
              <Label>End time</Label>
              <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Certification type *</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.certificationType}
              onChange={(e) => setForm({ ...form, certificationType: e.target.value })}
            >
              {CERT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={!valid || create.isPending}
            onClick={() =>
              create.mutate({
                data: {
                  title: form.title.trim(),
                  date: form.date,
                  startTime: form.startTime,
                  endTime: form.endTime || undefined,
                  location: locationName,
                  certificationType: form.certificationType as ClassSession["certificationType"],
                  capacity: Number(form.capacity),
                },
              })
            }
          >
            {create.isPending ? "Adding…" : "Add class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

type EditClassForm = ClassForm & { status: string };

function EditClassDialog({
  cls,
  locationName,
}: {
  cls: ClassSession;
  locationName: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EditClassForm>({
    title: cls.title,
    date: cls.date,
    startTime: cls.startTime,
    endTime: cls.endTime ?? "",
    certificationType: cls.certificationType,
    capacity: String(cls.capacity),
    status: cls.status,
  });

  function handleOpen(v: boolean) {
    if (v) {
      setForm({
        title: cls.title,
        date: cls.date,
        startTime: cls.startTime,
        endTime: cls.endTime ?? "",
        certificationType: cls.certificationType,
        capacity: String(cls.capacity),
        status: cls.status,
      });
    }
    setOpen(v);
  }

  const update = useUpdateClass({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListClassesQueryKey() });
        qc.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        setOpen(false);
        toast({ title: "Class updated" });
      },
      onError: () => toast({ title: "Failed to update class", variant: "destructive" }),
    },
  });

  const valid = form.title.trim() && form.date && form.startTime && Number(form.capacity) >= 1;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-5 w-5 opacity-0 group-hover/classrow:opacity-100 transition-opacity"
          title="Edit class"
        >
          <Pencil className="h-2.5 w-2.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit class</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label>Class title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={locationName}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Capacity *</Label>
              <Input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start time *</Label>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </div>
            <div>
              <Label>End time</Label>
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Certification type</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.certificationType}
              onChange={(e) => setForm({ ...form, certificationType: e.target.value })}
            >
              {CERT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Status</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={!valid || update.isPending}
            onClick={() =>
              update.mutate({
                classId: cls.id,
                data: {
                  title: form.title.trim(),
                  date: form.date,
                  startTime: form.startTime,
                  endTime: form.endTime || undefined,
                  certificationType: form.certificationType as ClassSession["certificationType"],
                  capacity: Number(form.capacity),
                  status: form.status as ClassSession["status"],
                },
              })
            }
          >
            {update.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LocationClasses({ locationName }: { locationName: string }) {
  const { data: classes = [] } = useListClasses({ location: locationName });
  const sorted = [...classes].sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No classes scheduled yet at this location.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {sorted.map((cls) => (
        <div
          key={cls.id}
          className="group/classrow flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <CalendarPlus className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="font-medium">{formatDate(cls.date)}</span>
              <span className="text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" /> {cls.startTime}
              </span>
            </div>
            {cls.title !== locationName && (
              <p className="text-muted-foreground mt-0.5 pl-4 truncate">{cls.title}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <Badge variant="outline" className="text-[10px] px-1">
              {CERT_LABELS[cls.certificationType] ?? cls.certificationType}
            </Badge>
            <span className="text-muted-foreground flex items-center gap-0.5">
              <Users className="h-2.5 w-2.5" /> {cls.enrolledCount}/{cls.capacity}
            </span>
            <Badge
              variant={cls.status === "scheduled" ? "default" : "outline"}
              className="text-[10px] px-1 capitalize"
            >
              {cls.status}
            </Badge>
            <EditClassDialog cls={cls} locationName={locationName} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Add note inline ──────────────────────────────────────────────────────────

function AddNoteForm({
  locationId,
  onDone,
}: {
  locationId: number;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const create = useCreateLocationNote({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        setBody("");
        onDone();
        toast({ title: "Note added" });
      },
      onError: () => toast({ title: "Failed to add note", variant: "destructive" }),
    },
  });

  return (
    <div className="flex gap-2 mt-2">
      <Textarea
        rows={2}
        placeholder="Scheduling conversation, follow-up details…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="flex-1 text-sm"
      />
      <Button
        size="sm"
        className="self-end"
        disabled={!body.trim() || create.isPending}
        onClick={() =>
          create.mutate({ locationId, data: { body } })
        }
      >
        <Send className="h-3.5 w-3.5 mr-1" />
        Add
      </Button>
    </div>
  );
}

// ─── Location card ────────────────────────────────────────────────────────────

function LocationCard({ loc }: { loc: LocationDetail }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  const update = useUpdateLocation({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        toast({ title: "Location updated" });
      },
      onError: () =>
        toast({ title: "Failed to update", variant: "destructive" }),
    },
  });

  const del = useDeleteLocation({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        toast({ title: "Location deleted" });
      },
      onError: () =>
        toast({ title: "Failed to delete", variant: "destructive" }),
    },
  });

  const delNote = useDeleteLocationNote({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        toast({ title: "Note deleted" });
      },
      onError: () =>
        toast({ title: "Failed to delete note", variant: "destructive" }),
    },
  });

  const [editingDate, setEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState("");

  const updateClass = useUpdateClass({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        qc.invalidateQueries({ queryKey: getListClassesQueryKey() });
        setEditingDate(false);
        toast({ title: "Class date updated" });
      },
      onError: () => toast({ title: "Failed to update date", variant: "destructive" }),
    },
  });

  const expiringCount = loc.expiringCertificates?.length ?? 0;
  const businessUnit = parseBusinessUnit(loc.notes ?? "");
  const classCertStatus = certStatusFromLastClass(loc.lastClassDate);

  return (
    <Card
      className={cn(
        "overflow-hidden transition-shadow",
        classCertStatus === "expired"
          ? "ring-2 ring-red-500 shadow-red-100 shadow-md"
          : classCertStatus === "expiring"
          ? "ring-2 ring-amber-400 shadow-amber-100 shadow-md"
          : expiringCount > 0
          ? "ring-2 ring-amber-400 shadow-amber-100 shadow-md"
          : "",
      )}
      data-testid={`location-card-${loc.id}`}
    >
      {businessUnit && (
        <div
          className={cn(
            "px-4 py-1.5 text-[11px] font-semibold tracking-wide flex items-center gap-1.5 border-b border-black/5",
            buColor(businessUnit),
          )}
        >
          <Building2 className="h-3 w-3 shrink-0" />
          {businessUnit}
        </div>
      )}
      <CardContent className="pt-5 pb-4">
        {/* ── Header row ── */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base leading-tight">
                {loc.name}
              </h3>
              {expiringCount > 0 && (
                <Badge
                  variant="destructive"
                  className="text-[10px] px-1.5 py-0"
                >
                  <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                  {expiringCount} cert{expiringCount !== 1 ? "s" : ""} expiring
                </Badge>
              )}
            </div>
            {loc.address && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span>{loc.address}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <LocationFormDialog
              initial={{
                name: loc.name,
                address: loc.address ?? "",
                contactName: loc.contactName ?? "",
                contactEmail: loc.contactEmail ?? "",
                contactPhone: loc.contactPhone ?? "",
                notes: loc.notes ?? "",
              }}
              trigger={
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  data-testid={`button-edit-location-${loc.id}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              }
              onSave={(form) =>
                update.mutate({
                  locationId: loc.id,
                  data: {
                    name: form.name || undefined,
                    address: form.address || undefined,
                    contactName: form.contactName || undefined,
                    contactEmail: form.contactEmail || undefined,
                    contactPhone: form.contactPhone || undefined,
                    notes: form.notes || undefined,
                  },
                })
              }
              isPending={update.isPending}
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  data-testid={`button-delete-location-${loc.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete location?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete <strong>{loc.name}</strong> and
                    all its communication notes. Classes linked by name are not
                    affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => del.mutate({ locationId: loc.id })}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* ── Contact row ── */}
        {(loc.contactName || loc.contactEmail || loc.contactPhone) && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {loc.contactName && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {loc.contactName}
              </span>
            )}
            {loc.contactEmail && (
              <a
                href={`mailto:${loc.contactEmail}`}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Mail className="h-3 w-3" />
                {loc.contactEmail}
              </a>
            )}
            {loc.contactPhone && (
              <a
                href={`tel:${loc.contactPhone}`}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Phone className="h-3 w-3" />
                {loc.contactPhone}
              </a>
            )}
          </div>
        )}

        {/* ── Quick stats row ── */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className={cn(
              "h-3.5 w-3.5",
              classCertStatus === "expired" && "text-red-500",
              classCertStatus === "expiring" && "text-amber-500",
            )} />
            {loc.lastClassDate ? (
              <span className="flex items-center gap-1 flex-wrap">
                Last class:{" "}
                {editingDate ? (
                  <span className="flex items-center gap-1">
                    <Input
                      type="date"
                      className="h-6 text-xs px-1 py-0 w-36"
                      value={dateValue}
                      onChange={(e) => setDateValue(e.target.value)}
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 text-green-600 hover:text-green-700"
                      disabled={!dateValue || updateClass.isPending || !loc.lastClassId}
                      onClick={() => {
                        if (!loc.lastClassId || !dateValue) return;
                        updateClass.mutate({ classId: loc.lastClassId, data: { date: dateValue } });
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditingDate(false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 group/date">
                    <span className={cn(
                      "font-medium",
                      classCertStatus === "expired" ? "text-red-600" : classCertStatus === "expiring" ? "text-amber-600" : "text-foreground",
                    )}>
                      {formatDate(loc.lastClassDate)}
                    </span>
                    {classCertStatus === "expired" && (
                      <span className="text-red-500 font-medium">— certs expired</span>
                    )}
                    {classCertStatus === "expiring" && (
                      <span className="text-amber-500 font-medium">— certs expiring</span>
                    )}
                    {loc.lastClassTitle && !classCertStatus && (
                      <span className="text-muted-foreground">— {loc.lastClassTitle}</span>
                    )}
                    <button
                      className="opacity-0 group-hover/date:opacity-100 transition-opacity ml-0.5"
                      title="Edit date"
                      onClick={() => {
                        setDateValue(loc.lastClassDate ?? "");
                        setEditingDate(true);
                      }}
                    >
                      <Pencil className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </span>
                )}
              </span>
            ) : (
              <ScheduleClassDialog
                locationName={loc.name}
                onCreated={() => {}}
                trigger={
                  <button className="italic hover:not-italic hover:underline underline-offset-2 cursor-pointer">
                    No classes yet — add one
                  </button>
                }
              />
            )}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>
              {loc.notes_log?.length ?? 0} comm note
              {(loc.notes_log?.length ?? 0) !== 1 ? "s" : ""}
            </span>
          </div>
        </div>


        {/* ── Expand / collapse toggle ── */}
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 h-7 px-2 text-xs text-muted-foreground w-full justify-center"
          onClick={() => setExpanded((v) => !v)}
          data-testid={`button-expand-location-${loc.id}`}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5 mr-1" /> Hide details
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5 mr-1" /> Show details
            </>
          )}
        </Button>

        {/* ── Expanded section ── */}
        {expanded && (
          <div className="mt-2 space-y-4 border-t border-border pt-4">

            {/* Classes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Classes
                </h4>
                <ScheduleClassDialog locationName={loc.name} onCreated={() => {}} />
              </div>
              <LocationClasses locationName={loc.name} />
            </div>

            {/* Expiring certificates */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Certificates expiring within 6 months
              </h4>
              {expiringCount === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No certificates expiring soon at this location.
                </p>
              ) : (
                <div className="space-y-1">
                  {loc.expiringCertificates.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0"
                    >
                      <span className="font-medium">{c.studentName ?? "—"}</span>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] px-1">
                          {CERT_LABELS[c.certificationType] ?? c.certificationType}
                        </Badge>
                        <span>expires {formatDate(c.expiryDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Communication notes log */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Scheduling / communication notes
                </h4>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs"
                  onClick={() => setAddingNote((v) => !v)}
                  data-testid={`button-add-note-${loc.id}`}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add note
                </Button>
              </div>

              {addingNote && (
                <AddNoteForm
                  locationId={loc.id}
                  onDone={() => setAddingNote(false)}
                />
              )}

              {/* Imported notes from location record (PlusTrac, Online Scheduler, etc.) */}
              {importedNotesBody(loc.notes ?? "") && (
                <p className="text-xs text-foreground/70 bg-muted/50 rounded-lg px-3 py-2 italic whitespace-pre-wrap mt-2">
                  {importedNotesBody(loc.notes ?? "")}
                </p>
              )}

              {(loc.notes_log?.length ?? 0) === 0 && !addingNote && !importedNotesBody(loc.notes ?? "") ? (
                <p className="text-xs text-muted-foreground italic">
                  No communication notes yet.
                </p>
              ) : (
                <div className="space-y-2 mt-2">
                  {loc.notes_log?.map((note) => (
                    <div
                      key={note.id}
                      className={cn(
                        "group relative rounded-lg bg-muted/50 px-3 py-2 text-xs",
                      )}
                      data-testid={`note-${note.id}`}
                    >
                      <p className="whitespace-pre-wrap text-foreground/80 pr-6">
                        {note.body}
                      </p>
                      <p className="text-muted-foreground mt-1">
                        {new Date(note.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-1.5 right-1.5 h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          delNote.mutate({
                            locationId: loc.id,
                            noteId: note.id,
                          })
                        }
                        data-testid={`button-delete-note-${note.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Locations() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [buFilter, setBuFilter] = useState("");
  const [certFilter, setCertFilter] = useState<"" | "expiring" | "expired">("");
  const { data: locations = [], isLoading } = useListLocations();

  const create = useCreateLocation({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        toast({ title: "Location added" });
      },
      onError: () =>
        toast({ title: "Failed to add location", variant: "destructive" }),
    },
  });

  // Collect all unique business units sorted alphabetically
  const allBUs = useMemo(() => {
    const set = new Set<string>();
    locations.forEach((loc) => {
      const bu = parseBusinessUnit(loc.notes ?? "");
      if (bu) set.add(bu);
    });
    return [...set].sort();
  }, [locations]);

  const q = query.trim().toLowerCase();
  const filtered = locations.filter((loc) => {
    if (buFilter && parseBusinessUnit(loc.notes ?? "") !== buFilter) return false;
    if (certFilter) {
      const status = certStatusFromLastClass(loc.lastClassDate);
      if (certFilter === "expired" && status !== "expired") return false;
      if (certFilter === "expiring" && status !== "expiring") return false;
    }
    if (!q) return true;
    return (
      loc.name.toLowerCase().includes(q) ||
      (loc.address ?? "").toLowerCase().includes(q) ||
      (loc.contactName ?? "").toLowerCase().includes(q) ||
      (loc.contactEmail ?? "").toLowerCase().includes(q)
    );
  });

  const expiringTotal = locations.reduce(
    (sum, l) => sum + (l.expiringCertificates?.length ?? 0),
    0,
  );
  const certExpiredCount = locations.filter(
    (l) => certStatusFromLastClass(l.lastClassDate) === "expired",
  ).length;
  const certExpiringCount = locations.filter(
    (l) => certStatusFromLastClass(l.lastClassDate) === "expiring",
  ).length;

  return (
    <>
      <PageHeader
        title="Locations"
        subtitle="Training venues, contacts, and scheduling history."
        action={
          <div className="flex items-center gap-2">
            <CsvImportDialog onImported={() => qc.invalidateQueries({ queryKey: getListLocationsQueryKey() })} />
            <LocationFormDialog
              trigger={
                <Button data-testid="button-add-location">
                  <Plus className="h-4 w-4 mr-1.5" /> Add location
                </Button>
              }
              onSave={(form) =>
                create.mutate({
                  data: {
                    name: form.name,
                    address: form.address || undefined,
                    contactName: form.contactName || undefined,
                    contactEmail: form.contactEmail || undefined,
                    contactPhone: form.contactPhone || undefined,
                    notes: form.notes || undefined,
                  },
                })
              }
              isPending={create.isPending}
            />
          </div>
        }
      />

      {/* ── Summary badges ── */}
      {locations.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline">
            {locations.length} location{locations.length !== 1 ? "s" : ""}
          </Badge>
          {certExpiredCount > 0 && (
            <Badge
              variant="destructive"
              className="text-[10px] cursor-pointer"
              onClick={() => setCertFilter(certFilter === "expired" ? "" : "expired")}
            >
              <AlertTriangle className="h-2.5 w-2.5 mr-1" />
              {certExpiredCount} location{certExpiredCount !== 1 ? "s" : ""} — certs expired
            </Badge>
          )}
          {certExpiringCount > 0 && (
            <Badge
              className="text-[10px] cursor-pointer bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => setCertFilter(certFilter === "expiring" ? "" : "expiring")}
            >
              <AlertTriangle className="h-2.5 w-2.5 mr-1" />
              {certExpiringCount} location{certExpiringCount !== 1 ? "s" : ""} — certs expiring soon
            </Badge>
          )}
          {expiringTotal > 0 && (
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
              <AlertTriangle className="h-2.5 w-2.5 mr-1" />
              {expiringTotal} individual cert{expiringTotal !== 1 ? "s" : ""} expiring &lt; 6 mo
            </Badge>
          )}
        </div>
      )}

      {/* ── Search + Business Unit filter ── */}
      {locations.length > 0 && (
        <div className="mb-5 space-y-3">
          <div className="relative max-w-sm">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Filter by name, address, or contact…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="input-locations-filter"
            />
          </div>

          {/* Cert status filter */}
          {(certExpiredCount > 0 || certExpiringCount > 0) && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Cert status:
              </span>
              <button
                onClick={() => setCertFilter("")}
                className={cn(
                  "rounded-full px-3 py-0.5 text-xs font-medium transition-colors border",
                  certFilter === ""
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground",
                )}
              >
                All
              </button>
              {certExpiringCount > 0 && (
                <button
                  onClick={() => setCertFilter(certFilter === "expiring" ? "" : "expiring")}
                  className={cn(
                    "rounded-full px-3 py-0.5 text-xs font-medium transition-colors border",
                    certFilter === "expiring"
                      ? "bg-amber-500 text-white border-transparent"
                      : "bg-transparent text-muted-foreground border-border hover:border-amber-400 hover:text-amber-700",
                  )}
                >
                  Expiring soon ({certExpiringCount})
                </button>
              )}
              {certExpiredCount > 0 && (
                <button
                  onClick={() => setCertFilter(certFilter === "expired" ? "" : "expired")}
                  className={cn(
                    "rounded-full px-3 py-0.5 text-xs font-medium transition-colors border",
                    certFilter === "expired"
                      ? "bg-red-500 text-white border-transparent"
                      : "bg-transparent text-muted-foreground border-border hover:border-red-400 hover:text-red-700",
                  )}
                >
                  Expired ({certExpiredCount})
                </button>
              )}
            </div>
          )}

          {allBUs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
                <Building2 className="h-3.5 w-3.5" /> Business unit:
              </span>
              <button
                onClick={() => setBuFilter("")}
                className={cn(
                  "rounded-full px-3 py-0.5 text-xs font-medium transition-colors border",
                  buFilter === ""
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground",
                )}
              >
                All
              </button>
              {allBUs.map((bu) => (
                <button
                  key={bu}
                  onClick={() => setBuFilter(buFilter === bu ? "" : bu)}
                  className={cn(
                    "rounded-full px-3 py-0.5 text-xs font-medium transition-colors border",
                    buFilter === bu
                      ? cn(buColor(bu), "border-transparent")
                      : "bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground",
                  )}
                >
                  {bu}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-5 h-32" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center text-sm text-muted-foreground">
            {locations.length === 0
              ? "No locations yet. Add your first training venue above."
              : "No locations match the current filter."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((loc) => (
            <LocationCard key={loc.id} loc={loc} />
          ))}
        </div>
      )}
    </>
  );
}
