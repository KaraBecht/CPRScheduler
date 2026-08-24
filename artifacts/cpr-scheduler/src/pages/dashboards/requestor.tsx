import { useAuth } from "@/lib/auth-context";
import { useGetRequestorDashboard } from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { ClassCard } from "@/components/ClassCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Inbox, CheckCircle2, Building2, Plus } from "lucide-react";
import { formatCertificationType, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export function RequestorDashboardPage() {
  const { userId } = useAuth();
  const { data: dash } = useGetRequestorDashboard(userId ?? 0, {
    query: { enabled: !!userId } as any,
  });
  if (!dash) {
    return <PageHeader title="Your requests" subtitle="Loading..." />;
  }
  return (
    <>
      <PageHeader
        title={dash.requestor.organization ?? dash.requestor.name}
        subtitle="Submit new training requests and track scheduled sessions for your team."
        action={
          <Link href="/requests">
            <Button data-testid="button-new-request">
              <Plus className="h-4 w-4 mr-1.5" /> New request
            </Button>
          </Link>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Inquiries"
          value={dash.pendingCount}
          icon={Inbox}
          tone="warning"
        />
        <StatCard
          label="Scheduled / approved"
          value={dash.approvedCount}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Total requests"
          value={dash.requests.length}
          icon={Building2}
        />
      </div>

      {dash.scheduledClasses.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-3">Scheduled for your team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {dash.scheduledClasses.map((c) => (
              <ClassCard key={c.id} session={c} />
            ))}
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent requests</CardTitle>
        </CardHeader>
        <CardContent>
          {dash.requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No requests yet. Submit one to get started.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {dash.requests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start gap-3 py-3"
                  data-testid={`req-row-${r.id}`}
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
                    <p className="font-medium text-sm">
                      {formatCertificationType(r.certificationType)} ·{" "}
                      {r.attendeeCount} attendees
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Preferred {formatDate(r.preferredDate)} at{" "}
                      {r.preferredLocation}
                    </p>
                    {r.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        "{r.notes}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
