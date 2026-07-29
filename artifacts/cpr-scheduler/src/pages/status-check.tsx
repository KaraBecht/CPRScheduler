import { useState } from "react";
import { useListRequests } from "@workspace/api-client-react";
import { HeartPulse, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCertificationType, formatDate, timeAgo } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Not approved",
  scheduled: "Scheduled",
};

function StatusCheckPage() {
  const [email, setEmail] = useState("");
  const [searchedEmail, setSearchedEmail] = useState<string | null>(null);

  const { data: requests = [], isFetching } = useListRequests(
    searchedEmail ? { email: searchedEmail } : undefined,
    { query: { enabled: !!searchedEmail, queryKey: ["status-check", searchedEmail] } },
  );

  const handleSearch = () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setSearchedEmail(trimmed);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
          <HeartPulse className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="font-bold text-base tracking-tight">PulsePoint</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            CPR Training Hub
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Check your request status
            </h1>
            <p className="text-muted-foreground mt-1">
              Enter the email you used when submitting your training request
              to see where things stand.
            </p>
          </div>

          <Card>
            <CardContent className="pt-6 flex flex-col md:flex-row items-end gap-3">
              <div className="w-full">
                <Label>Email address</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  data-testid="input-status-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button
                data-testid="button-check-status"
                disabled={!email.trim() || isFetching}
                onClick={handleSearch}
                className="w-full md:w-auto"
              >
                <Search className="h-4 w-4 mr-1.5" />
                {isFetching ? "Searching…" : "Check status"}
              </Button>
            </CardContent>
          </Card>

          {searchedEmail && !isFetching && (
            <div className="space-y-3">
              {requests.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-sm text-muted-foreground text-center">
                    No requests found for {searchedEmail}. Double-check the
                    email you submitted with.
                  </CardContent>
                </Card>
              ) : (
                requests.map((r) => (
                  <Card key={r.id} data-testid={`card-status-${r.id}`}>
                    <CardContent className="pt-5">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            r.status === "pending"
                              ? "default"
                              : r.status === "rejected"
                                ? "destructive"
                                : "secondary"
                          }
                          data-testid={`badge-status-${r.id}`}
                        >
                          {STATUS_LABEL[r.status] ?? r.status}
                        </Badge>
                        <Badge variant="outline">
                          {formatCertificationType(r.certificationType)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          submitted {timeAgo(r.createdAt)}
                        </span>
                      </div>
                      <h3 className="font-semibold">{r.organizationName}</h3>
                      {r.sessions && r.sessions.length > 0 ? (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Suggested:{" "}
                          {r.sessions
                            .map((s) => `${formatDate(s.date)} @ ${s.startTime}`)
                            .join(" · ")}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Preferred {formatDate(r.preferredDate)} at{" "}
                          {r.preferredLocation}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function StatusCheck() {
  return <StatusCheckPage />;
}
