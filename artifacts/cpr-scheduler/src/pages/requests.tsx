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
  type ClassRequest,
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
import { Plus, Check, X, Share2, Copy, CheckCheck, Trash2, CalendarDays, Download, Upload, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { formatCertificationType, formatDate, timeAgo } from "@/lib/format";
import { TrainingRequestForm } from "@/components/TrainingRequestForm";
import { ImportRequestModal } from "@/components/ImportRequestModal";
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
          <ClipboardList className="h-4 w-4 mr-1.5" /> Enter training request
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

type SessionRow = { date: string; startTime: string; status: string; included: boolean };

const SESSION_STATUS_OPTIONS = [
  { value: "confirmed",       label: "Confirmed" },
  { value: "pending_schedule", label: "Pending" },
  { value: "being_scheduled", label: "Scheduling" },
  { value: "completed",       label: "Completed" },
];

function ApproveRequestDialog({
  request,
  onApprove,
}: {
  request: ClassRequest;
  onApprove: (sessions: { date: string; startTime: string; status: string }[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<SessionRow[]>([]);

  function handleOpenChange(v: boolean) {
    if (v) {
      const initial: SessionRow[] =
        request.sessions && request.sessions.length > 0
          ? request.sessions.map((s) => ({ date: s.date, startTime: s.startTime, status: "confirmed", included: true }))
          : [{ date: request.preferredDate, startTime: "09:00", status: "confirmed", included: true }];
      setRows(initial);
    }
    setOpen(v);
  }

  function toggle(i: number) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, included: !r.included } : r)));
  }

  function update(i: number, field: "date" | "startTime" | "status", value: string) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  function remove(i: number) {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
  }

  function addRow() {
    setRows((rs) => [...rs, { date: "", startTime: "09:00", status: "confirmed", included: true }]);
  }

  const approved = rows.filter((r) => r.included && r.date.trim());

  function confirm() {
    onApprove(approved.map(({ date, startTime, status }) => ({ date, startTime, status })));
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid={`button-approve-${request.id}`}>
          <Check className="h-3 w-3 mr-1" /> Approve
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Approve training request</DialogTitle>
        </DialogHeader>

        {/* Request context */}
        <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 text-sm space-y-0.5">
          <p className="font-semibold">{request.organizationName}</p>
          <p className="text-muted-foreground">
            {formatCertificationType(request.certificationType)} ·{" "}
            {request.attendeeCount} attendees per class
          </p>
          {request.address && (
            <p className="text-muted-foreground">{request.address}</p>
          )}
        </div>

        {/* Sessions list */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Sessions to schedule</p>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Toggle to include or exclude each date. Edit dates and times as needed, or add new sessions.
          </p>

          {rows.map((row, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
                row.included
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-muted/30 opacity-60",
              )}
            >
              {/* Include/exclude toggle */}
              <button
                type="button"
                onClick={() => toggle(i)}
                title={row.included ? "Exclude this session" : "Include this session"}
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-colors",
                  row.included
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground border border-border",
                )}
              >
                {row.included ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
              </button>

              {/* Date + Time */}
              <div className="flex gap-2 flex-1 min-w-0">
                <Input
                  type="date"
                  value={row.date}
                  onChange={(e) => update(i, "date", e.target.value)}
                  className="h-8 text-sm flex-1 min-w-0"
                  disabled={!row.included}
                />
                <Input
                  type="time"
                  value={row.startTime}
                  onChange={(e) => update(i, "startTime", e.target.value)}
                  className="h-8 text-sm w-24 shrink-0"
                  disabled={!row.included}
                />
              </div>

              {/* Status */}
              <Select
                value={row.status}
                onValueChange={(v) => update(i, "status", v)}
                disabled={!row.included}
              >
                <SelectTrigger className="h-8 text-sm w-32 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Remove */}
              <button
                type="button"
                onClick={() => remove(i)}
                title="Remove session"
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={addRow}
          >
            <Plus className="h-3.5 w-3.5" /> Add session
          </Button>
        </div>

        {/* Count preview */}
        <p className="text-sm text-muted-foreground border-t border-border pt-3">
          <span className="font-medium text-foreground">{approved.length}</span>{" "}
          session{approved.length !== 1 ? "s" : ""} will be scheduled
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={approved.length === 0}>
            <Check className="h-3.5 w-3.5 mr-1.5" />
            Approve{approved.length > 0 ? ` (${approved.length})` : ""}
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
  const { data: allRequests = [] } = useListRequests(params);
  const SCHEDULING_CLASS_STATUSES = ["pending_schedule", "being_scheduled"];
  const requests =
    role === "administrator"
      ? allRequests.filter(
          (r) =>
            r.status === "pending" ||
            (r.classStatus != null && SCHEDULING_CLASS_STATUSES.includes(r.classStatus)),
        )
      : allRequests;
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

  const [importOpen, setImportOpen] = useState(false);
  const canCreate = role === "requestor" && userId;
  return (
    <>
      <ImportRequestModal open={importOpen} onOpenChange={setImportOpen} />
      <PageHeader
        title={role === "requestor" ? "My requests" : "Training requests"}
        subtitle={
          role === "requestor"
            ? "Track the status of training you've requested for your organization."
            : "Incoming training requests from organizations."
        }
        action={
          <div className="flex gap-2">
            {role === "administrator" && (
              <a href={`${import.meta.env.BASE_URL}cpr-request-form.html`} download="CPR_Training_Request_Form.html">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-1.5" /> Offline form
                </Button>
              </a>
            )}
            {role === "administrator" && (
              <Button variant="outline" onClick={() => setImportOpen(true)} data-testid="button-import-request">
                <Upload className="h-4 w-4 mr-1.5" /> Import request
              </Button>
            )}
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
                      <ApproveRequestDialog
                        request={r}
                        onApprove={(sessions) =>
                          update.mutate({
                            requestId: r.id,
                            data: { status: "approved", sessions },
                          })
                        }
                      />
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
