import { useState, useEffect, useCallback } from "react";
import { useRoute } from "wouter";
import { formatDate, formatTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  HeartPulse,
  CheckCircle2,
  Users,
  CalendarDays,
  MapPin,
  Clock,
  UserCheck,
  RotateCcw,
} from "lucide-react";

type SheetData = {
  classId: number;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  capacity: number;
  certificationType: string;
  signedInCount: number;
  attendees: { position: number; name: string | null }[];
};

function certLabel(ct: string) {
  if (ct === "cpr_aed_first_aid") return "CPR / AED / First Aid";
  if (ct === "stop_the_bleed") return "Stop the Bleed";
  if (ct === "cpr_aed_first_aid_stop_the_bleed") return "CPR + Stop the Bleed";
  return ct;
}

export default function SigninSheet() {
  const [, params] = useRoute("/classes/:id/signin-sheet");
  const classId = Number(params?.id);

  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  const fetchSheet = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/classes/${classId}/signin-sheet`);
      if (!res.ok) { setLoadError(true); return; }
      setSheet(await res.json());
    } catch {
      setLoadError(true);
    }
  }, [classId]);

  useEffect(() => {
    fetchSheet();
  }, [fetchSheet]);

  useEffect(() => {
    const id = setInterval(fetchSheet, 6000);
    return () => clearInterval(id);
  }, [fetchSheet]);

  useEffect(() => {
    if (!submitted) return;
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) { clearInterval(interval); resetForm(); return 0; }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted]);

  function resetForm() {
    setName(""); setEmail(""); setPhone("");
    setSubmitted(false); setSubmitError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/classes/${classId}/roster-signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError((data as { error?: string }).error ?? "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
      await fetchSheet();
    } catch {
      setSubmitError("Could not connect. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <HeartPulse className="h-6 w-6 text-destructive" />
          </div>
          <p className="font-semibold text-lg mb-1">Class not found</p>
          <p className="text-sm text-muted-foreground">This link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  const pct = sheet.capacity > 0 ? (sheet.signedInCount / sheet.capacity) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#008080" }}>
            <HeartPulse className="h-4 w-4 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-sm">FOX Medical</div>
            <div className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: "#008080" }}>
              CPR Training Hub
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground">
            <UserCheck className="h-4 w-4" />
            <span>
              <span className="font-semibold text-foreground">{sheet.signedInCount}</span>
              {" / "}{sheet.capacity}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-5">
        {/* Class info */}
        <div className="bg-white rounded-xl border border-border shadow-sm px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Badge variant="secondary" className="text-xs mb-1.5">
                {certLabel(sheet.certificationType)}
              </Badge>
              <h1 className="text-lg font-bold tracking-tight leading-snug">{sheet.title}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDate(sheet.date)}</span>
                {sheet.startTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(sheet.startTime)}{sheet.endTime ? ` – ${formatTime(sheet.endTime)}` : ""}
                  </span>
                )}
                {sheet.location && sheet.location !== "TBD" && (
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{sheet.location}</span>
                )}
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{sheet.capacity} seats</span>
              </div>
            </div>
            <div className="font-mono font-bold text-2xl shrink-0" style={{ color: "#007BA7" }}>
              #{sheet.classId}
            </div>
          </div>

          {/* Attendance progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>{sheet.signedInCount} signed in</span>
              <span>{sheet.capacity - sheet.signedInCount} spots remaining</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: pct >= 100 ? "#ef4444" : "#007BA7" }}
              />
            </div>
          </div>
        </div>

        {/* Sign-in form or success */}
        <div className="bg-white rounded-xl border border-border shadow-sm px-5 py-5">
          {submitted ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-base">You're signed in!</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Thanks, <strong>{name}</strong>. Your attendance has been recorded.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={resetForm} className="gap-1.5 mt-1">
                <RotateCcw className="h-3.5 w-3.5" /> Next person
              </Button>
              <p className="text-xs text-muted-foreground">Form resets in {countdown}s</p>
            </div>
          ) : (
            <>
              <h2 className="font-semibold text-sm mb-4">Sign in below</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs">
                    Full name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Jane Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-xs">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
                {submitError && (
                  <p className="text-sm text-destructive">{submitError}</p>
                )}
                <Button
                  type="submit"
                  className="w-full mt-1"
                  disabled={submitting || sheet.signedInCount >= sheet.capacity}
                  style={{ background: "#007BA7" }}
                >
                  {submitting ? "Signing in…" : sheet.signedInCount >= sheet.capacity ? "Class is full" : "Sign in"}
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Who's signed in */}
        {sheet.attendees.length > 0 && (
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Signed in</h2>
              <span className="text-xs text-muted-foreground">{sheet.signedInCount} of {sheet.capacity}</span>
            </div>
            <div className="divide-y divide-border/60">
              {sheet.attendees.map((a, i) => (
                <div key={a.position} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ background: "#007BA7" }}>
                    {i + 1}
                  </div>
                  <span className="text-sm font-medium">{a.name}</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 ml-auto shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground pb-2">
          This page updates automatically · No account required
        </p>
      </div>
    </div>
  );
}
