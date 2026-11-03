import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useMergeLocations,
  getListLocationsQueryKey,
  getListClassesQueryKey,
  getGetAdminDashboardQueryKey,
  type LocationDetail,
} from "@workspace/api-client-react";
import { GitMerge, AlertTriangle, ArrowLeft, Lightbulb } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Choice = "target" | "source" | "both";
type FieldKey =
  | "name"
  | "address"
  | "contactName"
  | "contactEmail"
  | "contactPhone"
  | "notes"
  | "businessUnit"
  | "timeZone";

const FIELDS: { key: FieldKey; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "address", label: "Address" },
  { key: "contactName", label: "Contact name" },
  { key: "contactEmail", label: "Contact email" },
  { key: "contactPhone", label: "Contact phone" },
  { key: "notes", label: "Notes" },
  { key: "businessUnit", label: "Business unit" },
  { key: "timeZone", label: "Time zone" },
];

const val = (l: LocationDetail, k: FieldKey) => String(l[k] ?? "").trim();

export function normalizeAddress(a: string | null | undefined): string {
  return (a ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\bstreet\b/g, "st")
    .replace(/\bavenue\b/g, "ave")
    .replace(/\broad\b/g, "rd")
    .replace(/\bsuite\b/g, "ste")
    .replace(/\s+/g, "");
}

const normName = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, "");

export function findLikelyDuplicates(locations: LocationDetail[]) {
  const pairs: [LocationDetail, LocationDetail][] = [];
  for (let i = 0; i < locations.length; i++) {
    for (let j = i + 1; j < locations.length; j++) {
      const a = locations[i];
      const b = locations[j];
      const na = normalizeAddress(a.address);
      const nb = normalizeAddress(b.address);
      const sameAddr = !!na && na === nb;
      const x = normName(a.name);
      const y = normName(b.name);
      const prefix = !!x && !!y && (x.startsWith(y) || y.startsWith(x));
      if (sameAddr || prefix) pairs.push([a, b]);
    }
  }
  return pairs.slice(0, 6);
}

function errorMessage(err: unknown): string {
  const e = err as { status?: number; data?: unknown; message?: string };
  const data = e?.data as { error?: string; message?: string } | null | undefined;
  const detail = data?.error || data?.message;
  if (e?.status === 409) {
    return (
      (detail ? detail + " " : "") +
      "One of these locations changed since you opened this review. Close the dialog, reopen it, and review the latest details again."
    );
  }
  return detail || e?.message || "The merge could not be completed.";
}

