import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";

interface ParsedEntry { name: string; email: string; phone: string }

interface ParsedCsv {
  classId?: number;
  date?: string;
  startTime?: string;
  classTitle?: string;
  entries: ParsedEntry[];
}

function parseCsv(text: string): ParsedCsv {
  const lines = text.split(/\r?\n/);
  const meta: Record<string, string> = {};
  const entries: ParsedEntry[] = [];
  let pastHeader = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("#")) {
      const m = line.slice(1).match(/^([^:]+):\s*(.+)$/);
      if (m) meta[m[1]!.trim().toLowerCase()] = m[2]!.trim();
      continue;
    }

    if (!pastHeader) {
      pastHeader = true;
      const lower = line.toLowerCase();
      if (lower.startsWith("name") || lower.startsWith('"name')) continue;
    }

    const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
    const name = cols[0] ?? "";
    const email = cols[1] ?? "";
    const phone = cols[2] ?? "";
    if (name) entries.push({ name, email, phone });
  }

  return {
    classId: meta["classid"] ? Number(meta["classid"]) : undefined,
    date: meta["date"],
    startTime: meta["starttime"],
    classTitle: meta["class"],
    entries,
  };
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported?: (classId: number) => void;
}

type Step = "pick" | "preview" | "result";

interface ImportResult {
  classTitle: string;
  classDate: string;
  imported: number;
  skipped: number;
}

export function UploadRosterDialog({ open, onOpenChange, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("pick");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState("");

  function reset() {
    setStep("pick");
    setParsed(null);
    setError(null);
    setResult(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const csv = parseCsv(ev.target?.result as string);
        if (csv.entries.length === 0) {
          setError("No names found in the file. Make sure it has at least one row with a name.");
          return;
        }
        setParsed(csv);
        setError(null);
        setStep("preview");
      } catch {
        setError("Could not read the file. Please use the CSV template downloaded from the sign-in sheet.");
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!parsed) return;
    setLoading(true);
    setError(null);
    try {
      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const res = await fetch(`${base}/api/roster/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: parsed.classId,
          date: parsed.date,
          startTime: parsed.startTime,
          entries: parsed.entries,
        }),
      });
      const data = await res.json() as { classId?: number; classTitle?: string; classDate?: string; imported?: number; skipped?: number; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Import failed");
        setLoading(false);
        return;
      }
      setResult({
        classTitle: data.classTitle ?? "",
        classDate: data.classDate ?? "",
        imported: data.imported ?? 0,
        skipped: data.skipped ?? 0,
      });
      if (data.classId) onImported?.(data.classId);
      setStep("result");
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload sign-in sheet CSV</DialogTitle>
          <DialogDescription>
            Upload the CSV template that was downloaded from the sign-in sheet.
            Names will be matched to the correct class automatically.
          </DialogDescription>
        </DialogHeader>

        {step === "pick" && (
          <div
            className="border-2 border-dashed border-border rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium mb-1">Click to choose a CSV file</p>
            <p className="text-sm text-muted-foreground">
              Use the template downloaded from a class sign-in sheet
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFile}
            />
          </div>
        )}

        {step === "preview" && parsed && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg bg-muted/40 px-4 py-3 text-sm">
              <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="font-medium truncate">{fileName}</p>
                {parsed.classTitle && (
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Class: {parsed.classTitle}
                    {parsed.date ? ` · ${parsed.date}` : ""}
                    {parsed.startTime ? ` @ ${parsed.startTime}` : ""}
                    {parsed.classId ? ` (ID #${parsed.classId})` : ""}
                  </p>
                )}
                {!parsed.classId && !parsed.date && (
                  <p className="text-amber-600 text-xs mt-0.5 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    No class ID or date found — import may fail if class cannot be matched
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">
                {parsed.entries.length} name{parsed.entries.length !== 1 ? "s" : ""} found
              </p>
              <div className="max-h-52 overflow-y-auto rounded-lg border text-sm divide-y">
                {parsed.entries.map((e, i) => (
                  <div key={i} className="px-3 py-2 flex items-center gap-3">
                    <span className="text-muted-foreground font-mono w-5 text-xs">{i + 1}</span>
                    <span className="font-medium flex-1">{e.name}</span>
                    {e.email && <span className="text-muted-foreground text-xs truncate max-w-[160px]">{e.email}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
              <div>
                <p className="font-semibold">Import complete</p>
                <p className="text-sm text-muted-foreground">
                  {result.classTitle} · {result.classDate}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-sm px-3 py-1">
                {result.imported} imported
              </Badge>
              {result.skipped > 0 && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-sm px-3 py-1">
                  {result.skipped} skipped (duplicates or class full)
                </Badge>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </p>
        )}

        <DialogFooter>
          {step === "pick" && (
            <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button onClick={handleImport} disabled={loading}>
                <Upload className="h-4 w-4 mr-1.5" />
                {loading ? "Importing…" : `Import ${parsed?.entries.length} entries`}
              </Button>
            </>
          )}
          {step === "result" && (
            <Button onClick={() => handleClose(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
