import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import {
  useGetClass,
  useGetClassRoster,
  useSaveClassRoster,
  getGetClassRosterQueryKey,
  type ClassRosterEntry,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCertificationType, formatDate, formatTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  HeartPulse,
  Save,
  CheckCircle2,
  Users,
  CalendarDays,
  MapPin,
  Clock,
  ChevronLeft,
  UserCheck,
} from "lucide-react";

function emptyRow(position: number): ClassRosterEntry {
  return { position, name: "", email: "", phone: "", result: null, cardSent: false };
}

export default function SigninSheet() {
  const [, params] = useRoute("/classes/:id/signin-sheet");
  const classId = Number(params?.id);
  const { data: cls } = useGetClass(classId);
  const { data: roster } = useGetClassRoster(classId);
  const qc = useQueryClient();

  const [rows, setRows] = useState<ClassRosterEntry[]>([]);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const save = useSaveClassRoster({
    mutation: {
      onSuccess: (data) => {
        qc.invalidateQueries({ queryKey: getGetClassRosterQueryKey(classId) });
        setSavedAt(new Date());
        setDirty(false);
        setRows(data.entries.length > 0 ? buildRows(data.entries, data.capacity) : rows);
      },
    },
  });

  function buildRows(entries: ClassRosterEntry[], capacity: number): ClassRosterEntry[] {
    const map = new Map(entries.map((e) => [e.position, e]));
    return Array.from({ length: capacity }, (_, i) => map.get(i + 1) ?? emptyRow(i + 1));
  }

  useEffect(() => {
    if (!roster || !cls) return;
    setRows(buildRows(roster.entries, cls.capacity));
  }, [roster, cls]);

  function updateRow(idx: number, patch: Partial<ClassRosterEntry>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    setDirty(true);
    setSavedAt(null);
  }

  function handleSave() {
    save.mutate({
      classId,
      data: { entries: rows.filter((r) => r.name.trim() !== "") },
    });
  }

  // Focus next row's name input on Enter in the name field
  function handleNameKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = inputRefs.current[idx + 1];
      if (next) next.focus();
    }
  }

  const filledCount = rows.filter((r) => r.name.trim()).length;
  const capacity = cls?.capacity ?? rows.length;

  if (!cls) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mr-2">
            <div className="h-8 w-8 rounded-lg bg-[#007BA7] flex items-center justify-center flex-shrink-0">
              <HeartPulse className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm hidden sm:block">FOX Medical</span>
          </div>

          {/* Back */}
          <a
            href="javascript:history.back()"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </a>

          <span className="flex-1" />

          {/* Attendance counter */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <UserCheck className="h-4 w-4" />
            <span>
              <span className="font-semibold text-foreground">{filledCount}</span>
              {" / "}{capacity} signed in
            </span>
          </div>

          {/* Save button */}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={save.isPending || !dirty}
            className="gap-1.5"
          >
            {save.isPending ? (
              <>Saving…</>
            ) : savedAt ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Class info card */}
        <div className="bg-white rounded-xl border border-border shadow-sm px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-xs">
                  {formatCertificationType(cls.certificationType)}
                </Badge>
                <Badge
                  variant={cls.status === "scheduled" ? "default" : "secondary"}
                  className="text-xs capitalize"
                >
                  {cls.status}
                </Badge>
              </div>
              <h1 className="text-xl font-bold tracking-tight">{cls.title}</h1>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(cls.date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {formatTime(cls.startTime)}
                  {cls.endTime ? ` – ${formatTime(cls.endTime)}` : ""}
                </span>
                {cls.location && cls.location !== "TBD" && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {cls.location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {capacity} seats
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Class</div>
              <div className="font-mono font-bold text-2xl text-[#007BA7]">#{cls.id}</div>
            </div>
          </div>
        </div>

        {/* Digital roster table */}
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-[#007BA7] transition-all duration-300"
              style={{ width: `${capacity > 0 ? (filledCount / capacity) * 100 : 0}%` }}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="w-12 py-3 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    #
                  </th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Full Name
                  </th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Email
                  </th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Phone
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const filled = row.name.trim().length > 0;
                  return (
                    <tr
                      key={row.position}
                      className={`border-b border-border/60 last:border-0 transition-colors ${
                        filled ? "bg-emerald-50/40" : "bg-white hover:bg-muted/20"
                      }`}
                    >
                      {/* Row number + status dot */}
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full shrink-0 ${
                              filled ? "bg-emerald-500" : "bg-muted-foreground/20"
                            }`}
                          />
                          <span className="font-mono text-xs text-muted-foreground">
                            {String(row.position).padStart(2, "0")}
                          </span>
                        </div>
                      </td>

                      {/* Name */}
                      <td className="py-1.5 px-2">
                        <Input
                          ref={(el) => { inputRefs.current[idx] = el; }}
                          className={`h-8 text-sm border-0 shadow-none focus-visible:ring-1 focus-visible:ring-[#007BA7] bg-transparent ${
                            filled ? "font-medium" : ""
                          }`}
                          placeholder="Full name"
                          value={row.name}
                          onChange={(e) => updateRow(idx, { name: e.target.value })}
                          onKeyDown={(e) => handleNameKeyDown(e, idx)}
                        />
                      </td>

                      {/* Email */}
                      <td className="py-1.5 px-2">
                        <Input
                          type="email"
                          className="h-8 text-sm border-0 shadow-none focus-visible:ring-1 focus-visible:ring-[#007BA7] bg-transparent"
                          placeholder="email@example.com"
                          value={row.email}
                          onChange={(e) => updateRow(idx, { email: e.target.value })}
                        />
                      </td>

                      {/* Phone */}
                      <td className="py-1.5 px-2">
                        <Input
                          type="tel"
                          className="h-8 text-sm border-0 shadow-none focus-visible:ring-1 focus-visible:ring-[#007BA7] bg-transparent"
                          placeholder="(555) 000-0000"
                          value={row.phone}
                          onChange={(e) => updateRow(idx, { phone: e.target.value })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border/60 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {filledCount} of {capacity} seats filled
            </span>
            {savedAt && (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Saved {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {dirty && !save.isPending && (
              <span className="text-amber-600">Unsaved changes</span>
            )}
          </div>
        </div>

        {/* Keyboard hint */}
        <p className="text-xs text-center text-muted-foreground pb-4">
          Press <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted font-mono text-[11px]">Enter</kbd> in the name field to jump to the next row
        </p>
      </div>
    </div>
  );
}
