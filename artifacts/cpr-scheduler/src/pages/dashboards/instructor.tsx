import { useAuth } from "@/lib/auth-context";
import { useGetInstructorDashboard } from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { ClassCard } from "@/components/ClassCard";
import { CalendarDays, Users, Award, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatTime } from "@/lib/format";

export function InstructorDashboardPage() {
  const { userId } = useAuth();
  const { data: dash } = useGetInstructorDashboard(userId ?? 0, {
    query: { enabled: !!userId } as any,
  });
  if (!dash) {
    return <PageHeader title="Instructor dashboard" subtitle="Loading..." />;
  }
  return (
    <>
      <PageHeader
        title={`Welcome back, ${dash.instructor.name.split(" ")[0]}`}
        subtitle="Your classes, students, and impact at a glance."
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Upcoming classes"
          value={dash.upcomingClasses.length}
          icon={CalendarDays}
          testId="stat-instructor-upcoming"
        />
        <StatCard
          label="Past classes"
          value={dash.pastClasses.length}
          icon={Clock}
          tone="primary"
        />
        <StatCard
          label="Students taught"
          value={dash.totalStudentsTaught}
          icon={Users}
          tone="accent"
        />
        <StatCard
          label="Certificates issued"
          value={dash.totalCertificatesIssued}
          icon={Award}
          tone="success"
        />
      </div>

      {dash.nextClass && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Next class
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-lg">{dash.nextClass.title}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDate(dash.nextClass.date)} ·{" "}
              {formatTime(dash.nextClass.startTime)} ·{" "}
              {dash.nextClass.location}
            </p>
            <p className="text-sm mt-2">
              <span className="font-medium">{dash.nextClass.enrolledCount}</span>{" "}
              of {dash.nextClass.capacity} students enrolled
            </p>
          </CardContent>
        </Card>
      )}

      <h2 className="text-lg font-semibold mb-3">Your upcoming classes</h2>
      {dash.upcomingClasses.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground text-center">
            No upcoming classes assigned to you.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {dash.upcomingClasses.map((c) => (
            <ClassCard key={c.id} session={c} />
          ))}
        </div>
      )}

      {dash.pastClasses.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3">Recently taught</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dash.pastClasses.slice(0, 6).map((c) => (
              <ClassCard key={c.id} session={c} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