export function LocationMergeDialog({ locations }: { locations: LocationDetail[] }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"review" | "confirm">("review");
  const [targetId, setTargetId] = useState<string>("");
  const [sourceId, setSourceId] = useState<string>("");
  const [targetSnapshot, setTargetSnapshot] = useState<LocationDetail>();
  const [sourceSnapshot, setSourceSnapshot] = useState<LocationDetail>();
  const [choices, setChoices] = useState<Partial<Record<FieldKey, Choice>>>({});
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();
  const merge = useMergeLocations();

  const sorted = useMemo(
    () => [...locations].sort((a, b) => a.name.localeCompare(b.name)),
    [locations],
  );
  // Freeze reviewed values; background refreshes must not silently change consent.
  const target = targetSnapshot;
  const source = sourceSnapshot;
  const hints = useMemo(() => findLikelyDuplicates(locations), [locations]);

  const rows = useMemo(() => {
    if (!target || !source) return [];
    return FIELDS.map((f) => {
      const t = val(target, f.key);
      const s = val(source, f.key);
      const kind: "conflict" | "same" | "fill" | "keep" | "empty" =
        t && s ? (t === s ? "same" : "conflict") : !t && s ? "fill" : t ? "keep" : "empty";
      return { ...f, t, s, kind };
    });
  }, [target, source]);

  const conflicts = rows.filter((r) => r.kind === "conflict");
  const unresolved = conflicts.filter((r) => !choices[r.key]);
  const ready = !!target && !!source && target.id !== source.id && unresolved.length === 0;

  const reset = () => {
    setStep("review");
    setTargetId("");
    setSourceId("");
    setTargetSnapshot(undefined);
    setSourceSnapshot(undefined);
    setChoices({});
    setError(null);
  };

  const handleOpen = (o: boolean) => {
    if (merge.isPending) return;
    setOpen(o);
    if (!o) reset();
  };

  const pick = (t: string, s: string) => {
    setTargetId(t);
    setSourceId(s);
    setTargetSnapshot(locations.find((l) => String(l.id) === t));
    setSourceSnapshot(locations.find((l) => String(l.id) === s));
    setChoices({});
    setError(null);
    setStep("review");
  };

  const submit = () => {
    if (!target || !source || !ready) return;
    setError(null);
    const payload: Record<string, Choice> = {};
    for (const r of conflicts) payload[r.key] = choices[r.key]!;
    merge.mutate(
      {
        locationId: target.id,
        data: {
          sourceId: source.id,
          targetUpdatedAt: target.updatedAt,
          sourceUpdatedAt: source.updatedAt,
          choices: payload,
        },
      },
      {
        onSuccess: async () => {
          const prefixes = [
            getListLocationsQueryKey()[0],
            getListClassesQueryKey()[0],
            getGetAdminDashboardQueryKey()[0],
          ].map(String);
          await qc.invalidateQueries({
            predicate: (q) => {
              const k = String(q.queryKey[0] ?? "");
              return prefixes.some((p) => k.startsWith(p)) || /location|class|dashboard/i.test(k);
            },
          });
          toast({ title: "Locations merged", description: `${source.name} was combined into ${target.name}.` });
          setOpen(false);
          reset();
        },
        onError: (err) => {
          setError(errorMessage(err));
          qc.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-merge-locations">
          <GitMerge className="mr-2 h-4 w-4" />
          Merge locations
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            {step === "review" ? "Merge locations" : "Confirm merge"}
          </DialogTitle>
          <DialogDescription>
            Choose the location to keep (target) and the duplicate to fold into it (source).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {step === "review" && (
            <>
              {hints.length > 0 && (
                <div className="rounded-md border border-amber-300/60 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
                  <div className="mb-2 flex items-center gap-2 font-medium">
                    <Lightbulb className="h-4 w-4" /> Possible duplicates
                  </div>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Matching addresses or names. These are suggestions only; nothing merges until you confirm.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {hints.map(([a, b]) => (
                      <Button
                        key={`${a.id}-${b.id}`}
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-auto whitespace-normal text-left"
                        onClick={() => pick(String(a.id), String(b.id))}
                      >
                        {a.name} + {b.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="merge-target">Keep (target)</Label>
                  <Select value={targetId} onValueChange={(v) => pick(v, sourceId === v ? "" : sourceId)}>
                    <SelectTrigger id="merge-target"><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>
                      {sorted.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)} disabled={String(l.id) === sourceId}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="merge-source">Combine in (source)</Label>
                  <Select value={sourceId} onValueChange={(v) => pick(targetId === v ? "" : targetId, v)}>
                    <SelectTrigger id="merge-source"><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent>
                      {sorted.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)} disabled={String(l.id) === targetId}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {target && source && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">Field review</h3>
                    {conflicts.length > 0 && (
                      <Badge variant={unresolved.length ? "destructive" : "secondary"}>
                        {conflicts.length - unresolved.length} of {conflicts.length} conflicts resolved
                      </Badge>
                    )}
                  </div>
                  {rows.map((r) =>
                    r.kind === "conflict" ? (
                      <fieldset key={r.key} className={cn("rounded-md border p-3", !choices[r.key] && "border-amber-400")}>
                        <legend className="px-1 text-sm font-medium">{r.label} <span className="text-xs font-normal text-muted-foreground">choose one</span></legend>
                        {r.key === "timeZone" && (
                          <p className="mb-2 text-xs text-muted-foreground">
                            A location can only have one time zone, so keeping both is not available.
                          </p>
                        )}
                        <div role="radiogroup" aria-label={`${r.label} choice`} className="grid gap-2">
                          {(["target", "source", "both"] as Choice[])
                            .filter((c) => !(c === "both" && r.key === "timeZone"))
                            .map((c) => {
                              const id = `merge-${r.key}-${c}`;
                              const preview =
                                c === "target" ? r.t : c === "source" ? r.s : `${r.t}\n${r.s}`;
                              const title =
                                c === "target" ? `Keep ${target.name}'s` : c === "source" ? `Use ${source.name}'s` : "Keep both";
                              return (
                                <label
                                  key={c}
                                  htmlFor={id}
                                  className={cn(
                                    "flex cursor-pointer items-start gap-3 rounded-md border p-2.5 text-sm transition-colors hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring",
                                    choices[r.key] === c && "border-primary bg-primary/5",
                                  )}
                                >
                                  <input
                                    id={id}
                                    type="radio"
                                    name={`merge-${r.key}`}
                                    className="mt-1 accent-[hsl(var(--primary))]"
                                    checked={choices[r.key] === c}
                                    onChange={() => setChoices((p) => ({ ...p, [r.key]: c }))}
                                  />
                                  <span className="min-w-0">
                                    <span className="block text-xs font-medium text-muted-foreground">{title}</span>
                                    <span className="block whitespace-pre-wrap break-words">{preview}</span>
                                  </span>
                                </label>
                              );
                            })}
                        </div>
                      </fieldset>
                    ) : (
                      <div key={r.key} className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-md bg-muted/40 px-3 py-2 text-sm">
                        <span className="font-medium">{r.label}</span>
                        <span className="min-w-0 break-words text-right text-muted-foreground">
                          {r.kind === "empty" ? "Empty on both" : r.kind === "fill" ? `Filled from source: ${r.s}` : r.kind === "same" ? `Same: ${r.t}` : `Kept: ${r.t}`}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              )}
            </>
          )}

          {step === "confirm" && target && source && (
            <div className="space-y-3 text-sm">
              <p>
                <strong>{source.name}</strong> will be combined into <strong>{target.name}</strong>, and the{" "}
                {source.name} card will no longer appear separately.
              </p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>All class history from both locations is preserved under {target.name}.</li>
                <li>Communication notes from both locations are kept.</li>
                <li>The original details of both locations are saved as a merge history note.</li>
              </ul>
              <div className="rounded-md border p-3">
                <div className="mb-1 text-xs font-medium text-muted-foreground">Your choices</div>
                {conflicts.length === 0 ? (
                  <p>No conflicts; empty fields are filled automatically.</p>
                ) : (
                  conflicts.map((r) => (
                    <div key={r.key} className="flex justify-between gap-3">
                      <span>{r.label}</span>
                      <span className="text-muted-foreground">
                        {choices[r.key] === "both" ? "Keep both" : choices[r.key] === "source" ? source.name : target.name}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="flex gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 border-t px-5 py-3 sm:gap-2">
          {step === "review" ? (
            <>
              <Button variant="ghost" onClick={() => handleOpen(false)}>Cancel</Button>
              <Button disabled={!ready} onClick={() => { setError(null); setStep("confirm"); }}>
                {unresolved.length ? `Resolve ${unresolved.length} conflict${unresolved.length > 1 ? "s" : ""}` : "Review merge"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" disabled={merge.isPending} onClick={() => setStep("review")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button disabled={!ready || merge.isPending} onClick={submit} data-testid="button-confirm-merge">
                {merge.isPending ? "Merging..." : "Merge locations"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
