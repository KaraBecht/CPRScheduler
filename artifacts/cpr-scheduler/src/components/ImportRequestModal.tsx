import { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrainingRequestForm } from "@/components/TrainingRequestForm";
import { Upload, FileJson, AlertCircle, X, Clock } from "lucide-react";
import type { CertificationType } from "@workspace/api-client-react";

const CERT_TYPES: CertificationType[] = [
  "cpr_aed_first_aid",
  "stop_the_bleed",
  "cpr_aed_first_aid_stop_the_bleed",
];

/**
 * Returns true only for real calendar dates in YYYY-MM-DD format.
 * Uses Date.UTC so the result is timezone-independent — valid for any locale.
 */
export function isValidImportDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [year, month, day] = s.split("-").map(Number);
  // month is 1-based in the string, 0-based in Date
  const d = new Date(Date.UTC(year, month - 1, day));
  // If month/day overflow (e.g. 2025-99-99), Date.UTC rolls over and components won't match
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

// Returns true only for HH:mm times in 00:00–23:59
function isValidTime(s: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(s)) return false;
  const [hh, mm] = s.split(":").map(Number);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

interface ParsedRequest {
  locationName?: string;
  address?: string;
  requestorName?: string;
  requestorEmail?: string;
  requestorPhone?: string;
  certificationType?: CertificationType;
  numberOfClasses?: number;
  attendeeCount?: number;
  businessUnit?: string;
  notes?: string;
  sessions?: { date: string; startTime: string }[];
}

export interface ParseResult {
  data: ParsedRequest;
  submittedAt: string | null;
  /** Errors that prevent advancing to the review step */
  blockingErrors: string[];
  /** Non-fatal issues shown as warnings in the review step */
  warnings: string[];
}

