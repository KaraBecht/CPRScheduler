import { useState } from "react";
import { read as xlsxRead, utils as xlsxUtils } from "xlsx";
import {
  useListLocations,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
  useCreateLocationNote,
  useDeleteLocationNote,
  getListLocationsQueryKey,
  type LocationDetail,
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
  const data = xlsxUtils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  return data
    .map(buildRowFromObj)
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
        if (res.ok) ok++;
        else fail++;
      } catch {
        fail++;
      }
    }
    setImporting(false);
    setResults({ ok, fail });
    qc.invalidateQueries({ queryKey: getListLocationsQueryKey() });
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

  const expiringCount = loc.expiringCertificates?.length ?? 0;

  return (
    <Card
      className="overflow-hidden"
      data-testid={`location-card-${loc.id}`}
    >
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
            <CalendarDays className="h-3.5 w-3.5" />
            {loc.lastClassDate ? (
              <span>
                Last class:{" "}
                <span className="font-medium text-foreground">
                  {formatDate(loc.lastClassDate)}
                </span>
                {loc.lastClassTitle && (
                  <span className="ml-1 text-muted-foreground">
                    — {loc.lastClassTitle}
                  </span>
                )}
              </span>
            ) : (
              <span className="italic">No classes yet</span>
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

        {/* ── General notes (always visible if present) ── */}
        {loc.notes && (
          <p className="mt-3 text-xs text-foreground/70 bg-muted/50 rounded-lg px-3 py-2 italic">
            {loc.notes}
          </p>
        )}

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

            {/* Expiring certificates */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Certificates expiring within 90 days
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

              {(loc.notes_log?.length ?? 0) === 0 && !addingNote ? (
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

  const q = query.trim().toLowerCase();
  const filtered = locations.filter((loc) => {
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
          {expiringTotal > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              <AlertTriangle className="h-2.5 w-2.5 mr-1" />
              {expiringTotal} cert{expiringTotal !== 1 ? "s" : ""} expiring &lt;
              90 days
            </Badge>
          )}
        </div>
      )}

      {/* ── Search ── */}
      {locations.length > 0 && (
        <div className="relative max-w-sm mb-5">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Filter by name, address, or contact…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="input-locations-filter"
          />
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
