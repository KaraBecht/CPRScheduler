import { useMemo, useState } from "react";
import { useListCertificates, type Certificate } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Award, MapPin, BookOpen, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCertificationType, formatDate } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Cert = Certificate;

type GroupBy = "none" | "location" | "expiration";

/**
 * For each unique (studentName, certificationType) pair keep only the
 * certificate with the latest expiryDate. This prevents duplicates when
 * a student attends a renewal class — they get one card showing their
 * current (newest) certification.
 */
function deduplicateCerts(certs: Cert[]): Cert[] {
  const map = new Map<string, Cert>();
  for (const c of certs) {
    const key = `${c.studentName.toLowerCase().trim()}||${c.certificationType}`;
    const existing = map.get(key);
    if (!existing || c.expiryDate > existing.expiryDate) {
      map.set(key, c);
    }
  }
  return Array.from(map.values());
}

const EXPIRATION_ORDER = ["Expired", "Expiring soon", "Valid"] as const;

function expirationBucket(expiryDate: string): (typeof EXPIRATION_ORDER)[number] {
  const now = new Date();
  const expiry = new Date(
    expiryDate + (expiryDate.length === 10 ? "T00:00:00" : ""),
  );
  const daysUntil = (expiry.getTime() - now.getTime()) / 86_400_000;
  if (daysUntil < 0) return "Expired";
  if (daysUntil <= 60) return "Expiring soon";
  return "Valid";
}

function expirationBadgeClasses(bucket: string): string {
  switch (bucket) {
    case "Expired":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "Expiring soon":
      return "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400";
    default:
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400";
  }
}

function groupCerts(
  certs: Cert[],
  groupBy: GroupBy,
): Array<{ key: string; label: string; certs: Cert[] }> {
  if (groupBy === "none") {
    return [{ key: "all", label: "", certs }];
  }

  const buckets = new Map<string, Cert[]>();
  for (const c of certs) {
    const key =
      groupBy === "location"
        ? c.classLocation?.trim() || "No location on file"
        : expirationBucket(c.expiryDate);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(c);
  }

  const entries = Array.from(buckets.entries()).map(([key, list]) => ({
    key,
    label: key,
    certs: list,
  }));

  if (groupBy === "expiration") {
    entries.sort(
      (a, b) =>
        EXPIRATION_ORDER.indexOf(a.key as (typeof EXPIRATION_ORDER)[number]) -
        EXPIRATION_ORDER.indexOf(b.key as (typeof EXPIRATION_ORDER)[number]),
    );
  } else {
    entries.sort((a, b) => a.label.localeCompare(b.label));
  }

  return entries;
}

export default function Certificates() {
  const { role, userId } = useAuth();
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const { data: certs = [] } = useListCertificates(
    role === "student" && userId ? { studentId: userId } : undefined,
  );

  const dedupedCerts = useMemo(() => deduplicateCerts(certs), [certs]);
  const groups = useMemo(() => groupCerts(dedupedCerts, groupBy), [dedupedCerts, groupBy]);

  return (
    <>
      <PageHeader
        title={role === "student" ? "My certificates" : "All certificates"}
        subtitle="Verified completion records for CPR & first aid training."
      />
      {certs.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Group by</span>
          <Select
            value={groupBy}
            onValueChange={(v) => setGroupBy(v as GroupBy)}
          >
            <SelectTrigger className="w-44" data-testid="select-group-by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="location">Location</SelectItem>
              <SelectItem value="expiration">Expiration</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {certs.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground text-center">
            No certificates yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.key}>
              {group.label && (
                <div className="flex items-center gap-2 mb-3">
                  {groupBy === "expiration" ? (
                    <Badge
                      variant="outline"
                      className={expirationBadgeClasses(group.label)}
                    >
                      {group.label}
                    </Badge>
                  ) : (
                    <h3 className="text-sm font-semibold flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {group.label}
                    </h3>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {group.certs.length}{" "}
                    {group.certs.length === 1 ? "certificate" : "certificates"}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.certs.map((c) => (
                  <Card key={c.id} data-testid={`cert-${c.id}`}>
                    <CardContent className="pt-5">
                      <div className="flex items-start gap-4">
                        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-fuchsia-500 text-white flex items-center justify-center flex-shrink-0">
                          <Award className="h-7 w-7" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Badge variant="outline" className="mb-1">
                            {formatCertificationType(c.certificationType)}
                          </Badge>
                          <p className="font-semibold">{c.studentName}</p>
                          {c.classTitle && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                              <BookOpen className="h-3 w-3" />
                              <span className="truncate">{c.classTitle}</span>
                            </p>
                          )}
                          {c.classLocation && (
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{c.classLocation}</span>
                            </p>
                          )}
                          <p className="text-xs mt-1">
                            <span className="text-muted-foreground">
                              Issued {formatDate(c.issuedDate)} · expires{" "}
                            </span>
                            <span
                              className={
                                expirationBucket(c.expiryDate) === "Expired"
                                  ? "font-semibold text-destructive"
                                  : "text-muted-foreground"
                              }
                            >
                              {formatDate(c.expiryDate)}
                            </span>
                          </p>
                          <p className="text-xs font-mono text-muted-foreground mt-1">
                            {c.certificateNumber}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
