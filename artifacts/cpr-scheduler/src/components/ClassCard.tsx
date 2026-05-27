import { Link } from "wouter";
import type { ClassSession } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  User as UserIcon,
} from "lucide-react";
import {
  formatCertificationType,
  formatDate,
  formatTime,
} from "@/lib/format";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: "default",
  completed: "secondary",
  cancelled: "destructive",
};

export function ClassCard({ session }: { session: ClassSession }) {
  const remaining = session.capacity - session.enrolledCount;
  const full = remaining <= 0;
  return (
    <Link
      href={`/classes/${session.id}`}
      data-testid={`card-class-${session.id}`}
    >
      <Card className="hover-elevate active-elevate-2 transition cursor-pointer h-full">
        <CardContent className="pt-5 pb-5 flex flex-col gap-3 h-full">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <Badge variant="outline" className="mb-2 text-[10px]">
                {formatCertificationType(session.certificationType)}
              </Badge>
              <h3 className="font-semibold text-base leading-tight">
                {session.title}
              </h3>
            </div>
            <Badge variant={STATUS_VARIANT[session.status] ?? "default"}>
              {session.status}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{formatDate(session.date)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {formatTime(session.startTime)}
                {session.endTime ? ` – ${formatTime(session.endTime)}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{session.location}</span>
            </div>
            {session.instructorName && (
              <div className="flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5" />
                <span className="truncate">{session.instructorName}</span>
              </div>
            )}
          </div>
          <div className="mt-auto flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span
                className={
                  full ? "text-destructive font-medium" : "text-muted-foreground"
                }
              >
                {session.enrolledCount} / {session.capacity}
                {full ? " · full" : ` · ${remaining} open`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
