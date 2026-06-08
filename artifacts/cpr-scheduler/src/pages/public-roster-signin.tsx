import { useState } from "react";
import { useRoute } from "wouter";
import { useGetClass } from "@workspace/api-client-react";
import { HeartPulse, CheckCircle2, CalendarDays, MapPin, User as UserIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatTime } from "@/lib/format";

export default function PublicRosterSignIn() {
  const [, params] = useRoute("/roster-signin/:id");
  const classId = parseInt(params?.id ?? "0", 10);
  const { data: cls, isLoading } = useGetClass(classId);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/classes/${classId}/roster-signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as any).error ?? "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
          <HeartPulse className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="font-bold text-base tracking-tight">FOX Medical</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            CPR Training Hub
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading class info…</p>
          ) : submitted ? (
            <Card>
              <CardContent className="pt-10 pb-10 flex flex-col items-center text-center gap-4">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold mb-1">You're signed in!</h2>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    Thanks, <strong>{name}</strong>. Your attendance has been
                    recorded for{" "}
                    <strong>{cls?.title ?? "this class"}</strong>.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">
                  {cls?.title ?? "Class"} — Sign-In Sheet
                </h1>
                <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
                  {cls?.date && (
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4" />
                      {formatDate(cls.date)}
                      {cls.startTime
                        ? ` · ${formatTime(cls.startTime)}${cls.endTime ? ` – ${formatTime(cls.endTime)}` : ""}`
                        : ""}
                    </span>
                  )}
                  {cls?.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {cls.location}
                    </span>
                  )}
                  {cls?.instructorName && (
                    <span className="flex items-center gap-1.5">
                      <UserIcon className="h-4 w-4" />
                      {cls.instructorName}
                    </span>
                  )}
                </div>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">
                        Full name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="Jane Smith"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="jane@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    {error && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={submitting}
                    >
                      {submitting ? "Signing in…" : "Sign in"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