export function parseImportedJson(raw: unknown): ParseResult {
  if (!raw || typeof raw !== "object") throw new Error("Not a valid JSON object");
  const obj = raw as Record<string, unknown>;

  const blockingErrors: string[] = [];
  const warnings: string[] = [];

  // --- Required fields ---
  const locationName = typeof obj.locationName === "string" && obj.locationName.trim()
    ? obj.locationName.trim()
    : undefined;
  if (!locationName) blockingErrors.push("Location name is missing or empty.");

  const requestorName = typeof obj.requestorName === "string" && obj.requestorName.trim()
    ? obj.requestorName.trim()
    : undefined;
  if (!requestorName) blockingErrors.push("Requestor name is missing or empty.");

  const requestorEmail = typeof obj.requestorEmail === "string" && obj.requestorEmail.trim()
    ? obj.requestorEmail.trim()
    : undefined;
  if (!requestorEmail) blockingErrors.push("Requestor email is missing or empty.");

  // If none of the three required fields are present, the file is almost certainly wrong
  if (!locationName && !requestorName && !requestorEmail) {
    const unknownKeys = Object.keys(obj);
    const sample = unknownKeys.length > 0
      ? `Found unrecognized fields: ${unknownKeys.slice(0, 5).join(", ")}${unknownKeys.length > 5 ? ", …" : ""}.`
      : "The file appears to be empty.";
    blockingErrors.length = 0; // replace the individual messages with one clear one
    blockingErrors.push(
      `This doesn't look like a CPR Training Request file. ${sample} Expected fields like locationName, requestorEmail.`
    );
    return { data: {}, submittedAt: null, blockingErrors, warnings };
  }

  // --- Sessions ---
  const sessions: { date: string; startTime: string }[] = [];
  if (!Array.isArray(obj.sessions) || obj.sessions.length === 0) {
    blockingErrors.push("No sessions found — the file may be from an older form version.");
  } else {
    for (let i = 0; i < obj.sessions.length; i++) {
      const s = obj.sessions[i];
      if (!s || typeof s !== "object") {
        blockingErrors.push(`Session ${i + 1}: not a valid object — skipped.`);
        continue;
      }
      const rec = s as Record<string, unknown>;

      // Date must be a real calendar date
      const rawDate = typeof rec.date === "string" ? rec.date.trim() : "";
      if (!isValidImportDate(rawDate)) {
        blockingErrors.push(
          `Session ${i + 1}: "${rawDate || "(missing)"}" is not a valid date — expected YYYY-MM-DD (e.g. 2026-03-15).`
        );
        continue;
      }

      // Check if the session date is in the past (non-blocking warning)
      const todayStr = (() => {
        const t = new Date();
        const yyyy = t.getFullYear();
        const mm = String(t.getMonth() + 1).padStart(2, "0");
        const dd = String(t.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      })();
      if (rawDate < todayStr) {
        warnings.push(
          `Session ${i + 1} (${rawDate}) is in the past — please update the date before submitting.`
        );
      }

      // Time is optional; default to 09:00 if absent or malformed (non-blocking)
      const rawTime = typeof rec.startTime === "string" ? rec.startTime.trim() : "";
      let startTime = "09:00";
      if (rawTime) {
        if (isValidTime(rawTime)) {
          startTime = rawTime;
        } else {
          warnings.push(
            `Session ${i + 1}: start time "${rawTime}" is not a valid HH:mm value — defaulted to 09:00.`
          );
        }
      }

      sessions.push({ date: rawDate, startTime });
    }

    // If every session was invalid, ensure there's a blocking error
    if (sessions.length === 0 && blockingErrors.every((e) => !e.startsWith("Session"))) {
      blockingErrors.push("No sessions with valid dates found — the file may be from an older form version.");
    }

    // Warn about sessions that are already in the past (non-blocking)
    if (sessions.length > 0) {
      const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD in local UTC
      const pastCount = sessions.filter((s) => s.date < todayStr).length;
      if (pastCount > 0) {
        warnings.push(
          pastCount === 1
            ? "1 session is in the past — update the date before confirming."
            : `${pastCount} sessions are in the past — update the dates before confirming.`
        );
      }
    }
  }

  // --- certificationType ---
  // Unknown value is a blocking error; absent field leaves it to the form to choose
  let certType: CertificationType | undefined;
  if (typeof obj.certificationType === "string") {
    if (CERT_TYPES.includes(obj.certificationType as CertificationType)) {
      certType = obj.certificationType as CertificationType;
    } else {
      blockingErrors.push(
        `Unrecognised certification type "${obj.certificationType}" — expected one of: ${CERT_TYPES.join(", ")}.`
      );
    }
  }

  // --- Optional fields ---
  let businessUnit = typeof obj.businessUnit === "string" ? obj.businessUnit : "";
  let notes = typeof obj.notes === "string" ? obj.notes : "";
  const buInNotes = notes.match(/^Business Unit:\s*(.+?)(\n|$)/i);
  if (buInNotes) {
    if (!businessUnit) businessUnit = buInNotes[1]?.trim() ?? "";
    notes = notes.replace(/^Business Unit:\s*.+?(\n|$)/i, "").trim();
  }

  // --- submittedAt ---
  const submittedAt = typeof obj.submittedAt === "string" && obj.submittedAt.trim()
    ? obj.submittedAt.trim()
    : null;

  const data: ParsedRequest = {
    locationName,
    address: typeof obj.address === "string" && obj.address.trim() ? obj.address.trim() : undefined,
    requestorName,
    requestorEmail,
    requestorPhone: typeof obj.requestorPhone === "string" && obj.requestorPhone.trim() ? obj.requestorPhone.trim() : undefined,
    certificationType: certType,
    numberOfClasses: typeof obj.numberOfClasses === "number" ? obj.numberOfClasses : 1,
    attendeeCount: typeof obj.attendeeCount === "number" ? obj.attendeeCount : 10,
    businessUnit: businessUnit.trim() || undefined,
    notes: notes.trim() || undefined,
    sessions: sessions.length > 0 ? sessions : undefined,
  };

  return { data, submittedAt, blockingErrors, warnings };
}

type Step = "drop" | "review";

interface ImportRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportRequestModal({ open, onOpenChange }: ImportRequestModalProps) {
  const [step, setStep] = useState<Step>("drop");
  const [parsed, setParsed] = useState<ParsedRequest | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [reviewWarnings, setReviewWarnings] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("drop");
    setParsed(null);
    setSubmittedAt(null);
    setParseError(null);
    setFieldErrors([]);
    setReviewWarnings([]);
    setDragging(false);
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  }

  function readFile(file: File) {
    if (!file.name.endsWith(".json") && file.type !== "application/json") {
      setParseError("Please select a .json file generated by the CPR Training Request Form.");
      setFieldErrors([]);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string);
        const { data, submittedAt: sat, blockingErrors, warnings } = parseImportedJson(raw);

        if (blockingErrors.length > 0) {
          setFieldErrors(blockingErrors);
          setParseError(null);
          setParsed(null);
          return;
        }

        setParsed(data);
        setSubmittedAt(sat);
        setFieldErrors([]);
        setReviewWarnings(warnings);
        setParseError(null);
        setStep("review");
      } catch (err) {
        setParseError(
          err instanceof SyntaxError
            ? "The file isn't valid JSON. Make sure you're uploading a CPR_Request_*.json file exported from the offline request form."
            : "Could not read the file. Make sure it's a JSON file exported from the offline request form."
        );
        setFieldErrors([]);
      }
    };
    reader.readAsText(file);
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) readFile(file);
    e.target.value = "";
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={step === "review" ? "max-w-2xl max-h-[90vh] overflow-y-auto" : "max-w-lg"}
        data-testid="import-request-modal"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-4 w-4 text-primary" />
            {step === "drop" ? "Import offline request" : "Review & confirm request"}
          </DialogTitle>
        </DialogHeader>

        {step === "drop" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload the <strong>.json</strong> file generated by the offline CPR Training Request Form.
              The data will pre-fill the form below so you can review and edit before creating the request.
            </p>

            {/* Drop zone */}
            <div
              className={[
                "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors cursor-pointer",
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/40",
              ].join(" ")}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              data-testid="import-dropzone"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Drop the file here, or{" "}
                  <span className="text-primary underline underline-offset-2">browse</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Accepts <code className="text-xs bg-muted px-1 py-0.5 rounded">CPR_Request_*.json</code> files
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileInput}
                data-testid="import-file-input"
              />
            </div>

            {/* Generic parse error (JSON syntax / file read) */}
            {parseError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" data-testid="import-error">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Per-field validation errors */}
            {fieldErrors.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive space-y-1" data-testid="import-field-errors">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>This file doesn't look like a CPR Training Request export:</span>
                </div>
                <ul className="list-disc list-inside pl-1 space-y-0.5">
                  {fieldErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {step === "review" && parsed && (
          <div className="space-y-4">
            {/* Success banner */}
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/20 px-4 py-3 text-sm text-green-800 dark:text-green-300">
              <FileJson className="h-4 w-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <span>File imported — review and edit the details below, then confirm to create the request.</span>
                {submittedAt && (
                  <div className="flex items-center gap-1 mt-0.5 text-green-700 dark:text-green-400 text-xs">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>
                      Submitted {(() => {
                        try {
                          return new Date(submittedAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          });
                        } catch {
                          return submittedAt;
                        }
                      })()}
                    </span>
                  </div>
                )}
              </div>
              <button
                className="ml-auto text-green-600 hover:text-green-800 dark:text-green-400 shrink-0"
                onClick={() => setStep("drop")}
                title="Upload a different file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Non-blocking warnings (e.g. past-dated sessions, bad time values) */}
            {reviewWarnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 space-y-1" data-testid="import-review-warnings">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Please review before submitting:</span>
                </div>
                <ul className="list-disc list-inside pl-1 space-y-0.5">
                  {reviewWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <TrainingRequestForm
              initialValues={parsed}
              onSuccess={() => {
                handleClose(false);
              }}
              onCancel={() => handleClose(false)}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
