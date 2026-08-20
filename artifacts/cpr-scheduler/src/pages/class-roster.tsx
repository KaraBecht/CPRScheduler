import { useRoute, Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import {
  useGetClass,
  useGetClassRoster,
  useSaveClassRoster,
  getGetClassRosterQueryKey,
  getListRosterAttendeesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Upload,
  CheckSquare,
  Download,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import * as XLSX from "xlsx";

type RosterResult = "pass" | "fail" | null;
type Entry = {
  position: number;
  name: string;
  email: string;
  phone: string;
  result: RosterResult;
  cardSent: boolean;
};

// ─── Spreadsheet / CSV parser ─────────────────────────────────────────────────

const NAME_HINTS = ["name", "first", "last", "student", "attendee"];
const EMAIL_HINTS = ["email"];

/**
 * Scan the first few rows to find the real header row.
 * Handles files where row 0 is a title/label (e.g. "CPR,,,,") and
 * the actual column headers live in row 1 or 2.
 */
function detectHeaderRow(rawRows: string[][]): number {
  for (let i = 0; i < Math.min(rawRows.length, 6); i++) {
    const row = rawRows[i]!.map((c) => String(c).toLowerCase().trim());
    const hasNameHint = row.some((c) => NAME_HINTS.some((h) => c.includes(h)));
    const hasEmailHint = row.some((c) => EMAIL_HINTS.some((h) => c.includes(h)));
    if (hasNameHint || hasEmailHint) return i;
  }
  return 0; // fallback: treat row 0 as headers
}

function parseRosterJson(text: string): { name: string; email: string; phone: string; result?: string | null; cardSent?: boolean }[] {
  const data = JSON.parse(text) as Record<string, unknown>;
  if (data["version"] !== "roster-v1") {
    throw new Error("Unrecognized JSON format. Please use the offline roster form to create this file.");
  }
  const raw = data["entries"];
  if (!Array.isArray(raw)) throw new Error("No entries found in file.");
  return (raw as Record<string, unknown>[])
    .filter((e) => typeof e["name"] === "string" && (e["name"] as string).trim())
    .map((e) => ({
      name: (e["name"] as string).trim(),
      email: typeof e["email"] === "string" ? e["email"].trim() : "",
      phone: typeof e["phone"] === "string" ? e["phone"].trim() : "",
      result: typeof e["result"] === "string" ? e["result"] : null,
      cardSent: Boolean(e["cardSent"]),
    }));
}

async function parseSpreadsheet(
  file: File,
): Promise<{ name: string; email: string; phone: string }[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const wsName = wb.SheetNames[0];
  if (!wsName) throw new Error("Workbook has no sheets");
  const ws = wb.Sheets[wsName]!;

  // Get every row as a plain string array first so we can detect the header row
  const rawRows = XLSX.utils.sheet_to_json<string[]>(ws, {
    header: 1,
    defval: "",
    raw: false,
  });

  const headerIdx = detectHeaderRow(rawRows);
  const headers = (rawRows[headerIdx] ?? []).map((c) => String(c).trim());
  const dataRows = rawRows.slice(headerIdx + 1);

  /**
   * Return the first non-empty cell value whose header contains any of the
   * provided keywords (case-insensitive substring match).
   */
  const get = (row: string[], ...keywords: string[]): string => {
    for (let ci = 0; ci < headers.length; ci++) {
      const h = (headers[ci] ?? "").toLowerCase();
      if (keywords.some((kw) => h.includes(kw))) {
        return String(row[ci] ?? "").trim();
      }
    }
    return "";
  };

  return dataRows
    .map((row) => {
      // 1. Look for a combined "Full Name", "Name", "Student Name" column
      let name = "";
      for (let ci = 0; ci < headers.length; ci++) {
        const h = (headers[ci] ?? "").toLowerCase().trim();
        if (
          h === "name" ||
          h === "full name" ||
          h === "fullname" ||
          h === "student name" ||
          h === "attendee name"
        ) {
          name = String(row[ci] ?? "").trim();
          if (name) break;
        }
      }

      // 2. Fall back to First Name + Last Name columns
      if (!name) {
        const first = get(row, "first name", "firstname", "first");
        const last = get(row, "last name", "lastname", "surname", "last");
        name = `${first} ${last}`.trim();
      }

      const email = get(row, "email");
      const phone = get(row, "phone", "mobile", "cell", "telephone");

      return { name, email, phone };
    })
    .filter((r) => r.name.length > 0);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClassRoster() {
  const [, params] = useRoute("/classes/:id/roster");
  const classId = parseInt(params?.id ?? "0", 10);
  const qc = useQueryClient();
  const { role } = useAuth();
  const canEdit = role === "administrator" || role === "instructor";

  const { data: cls } = useGetClass(classId);
  const { data: roster, isLoading } = useGetClassRoster(classId);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [dirtyPositions, setDirtyPositions] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      qc.invalidateQueries({ queryKey: getGetClassRosterQueryKey(classId) });
    }, 5000);
    return () => clearInterval(id);
  }, [classId]);

  useEffect(() => {
    if (!roster) return;
    const incoming = roster.entries.map((e) => ({
      position: e.position,
      name: e.name,
      email: e.email,
      phone: e.phone,
      result: (e.result ?? null) as RosterResult,
      cardSent: e.cardSent,
    }));
    setEntries((prev) => {
      if (prev.length === 0) return incoming;
      return incoming.map((serverRow) => {
        if (dirtyPositions.has(serverRow.position)) {
          return prev.find((r) => r.position === serverRow.position) ?? serverRow;
        }
        return serverRow;
      });
    });
  }, [roster]);

  const save = useSaveClassRoster({
    mutation: {
      onSuccess: () => {
        toast({ title: "Roster saved" });
        setDirtyPositions(new Set());
        qc.invalidateQueries({ queryKey: getGetClassRosterQueryKey(classId) });
        qc.invalidateQueries({ queryKey: getListRosterAttendeesQueryKey() });
      },
      onError: () =>
        toast({ title: "Failed to save roster", variant: "destructive" }),
    },
  });

  const update = (i: number, patch: Partial<Entry>) => {
    setDirtyPositions((prev) => new Set(prev).add(entries[i]!.position));
    setEntries((prev) =>
      prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    );
  };

  // ── Batch: pass all filled rows + mark card sent ──────────────────────────
  function handlePassAll() {
    const next = entries.map((e) =>
      e.name.trim()
        ? { ...e, result: "pass" as RosterResult, cardSent: true }
        : e,
    );
    const newDirty = new Set(dirtyPositions);
    next.forEach((e) => { if (e.name.trim()) newDirty.add(e.position); });
    setEntries(next);
    setDirtyPositions(newDirty);
    toast({ title: "All attendees marked as passed + card sent" });
  }

  // ── Import from JSON / XLSX / CSV ────────────────────────────────────────
  async function handleFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const isJson = file.name.toLowerCase().endsWith(".json");
      let parsed: { name: string; email: string; phone: string; result?: string | null; cardSent?: boolean }[];

      if (isJson) {
        const text = await file.text();
        parsed = parseRosterJson(text);
      } else {
        parsed = await parseSpreadsheet(file);
      }

      if (parsed.length === 0) {
        toast({
          title: "No valid rows found",
          description: isJson
            ? "No attendee entries found in the file."
            : "Make sure the file has Name, Email, and/or Phone columns.",
          variant: "destructive",
        });
        return;
      }

      const next = [...entries];
      const newDirty = new Set(dirtyPositions);
      let pi = 0;
      let imported = 0;

      for (let i = 0; i < next.length && pi < parsed.length; i++) {
        if (!next[i]!.name.trim()) {
          const p = parsed[pi++]!;
          next[i] = {
            ...next[i]!,
            name: p.name,
            email: p.email,
            phone: p.phone,
            ...(p.result !== undefined ? { result: p.result as RosterResult } : {}),
            ...(p.cardSent !== undefined ? { cardSent: p.cardSent } : {}),
          };
          newDirty.add(next[i]!.position);
          imported++;
        }
      }

      setEntries(next);
      setDirtyPositions(newDirty);

      const remaining = parsed.length - imported;
      toast({
        title: `Imported ${imported} attendee${imported !== 1 ? "s" : ""}`,
        description:
          remaining > 0
            ? `${remaining} row${remaining !== 1 ? "s" : ""} skipped (roster full or already filled)`
            : `From ${file.name}`,
      });
    } catch (err) {
      toast({
        title: "Failed to read file",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
      ev.target.value = "";
    }
  }

  if (isLoading || !roster || !cls) {
    return <PageHeader title="Loading roster..." />;
  }

  const filledCount = entries.filter((e) => e.name.trim()).length;

  return (
    <>
      <Link
        href={`/classes/${classId}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        data-testid="link-back-to-class"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to class
      </Link>
      <PageHeader
        title={`${cls.title} — Roster`}
        subtitle={`Up to ${roster.capacity} attendees · ${cls.location} · ${cls.date}`}
        action={
          canEdit && (
            <Button
              data-testid="button-save-roster"
              disabled={save.isPending}
              onClick={() => save.mutate({ classId, data: { entries } })}
            >
              <Save className="h-4 w-4 mr-1.5" /> Save roster
            </Button>
          )
        }
      />

      {/* Toolbar */}
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* File import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-import-roster"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            {importing ? "Reading file…" : "Import from file"}
          </Button>
          <span className="text-xs text-muted-foreground">.json (offline form) or .xlsx / .csv</span>

          {/* Download offline roster form */}
          <a href={`${import.meta.env.BASE_URL}cpr-roster-form.html`} download="CPR_Roster_Form.html">
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5 mr-1.5" /> Offline roster form
            </Button>
          </a>

          {/* Batch pass + card sent */}
          {filledCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950/20"
              onClick={handlePassAll}
              data-testid="button-pass-all"
            >
              <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
              Pass all &amp; mark cards sent ({filledCount})
            </Button>
          )}
        </div>
      )}

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="hidden md:grid grid-cols-[2rem_1.4fr_1.4fr_1fr_7rem_5rem] gap-3 text-xs font-medium text-muted-foreground px-1">
            <span>#</span>
            <span>Name</span>
            <span>Email</span>
            <span>Phone</span>
            <span>Result</span>
            <span className="text-center">Card sent</span>
          </div>
          {entries.map((e, i) => (
            <div
              key={i}
              className="grid grid-cols-1 md:grid-cols-[2rem_1.4fr_1.4fr_1fr_7rem_5rem] gap-3 items-center"
              data-testid={`roster-row-${i}`}
            >
              <span className="text-sm text-muted-foreground font-mono">
                {i + 1}
              </span>
              <div>
                <Label className="md:hidden text-xs">Name</Label>
                <Input
                  value={e.name}
                  readOnly={!canEdit}
                  placeholder="Full name"
                  data-testid={`input-roster-name-${i}`}
                  onChange={(ev) => update(i, { name: ev.target.value })}
                />
              </div>
              <div>
                <Label className="md:hidden text-xs">Email</Label>
                <Input
                  type="email"
                  value={e.email}
                  readOnly={!canEdit}
                  placeholder="name@example.com"
                  data-testid={`input-roster-email-${i}`}
                  onChange={(ev) => update(i, { email: ev.target.value })}
                />
              </div>
              <div>
                <Label className="md:hidden text-xs">Phone</Label>
                <Input
                  type="tel"
                  value={e.phone}
                  readOnly={!canEdit}
                  placeholder="(555) 123-4567"
                  data-testid={`input-roster-phone-${i}`}
                  onChange={(ev) => update(i, { phone: ev.target.value })}
                />
              </div>
              <div>
                <Label className="md:hidden text-xs">Result</Label>
                <Select
                  value={e.result ?? "none"}
                  disabled={!canEdit}
                  onValueChange={(v) =>
                    update(i, {
                      result: v === "none" ? null : (v as RosterResult),
                    })
                  }
                >
                  <SelectTrigger data-testid={`select-roster-result-${i}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Label
                  className="md:hidden text-xs"
                  htmlFor={`roster-card-${i}`}
                >
                  Card sent
                </Label>
                <Checkbox
                  id={`roster-card-${i}`}
                  checked={e.cardSent}
                  disabled={!canEdit}
                  data-testid={`checkbox-roster-card-${i}`}
                  onCheckedChange={(v) => update(i, { cardSent: v === true })}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
