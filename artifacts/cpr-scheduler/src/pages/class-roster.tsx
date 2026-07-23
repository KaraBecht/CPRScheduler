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

function findCol(row: Record<string, unknown>, ...keywords: string[]): string {
  for (const key of Object.keys(row)) {
    const k = key.toLowerCase().trim();
    if (keywords.some((kw) => k.includes(kw))) {
      return String(row[key] ?? "").trim();
    }
  }
  return "";
}

async function parseSpreadsheet(
  file: File,
): Promise<{ name: string; email: string; phone: string }[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const wsName = wb.SheetNames[0];
  if (!wsName) throw new Error("Workbook has no sheets");
  const ws = wb.Sheets[wsName]!;
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: false,
  });

  return rows
    .map((row) => {
      // Name: prefer a "name" / "full name" column; fall back to first+last
      let name = findCol(row, "full name", "fullname", "student name", "attendee name");
      if (!name) {
        // try a plain "name" column that isn't "first" or "last"
        for (const key of Object.keys(row)) {
          const k = key.toLowerCase().trim();
          if (k === "name" || k === "full name") {
            name = String(row[key] ?? "").trim();
            break;
          }
        }
      }
      if (!name) {
        const first = findCol(row, "first name", "firstname", "first");
        const last = findCol(row, "last name", "lastname", "surname", "last");
        name = `${first} ${last}`.trim();
      }

      const email = findCol(row, "email");
      const phone = findCol(row, "phone", "mobile", "cell", "telephone");

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

  // ── Import from XLSX / CSV ────────────────────────────────────────────────
  async function handleFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const parsed = await parseSpreadsheet(file);
      if (parsed.length === 0) {
        toast({
          title: "No valid rows found",
          description: "Make sure the file has Name, Email, and/or Phone columns.",
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
          next[i] = { ...next[i]!, name: p.name, email: p.email, phone: p.phone };
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
    } catch {
      toast({ title: "Failed to read file", variant: "destructive" });
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
            accept=".xlsx,.xls,.csv"
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
            {importing ? "Reading file…" : "Import from spreadsheet"}
          </Button>
          <span className="text-xs text-muted-foreground">.xlsx or .csv — columns: Name, Email, Phone</span>

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
