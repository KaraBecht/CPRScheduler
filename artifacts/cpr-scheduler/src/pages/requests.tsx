import { useState } from "react";
import {
  useListRequests,
  useCreateRequest,
  useUpdateRequest,
  getListRequestsQueryKey,
  getListClassesQueryKey,
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
import { Plus, Check, X, Send, Share2, Copy, CheckCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCertificationType, formatDate, timeAgo } from "@/lib/format";
import { TrainingRequestForm } from "@/components/TrainingRequestForm";
import { QRCodeSVG } from "qrcode.react";

const CERT_TYPES: CertificationType[] = [
  "cpr_aed_first_aid",
  "stop_the_bleed",
  "cpr_aed_first_aid_stop_the_bleed",
];

function ShareIntakeDialog() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const intakeUrl = `${window.location.origin}${import.meta.env.BASE_URL}intake`;

  function handleCopy() {
    navigator.clipboard.writeText(intakeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-share-intake">
          <Share2 className="h-4 w-4 mr-1.5" /> Share intake form
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Share intake form</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Send this link to clients so they can submit a training request
          directly.
        </p>
        <div className="flex items-center gap-2">
          <Input
            readOnly
            value={intakeUrl}
            className="text-xs font-mono"
            data-testid="input-intake-url"
            onFocus={(e) => e.target.select()}
          />
          <Button
            size="icon"
            variant="outline"
            onClick={handleCopy}
            data-testid="button-copy-intake-url"
            aria-label="Copy link"
          >
            {copied ? (
              <CheckCheck className="h-4 w-4 text-emerald-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex justify-center pt-2 pb-1">
          <div className="p-3 border border-border rounded-lg bg-white">
            <QRCodeSVG
              value={intakeUrl}
              size={180}
              data-testid="qr-code-intake"
            />
          </div>
        </div>
        <p className="text-xs text-center text-muted-foreground">
          Screenshot the QR code to share at events or in print materials.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewRequestDialog({ requestorId }: { requestorId: number }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    requestorId,
    organizationName: "",
    contactEmail: "",
    contactPhone: "",
    certificationType: "cpr_aed_first_aid" as CertificationType,
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

function SendTrainingRequestDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-send-training-request">
          <Send className="h-4 w-4 mr-1.5" /> Send training request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send a training request</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Tell us where you'd like CPR training and when works best. We'll route
          this to our team.
        </p>
        <TrainingRequestForm
          onSuccess={() => {
            setOpen(false);
            toast({
              title: "Training request submitted",
              description:
                "Your request has been received. Check your inbox for a confirmation email — we'll follow up shortly to finalize the schedule.",
            });
          }}
          onCancel={() => setOpen(false)}
        />
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
        qc.invalidateQueries({ queryKey: getListClassesQueryKey() });
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
        action={
          <div className="flex gap-2">
            {role === "administrator" && <ShareIntakeDialog />}
            <SendTrainingRequestDialog />
            {canCreate ? <NewRequestDialog requestorId={userId!} /> : null}
          </div>
        }
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
                    {r.address && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {r.address}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {r.numberOfClasses}{" "}
                      {r.numberOfClasses === 1 ? "class" : "classes"} ·{" "}
                      {r.attendeeCount} attendees per class
                    </p>
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
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {r.requestorName} · {r.contactEmail}
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
