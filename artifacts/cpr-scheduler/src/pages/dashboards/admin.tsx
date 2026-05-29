import {
  useGetAdminDashboard,
  useGetActivityFeed,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import {
  CalendarDays,
  Users,
  Inbox,
  Award,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClassCard } from "@/components/ClassCard";
import {
  formatCertificationType,
  formatDate,
  timeAgo,
} from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";

export function AdminDashboardPage() {
  const { data: dash, isLoading } = useGetAdminDashboard();
  const { data: activity = [] } = useGetActivityFeed();

  if (isLoading || !dash) {
    return (
      <>
        <PageHeader title="Operations dashboard" subtitle="Loading..." />
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </>
    );
  }

  const chartData = dash.classesByCertification.map((c) => ({
    name: formatCertificationType(c.certificationType).replace(" for Healthcare", ""),
    classes: c.count,
  }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Real-time view of classes, students, and incoming training requests."
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Upcoming classes"
          value={dash.upcomingClasses}
          hint={`${dash.totalClasses} total scheduled`}
          icon={CalendarDays}
          href="/classes"
          testId="stat-upcoming-classes"
        />
        <StatCard
          label="Active students"
          value={dash.totalStudents}
          hint={
            dash.totalStudents > 0
              ? "in class right now"
              : "no class in session"
          }
          icon={Users}
          tone="accent"
          href="/people?tab=student"
          testId="stat-students"
        />
        <StatCard
          label="Pending requests"
          value={dash.pendingRequests}
          hint="Awaiting scheduling"
          icon={Inbox}
          tone="warning"
          href="/requests"
          testId="stat-pending-requests"
        />
        <StatCard
          label="Certificates issued"
          value={dash.certificatesIssued}
          hint={`${dash.enrollmentsThisMonth} enrollments this month`}
          icon={Award}
          tone="success"
          href="/certificates"
          testId="stat-certificates"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">Classes by certification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: -20, right: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    dy={8}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="classes"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={52}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Live activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-72 overflow-y-auto pr-1">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              activity.slice(0, 10).map((e) => (
                <div
                  key={e.id}
                  className="flex gap-3"
                  data-testid={`activity-${e.id}`}
                >
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground/80 leading-snug">{e.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {timeAgo(e.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Upcoming schedule</h2>
          <Link
            href="/classes"
            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
            data-testid="link-view-all-classes"
          >
            View all classes →
          </Link>
        </div>
        {dash.upcomingSchedule.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground text-center">
              No upcoming classes scheduled.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dash.upcomingSchedule.slice(0, 6).map((s) => (
              <ClassCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Recent training requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dash.recentRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {dash.recentRequests.map((r) => (
                <Link
                  key={r.id}
                  href="/requests"
                  className="flex items-center gap-3 py-3 hover-elevate -mx-2 px-2 rounded-md"
                  data-testid={`request-row-${r.id}`}
                >
                  <Badge
                    variant={
                      r.status === "pending"
                        ? "default"
                        : r.status === "rejected"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {r.status}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {r.organizationName} —{" "}
                      {formatCertificationType(r.certificationType)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.attendeeCount} attendees · preferred{" "}
                      {formatDate(r.preferredDate)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
