import { Link } from "wouter";
import type { ClassSession } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  User as UserIcon,
  Trash2,
} from "lucide-react";
import {
  formatCertificationType,
  formatDate,
  formatTime,
} from "@/lib/format";
import { cn } from "@/lib/utils";

// Cert-type → accent color (medical palette)
const CERT_COLOR: Record<string, string> = {
  cpr_aed_first_aid: "#007BA7",  // Surgical Blue
  stop_the_bleed:    "#4CAF50",  // Health Green
};
const DEFAULT_ACCENT = "#008080"; // Trust Teal

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  scheduled: { bg: "#e0f2f2", color: "#006666" },
  completed: { bg: "#f0f4f8", color: "#64748b" },
  cancelled: { bg: "#fce8e8", color: "#c02020" },
};

interface ClassCardProps {
  session: ClassSession;
  onDelete?: () => void;
}

export function ClassCard({ session, onDelete }: ClassCardProps) {
  const remaining = session.capacity - session.enrolledCount;
  const full = remaining <= 0;
  const accent = CERT_COLOR[session.certificationType] ?? DEFAULT_ACCENT;
  const statusStyle = STATUS_STYLE[session.status] ?? STATUS_STYLE.scheduled;
  const fillPct = session.capacity > 0
    ? Math.round((session.enrolledCount / session.capacity) * 100)
    : 0;
  const locationDisplay = session.location && session.location !== "TBD"
    ? session.location
    : <span className="italic text-muted-foreground/60">Location TBD</span>;

  return (
    <div className="relative group">
      <Link
        href={`/classes/${session.id}`}
        data-testid={`card-class-${session.id}`}
      >
        <div
          className="bg-card rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 h-full flex flex-col"
          style={{ border: "1px solid hsl(200 18% 90%)", boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.06)" }}
        >
          {/* Colored top stripe by cert type */}
          <div className="h-1 w-full shrink-0" style={{ background: accent }} />

          <div className="p-4 flex flex-col gap-3 flex-1">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span
                  className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-2 text-white"
                  style={{ background: accent }}
                >
                  {formatCertificationType(session.certificationType)}
                </span>
                <h3 className="font-semibold text-base leading-tight text-foreground">
                  {session.title}
                </h3>
              </div>
              <span
                className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0"
                style={statusStyle}
              >
                {session.status}
              </span>
            </div>

            {/* Meta */}
            <div className="text-xs space-y-1.5" style={{ color: "#A9B0B3" }}>
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                <span>{formatDate(session.date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                <span>
                  {formatTime(session.startTime)}
                  {session.endTime ? ` – ${formatTime(session.endTime)}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                <span className="truncate">{locationDisplay}</span>
              </div>
              {session.instructorName && (
                <div className="flex items-center gap-1.5">
                  <UserIcon className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                  <span className="truncate">{session.instructorName}</span>
                </div>
              )}
            </div>

            {/* Enrollment progress */}
            <div className="mt-auto pt-3" style={{ borderTop: "1px solid hsl(200 18% 90%)" }}>
              <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: "#A9B0B3" }}>
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span className={cn(full && "font-semibold")} style={full ? { color: "#D62828" } : {}}>
                    {session.enrolledCount}/{session.capacity}
                    {full ? " · full" : ` · ${remaining} open`}
                  </span>
                </div>
                <span>{fillPct}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(200 18% 90%)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${fillPct}%`, background: full ? "#D62828" : accent }}
                />
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Delete button — only shown when onDelete prop is provided */}
      {onDelete && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-3 right-3 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          data-testid={`button-delete-class-${session.id}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
