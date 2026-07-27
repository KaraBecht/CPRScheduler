import { useMemo, useState } from "react";
import { useListCertificates, type Certificate } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Award, MapPin, BookOpen, Building2, LayoutGrid, List, LayoutList, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCertificationType, formatDate } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { downloadCsv, isoToDate } from "@/lib/export-csv";
import { Button } from "@/components/ui/button";

type Cert = Certificate;

type GroupBy = "none" | "location" | "expiration";
type ActiveFilter = "all" | "active";
type ViewMode = "card" | "list";
const ALL_BU = "__all__";

const BUSINESS_UNITS = [
  "Fox Corp",
  "FOX Entertainment",
  "FOX News Media",
  "FOX Sports",
  "FOX Television Stations",
] as const;

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
  if (daysUntil <= 120) return "Expiring soon";
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

function CertCard({ c }: { c: Cert }) {
  const bucket = expirationBucket(c.expiryDate);
  return (
    <Card data-testid={`cert-${c.id}`}>
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
                  bucket === "Expired"
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
  );
}

function CertRow({ c }: { c: Cert }) {
  const bucket = expirationBucket(c.expiryDate);
  return (
    <tr
      data-testid={`cert-${c.id}`}
      className="border-b last:border-0 hover:bg-muted/40 transition-colors"
    >
      <td className="py-2.5 px-3">
        <p className="font-medium text-sm">{c.studentName}</p>
        <p className="text-xs font-mono text-muted-foreground">{c.certificateNumber}</p>
      </td>
      <td className="py-2.5 px-3">
        <Badge variant="outline" className="whitespace-nowrap">
          {formatCertificationType(c.certificationType)}
        </Badge>
      </td>
      <td className="py-2.5 px-3 text-sm text-muted-foreground hidden md:table-cell">
        {c.classLocation ?? "—"}
      </td>
      <td className="py-2.5 px-3 text-sm text-muted-foreground hidden sm:table-cell">
        {formatDate(c.issuedDate)}
      </td>
      <td className="py-2.5 px-3 text-sm">
        <span
          className={bucket === "Expired" ? "font-semibold text-destructive" : "text-muted-foreground"}
        >
          {formatDate(c.expiryDate)}
        </span>
      </td>
      <td className="py-2.5 px-3">
        <Badge
          variant="outline"
          className={cn("whitespace-nowrap text-xs", expirationBadgeClasses(bucket))}
        >
          {bucket}
        </Badge>
      </td>
    </tr>
  );
}

export default function Certificates() {
  const { role, userId } = useAuth();
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("active");
  const [view, setView] = useState<ViewMode>("card");
  const [buFilter, setBuFilter] = useState<string>(ALL_BU);

  const { data: certs = [] } = useListCertificates(
    role === "student" && userId ? { studentId: userId } : undefined,
  );

  const dedupedCerts = useMemo(() => deduplicateCerts(certs), [certs]);

  const filteredCerts = useMemo(() => {
    let list = activeFilter === "active"
      ? dedupedCerts.filter((c) => expirationBucket(c.expiryDate) !== "Expired")
      : dedupedCerts;
    if (buFilter !== ALL_BU) {
      list = list.filter((c) => c.classBusinessUnit === buFilter);
    }
    return list;
  }, [dedupedCerts, activeFilter, buFilter]);

  const groups = useMemo(
    () => groupCerts(filteredCerts, groupBy),
    [filteredCerts, groupBy],
  );

  const totalShown = filteredCerts.length;

  function exportCsv() {
    const today = new Date().toISOString().slice(0, 10);
    const buLabel = buFilter === ALL_BU ? "all" : buFilter.replace(/\s+/g, "-");
    const activeLabel = activeFilter === "active" ? "active" : "all";
    const filename = `certificates_${activeLabel}_${buLabel}_${today}.csv`;
    downloadCsv(
      filename,
      ["Student Name", "Certificate #", "Type", "Class Title", "Location", "Business Unit", "Issued Date", "Expiry Date", "Status"],
      filteredCerts.map((c) => [
        c.studentName,
        c.certificateNumber,
        c.certificationType,
        c.classTitle ?? "",
        c.classLocation ?? "",
        c.classBusinessUnit ?? "",
        isoToDate(c.issuedDate),
        isoToDate(c.expiryDate),
        expirationBucket(c.expiryDate),
      ]),
    );
  }
  const totalAll = dedupedCerts.length;

  return (
    <>
      <PageHeader
        title={role === "student" ? "My certificates" : "All certificates"}
        subtitle="Verified completion records for CPR & first aid training."
      />

      {certs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Active filter */}
          <Select
            value={activeFilter}
            onValueChange={(v) => setActiveFilter(v as ActiveFilter)}
          >
            <SelectTrigger className="w-44" data-testid="select-active-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="all">All certificates</SelectItem>
            </SelectContent>
          </Select>

          {/* Business unit filter */}
          <Select value={buFilter} onValueChange={setBuFilter}>
            <SelectTrigger className="w-52" data-testid="select-bu-filter">
              <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All business units" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_BU}>All business units</SelectItem>
              {BUSINESS_UNITS.map((bu) => (
                <SelectItem key={bu} value={bu}>{bu}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Group by */}
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Group by</span>
            <Select
              value={groupBy}
              onValueChange={(v) => setGroupBy(v as GroupBy)}
            >
              <SelectTrigger className="w-40" data-testid="select-group-by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="location">Location</SelectItem>
                <SelectItem value="expiration">Expiration</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            className="ml-auto gap-1.5"
            onClick={exportCsv}
            disabled={filteredCerts.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>

          {/* View toggle */}
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setView("card")}
              title="Card view"
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors",
                view === "card"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setView("list")}
              title="List view"
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l border-border",
                view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
          </div>
        </div>
      )}

      {/* Count line */}
      {certs.length > 0 && activeFilter === "active" && totalShown < totalAll && (
        <p className="text-xs text-muted-foreground mb-3">
          Showing {totalShown} active of {totalAll} total certificates
        </p>
      )}

      {filteredCerts.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground text-center">
            {certs.length === 0
              ? "No certificates yet."
              : "No active certificates — all have expired."}
          </CardContent>
        </Card>
      ) : view === "card" ? (
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
                  <CertCard key={c.id} c={c} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List view */
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
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Student</th>
                        <th className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                        <th className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Location</th>
                        <th className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Issued</th>
                        <th className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Expires</th>
                        <th className="py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.certs.map((c) => (
                        <CertRow key={c.id} c={c} />
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
