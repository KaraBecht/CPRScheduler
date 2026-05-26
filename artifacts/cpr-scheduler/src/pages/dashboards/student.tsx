import { useAuth } from "@/lib/auth-context";
import { useGetStudentDashboard } from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";
import { ClassCard } from "@/components/ClassCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, BookOpen, CalendarDays, CheckCircle2 } from "lucide-react";
import {
  formatCertificationType,
  formatDate,
  formatTime,
} from "@/lib/format";
import { StatCard } from "@/components/StatCard";

export function StudentDashboardPage() {
  const { userId } = useAuth();
  const { data: dash } = useGetStudentDashboard(userId ?? 0, {
    query: { enabled: !!userId } as any,
  });
  if (!dash) {
    return <PageHeader title="Your training" subtitle="Loading..." />;
  }
  return (
    <>
      <PageHeader
        title={`Hi, ${dash.student.name.split(" ")[0]}`}
        subtitle="Track your classes, certificates, and what's next."
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Upcoming classes"
          value={dash.upcomingEnrollments.length}
          icon={CalendarDays}
        />
        <StatCard
          label="Completed"
          value={dash.pastEnrollments.length}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Active certificates"
          value={dash.certificates.length}
          icon={Award}
          tone="accent"
        />
      </div>

      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <CalendarDays className="h-4 w-4" /> Your upcoming sessions
      </h2>
      {dash.upcomingEnrollments.length === 0 ? (
        <Card className="mb-6">
          <CardContent className="pt-6 text-sm text-muted-foreground text-center">
            You're not enrolled in any upcoming classes. Browse classes to sign up.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {dash.upcomingEnrollments.map(
            (e) => e.classSession && <ClassCard key={e.id} session={e.classSession} />,
          )}
        </div>
      )}

      {dash.certificates.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" /> Your certificates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {dash.certificates.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 py-3"
                  data-testid={`certificate-${c.id}`}
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {formatCertificationType(c.certificationType)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Issued {formatDate(c.issuedDate)} · expires{" "}
                      {formatDate(c.expiryDate)}
                    </p>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {c.certificateNumber}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {dash.recommendedClasses.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Recommended for you
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {dash.recommendedClasses.map((c) => (
              <ClassCard key={c.id} session={c} />
            ))}
          </div>
        </>
      )}

      {dash.pastEnrollments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Training history</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {dash.pastEnrollments.map((e) =>
                e.classSession ? (
                  <div key={e.id} className="flex items-center gap-3 py-2.5">
                    <Badge variant="secondary">{e.status}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {e.classSession.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(e.classSession.date)} ·{" "}
                        {formatTime(e.classSession.startTime)}
                      </p>
                    </div>
                    {e.certificateIssued && (
                      <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/20">
                        <Award className="h-3 w-3 mr-1" /> Certified
                      </Badge>
                    )}
                  </div>
                ) : null,
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
