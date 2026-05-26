import { useState } from "react";
import {
  useListRequests,
  useCreateRequest,
  useUpdateRequest,
  getListRequestsQueryKey,
  getGetAdminDashboardQueryKey,
  getGetRequestorDashboardQueryKey,
  type CertificationType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { Plus, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCertificationType, formatDate, timeAgo } from "@/lib/format";

const CERT_TYPES: CertificationType[] = [
  "adult_cpr",
  "pediatric_cpr",
  "cpr_aed",
  "bls",
  "first_aid",
];

function NewRequestDialog({ requestorId }: { requestorId: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    requestorId,
    organizationName: "",
    contactEmail: "",
    contactPhone: "",
    certificationType: "cpr_aed" as CertificationType,
    preferredDate: "",
    preferredLocation: "",
    attendeeCount: 10,
    notes: "",
  });
  const create = useCreateRequest({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListRequestsQueryKey() });
        qc.invalidateQueries({
          queryKey: getGetRequestorDashboardQueryKey(requestorId),
        });
        toast({ title: "Request submitted" });
        setOpen(false);
      },
      onError: () =>
        toast({ title: "Could not submit request", variant: "destructive" }),
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-new-request">
          <Plus className="h-4 w-4 mr-1.5" /> New request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request a training session</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Organization</Label>
            <Input
              data-testid="input-org"
              value={form.organizationName}
              onChange={(e) =>
                setForm({ ...form, organizationName: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Contact email</Label>
              <Input
                type="email"
                data-testid="input-email"
                value={form.contactEmail}
                onChange={(e) =>
                  setForm({ ...form, contactEmail: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Contact phone</Label>
              <Input
                value={form.contactPhone ?? ""}
                onChange={(e) =>
                  setForm({ ...form, contactPhone: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Certification</Label>
              <Select
                value={form.certificationType}
                onValueChange={(v) =>
                  setForm({ ...form, certificationType: v as CertificationType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CERT_TYPES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {formatCertificationType(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preferred date</Label>
              <Input
                type="date"
                data-testid="input-pref-date"
                value={form.preferredDate}
                onChange={(e) =>
                  setForm({ ...form, preferredDate: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Location</Label>
              <Input
                value={form.preferredLocation}
                onChange={(e) =>
                  setForm({ ...form, preferredLocation: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Attendees</Label>
              <Input
                type="number"
                value={form.attendeeCount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    attendeeCount: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            data-testid="button-submit-request"
            disabled={
              !form.organizationName ||
              !form.contactEmail ||
              !form.preferredDate ||
              !form.preferredLocation ||
              create.isPending
            }
            onClick={() => create.mutate({ data: form })}
          >
            Submit request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Requests() {
  const qc = useQueryClient();
  const { role, userId } = useAuth();
  const params = role === "requestor" && userId ? { requestorId: userId } : undefined;
  const { data: requests = [] } = useListRequests(params);
  const update = useUpdateRequest({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListRequestsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() });
        toast({ title: "Request updated" });
      },
    },
  });

  const canCreate = role === "requestor" && userId;
  return (
    <>
      <PageHeader
        title={role === "requestor" ? "My requests" : "Training requests"}
        subtitle={
          role === "requestor"
            ? "Track the status of training you've requested for your organization."
            : "Incoming training requests from organizations."
        }
        action={canCreate ? <NewRequestDialog requestorId={userId!} /> : null}
      />
      {requests.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground text-center">
            No requests yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id} data-testid={`card-request-${r.id}`}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
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
                      <Badge variant="outline">
                        {formatCertificationType(r.certificationType)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(r.createdAt)}
                      </span>
                    </div>
                    <h3 className="font-semibold">{r.organizationName}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {r.attendeeCount} attendees · preferred{" "}
                      {formatDate(r.preferredDate)} at {r.preferredLocation}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {r.contactEmail}
                      {r.contactPhone ? ` · ${r.contactPhone}` : ""}
                    </p>
                    {r.notes && (
                      <p className="text-sm mt-2 italic text-foreground/80 border-l-2 border-border pl-3">
                        "{r.notes}"
                      </p>
                    )}
                  </div>
                  {role === "administrator" && r.status === "pending" && (
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        data-testid={`button-approve-${r.id}`}
                        onClick={() =>
                          update.mutate({
                            requestId: r.id,
                            data: { status: "approved" },
                          })
                        }
                      >
                        <Check className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`button-reject-${r.id}`}
                        onClick={() =>
                          update.mutate({
                            requestId: r.id,
                            data: { status: "rejected" },
                          })
                        }
                      >
                        <X className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
