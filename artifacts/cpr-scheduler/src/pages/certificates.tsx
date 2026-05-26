import { useListCertificates } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCertificationType, formatDate } from "@/lib/format";

export default function Certificates() {
  const { role, userId } = useAuth();
  const { data: certs = [] } = useListCertificates(
    role === "student" && userId ? { studentId: userId } : undefined,
  );
  return (
    <>
      <PageHeader
        title={role === "student" ? "My certificates" : "All certificates"}
        subtitle="Verified completion records for CPR & first aid training."
      />
      {certs.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground text-center">
            No certificates yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certs.map((c) => (
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Issued {formatDate(c.issuedDate)} · expires{" "}
                      {formatDate(c.expiryDate)}
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
      )}
    </>
  );
}
