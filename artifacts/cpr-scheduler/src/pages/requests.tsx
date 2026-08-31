import { useState } from "react";
import {
  useListRequests,
  useCreateRequest,
  useListInquiries,
  useCreateInquiry,
  useUpdateInquiry,
  useUpdateInquiryPersonStatus,
  useDeleteInquiry,
  useUpdateRequest,
  getListRequestsQueryKey,
  getListInquiriesQueryKey,
  getListClassesQueryKey,
  getGetAdminDashboardQueryKey,
  getGetRequestorDashboardQueryKey,
  type CertificationType,
  type ClassRequest,
  type TrainingInquiry,
  type TrainingInquiryPersonStatus,
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { Plus, Check, X, Share2, Copy, CheckCheck, Trash2, CalendarDays, Download, Upload, ClipboardList, Phone, Mail, Building2, MapPin, Archive, ArchiveRestore } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { formatCertificationType, formatDate, timeAgo } from "@/lib/format";
import { downloadCsv } from "@/lib/export-csv";
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

function NewInterestDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    people: [{ name: "", phone: "", email: "", status: "interested" as const }],
    division: "",
    location: "",
    note: "",
  });

  const create = useCreateInquiry({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListInquiriesQueryKey() });
        setForm({
          people: [{ name: "", phone: "", email: "", status: "interested" as const }],
          division: "",
          location: "",
          note: "",
        });
        setOpen(false);
        toast({ title: "Interest saved" });
      },
      onError: () =>
        toast({ title: "Could not save interest", variant: "destructive" }),
    },
  });

  const canSave =
    form.people.length > 0 &&
    form.people.every(
      (person) => person.name.trim() && person.email.trim(),
    ) &&
    form.division.trim() &&
    form.location.trim() &&
    !create.isPending;

  function updatePerson(index: number, field: "name" | "phone" | "email", value: string) {
    setForm((current) => ({
      ...current,
      people: current.people.map((person, personIndex) =>
        personIndex === index ? { ...person, [field]: value } : person,
      ),
    }));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-new-interest">
          <Plus className="h-4 w-4 mr-1.5" /> New interest
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>New training interest</DialogTitle>
          <DialogDescription>
            Save contact details so the team can follow up and create a full training request later.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>People</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="button-add-interest-person"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    people: [
                      ...current.people,
                      { name: "", phone: "", email: "", status: "interested" as const },
                    ],
                  }))
                }
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add person
              </Button>
            </div>
            {form.people.map((person, index) => (
              <div key={index} className="rounded-md border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Person {index + 1}</span>
                  {form.people.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove person ${index + 1}`}
                      data-testid={`button-remove-interest-person-${index}`}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          people: current.people.filter((_, personIndex) => personIndex !== index),
                        }))
                      }
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <div>
                  <Label htmlFor={`inquiry-name-${index}`}>Name</Label>
                  <Input
                    id={`inquiry-name-${index}`}
                    data-testid={index === 0 ? "input-interest-name" : `input-interest-name-${index}`}
                    placeholder="Contact name"
                    value={person.name}
                    onChange={(e) => updatePerson(index, "name", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`inquiry-phone-${index}`}>
                    Phone number <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id={`inquiry-phone-${index}`}
                    type="tel"
                    data-testid={index === 0 ? "input-interest-phone" : `input-interest-phone-${index}`}
                    placeholder="(555) 555-5555"
                    value={person.phone}
                    onChange={(e) => updatePerson(index, "phone", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`interest-email-${index}`}>Email</Label>
                  <Input
                    id={`interest-email-${index}`}
                    type="email"
                    data-testid={index === 0 ? "input-interest-email" : `input-interest-email-${index}`}
                    placeholder="name@company.com"
                    value={person.email}
                    onChange={(e) => updatePerson(index, "email", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
          <div>
            <Label htmlFor="inquiry-division">Division</Label>
            <Input
              id="inquiry-division"
              data-testid="input-inquiry-division"
              placeholder="e.g. FOX Sports"
              value={form.division}
              onChange={(e) => setForm({ ...form, division: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="inquiry-location">Location</Label>
            <Input
              id="inquiry-location"
              data-testid="input-inquiry-location"
              placeholder="Site or facility"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="interest-note">
              Note <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="interest-note"
              data-testid="input-interest-note"
              placeholder="Add any helpful context for follow-up"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={3}
            />
          </div>
          </div>
        </div>
        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            data-testid="button-save-interest"
            disabled={!canSave}
            onClick={() =>
              create.mutate({
                data: {
                  name: form.people[0].name.trim(),
                  phone: form.people[0].phone.trim(),
                  division: form.division.trim(),
                  location: form.location.trim(),
                  note: form.note.trim(),
                  people: form.people.map((person) => ({
                    name: person.name.trim(),
                    phone: person.phone.trim(),
                    email: person.email.trim(),
                  })),
                },
              })
            }
          >
            {create.isPending ? "Saving…" : "Save interest"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const INTEREST_PERSON_STATUS_OPTIONS: {
  value: TrainingInquiryPersonStatus;
  label: string;
}[] = [
  { value: "interested", label: "Interested" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "not_interested", label: "No longer interested" },
];

type InterestFilter = "active" | TrainingInquiryPersonStatus | "archived";

const INTEREST_FILTER_OPTIONS: { value: InterestFilter; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "interested", label: "Interested" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "not_interested", label: "No longer interested" },
  { value: "archived", label: "Archived" },
];

function interestStatusLabel(status: TrainingInquiryPersonStatus): string {
  return (
    INTEREST_PERSON_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status
  );
}

function getInterestStatusCounts(interest: TrainingInquiry) {
  return INTEREST_PERSON_STATUS_OPTIONS.map((option) => ({
    ...option,
    count: interest.people.filter((person) => person.status === option.value).length,
  })).filter((option) => option.count > 0);
}

const INTEREST_EXPORT_HEADERS = [
  "Person name",
  "Phone",
  "Email",
  "Person status",
  "Division",
  "Location",
  "Note",
  "Archived",
  "Saved at",
];

function exportTrainingInterests(interests: TrainingInquiry[], filename: string) {
  downloadCsv(
    filename,
    INTEREST_EXPORT_HEADERS,
    interests.flatMap((interest) =>
      interest.people.map((person) => [
        person.name,
        person.phone,
        person.email,
        interestStatusLabel(person.status),
        interest.division,
        interest.location,
        interest.note,
        interest.archivedAt ? "Yes" : "No",
        interest.createdAt,
      ]),
    ),
  );
}

function TrainingInterestDialog({
  interest,
  onOpenChange,
  onInterestUpdated,
  onDeleted,
}: {
  interest: TrainingInquiry | null;
  onOpenChange: (open: boolean) => void;
  onInterestUpdated: (interest: TrainingInquiry) => void;
  onDeleted: () => void;
}) {
  const qc = useQueryClient();
  const updatePersonStatus = useUpdateInquiryPersonStatus({
    mutation: {
      onError: () =>
        toast({ title: "Could not update person status", variant: "destructive" }),
    },
  });
  const updateInterest = useUpdateInquiry({
    mutation: {
      onError: () =>
        toast({ title: "Could not update interest", variant: "destructive" }),
    },
  });
  const deleteInterest = useDeleteInquiry({
    mutation: {
      onError: () =>
        toast({ title: "Could not delete interest", variant: "destructive" }),
    },
  });

  function refreshInterest(updated: TrainingInquiry) {
    onInterestUpdated(updated);
    qc.invalidateQueries({ queryKey: getListInquiriesQueryKey() });
  }

  function changePersonStatus(personIndex: number, status: TrainingInquiryPersonStatus) {
    if (!interest) return;
    updatePersonStatus.mutate(
      {
        inquiryId: interest.id,
        personIndex,
        data: { status },
      },
      {
        onSuccess: (updated) => {
          refreshInterest(updated);
          toast({ title: `Person marked ${interestStatusLabel(status).toLowerCase()}` });
        },
      },
    );
  }

  function toggleArchived() {
    if (!interest) return;
    const willArchive = !interest.archivedAt;
    updateInterest.mutate(
      {
        inquiryId: interest.id,
        data: { archived: willArchive },
      },
      {
        onSuccess: (updated) => {
          refreshInterest(updated);
          toast({ title: willArchive ? "Interest archived" : "Interest restored" });
          if (willArchive) onOpenChange(false);
        },
      },
    );
  }

  function permanentlyDelete() {
    if (!interest) return;
    deleteInterest.mutate(
      { inquiryId: interest.id, data: { confirm: "DELETE" } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListInquiriesQueryKey() });
          onDeleted();
          toast({ title: "Interest deleted" });
        },
      },
    );
  }

  return (
    <Dialog open={interest !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
        {interest && (
          <>
            <DialogHeader>
              <DialogTitle>Training interest</DialogTitle>
              <DialogDescription>
                Review the people and shared details saved for this interest.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      {interest.people.length} {interest.people.length === 1 ? "person" : "people"}
                    </h3>
                    {interest.archivedAt && <Badge variant="secondary">Archived</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(interest.createdAt)}
                  </span>
                </div>
                <div className="space-y-3">
                  {interest.people.map((person, index) => (
                    <div key={`${person.phone}-${index}`} className="rounded-md border p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">Person {index + 1}</p>
                        <Select
                          value={person.status}
                          onValueChange={(value) =>
                            changePersonStatus(index, value as TrainingInquiryPersonStatus)
                          }
                          disabled={updatePersonStatus.isPending}
                        >
                          <SelectTrigger
                            className="h-8 w-44"
                            data-testid={`select-interest-person-status-${index}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INTEREST_PERSON_STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Name</p>
                          <p>{person.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Phone number</p>
                          <a className="hover:underline" href={`tel:${person.phone}`}>
                            {person.phone}
                          </a>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-xs text-muted-foreground">Email</p>
                          {person.email ? (
                            <a className="hover:underline" href={`mailto:${person.email}`}>
                              {person.email}
                            </a>
                          ) : (
                            <p className="text-muted-foreground">Not provided</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Division</p>
                    <p className="text-sm font-medium mt-1">{interest.division}</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium mt-1">{interest.location}</p>
                  </div>
                </div>
                {interest.note && (
                  <div className="rounded-md border border-dashed p-3">
                    <p className="text-xs text-muted-foreground">Note</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{interest.note}</p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="shrink-0 flex-wrap">
              <Button
                variant="outline"
                onClick={() =>
                  exportTrainingInterests(
                    [interest],
                    `training-interest-${interest.id}-${interest.createdAt.slice(0, 10)}.csv`,
                  )
                }
                data-testid="button-export-interest"
              >
                <Download className="h-4 w-4 mr-1.5" /> Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={toggleArchived}
                disabled={updateInterest.isPending}
                data-testid={interest.archivedAt ? "button-restore-interest" : "button-archive-interest"}
              >
                {interest.archivedAt ? (
                  <ArchiveRestore className="h-4 w-4 mr-1.5" />
                ) : (
                  <Archive className="h-4 w-4 mr-1.5" />
                )}
                {interest.archivedAt ? "Restore" : "Archive"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={deleteInterest.isPending}
                    data-testid="button-delete-interest"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this training interest?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes the interest and every person on it. This action
                      cannot be undone. Archive it instead if you may need the record later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={permanentlyDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-testid="button-confirm-delete-interest"
                    >
                      Permanently delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

type SessionRow = { date: string; startTime: string; status: string; included: boolean };

const SESSION_STATUS_OPTIONS = [
  { value: "confirmed",       label: "Confirmed" },
  { value: "pending_schedule", label: "Inquiry" },
  { value: "being_scheduled", label: "Scheduling" },
  { value: "completed",       label: "Completed" },
];

function ApproveRequestDialog({
  request,
  onApprove,
  isPending,
}: {
  request: ClassRequest;
  onApprove: (selectedSessions: { date: string; startTime: string; status: string }[]) => void;
  isPending: boolean;
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
        <Button
          size="sm"
          data-testid={`button-approve-${request.id}`}
          disabled={isPending}
        >
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
          <Button onClick={confirm} disabled={approved.length === 0 || isPending}>
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
  const { data: inquiries = [] } = useListInquiries({
    query: {
      enabled: role === "administrator",
      queryKey: getListInquiriesQueryKey(),
    },
  });
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
  const [selectedInterest, setSelectedInterest] = useState<TrainingInquiry | null>(null);
  const [interestFilter, setInterestFilter] = useState<InterestFilter>("active");
  const filteredInquiries = inquiries.filter((inquiry) => {
    if (interestFilter === "archived") return inquiry.archivedAt !== null;
    if (inquiry.archivedAt !== null) return false;
    if (interestFilter === "active") return true;
    return inquiry.people.some((person) => person.status === interestFilter);
  });
  const archivedInterestCount = inquiries.filter((inquiry) => inquiry.archivedAt !== null).length;
  const canCreate = role === "requestor" && userId;
  return (
    <>
      <ImportRequestModal open={importOpen} onOpenChange={setImportOpen} />
      <TrainingInterestDialog
        interest={selectedInterest}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedInterest(null);
        }}
        onInterestUpdated={setSelectedInterest}
        onDeleted={() => setSelectedInterest(null)}
      />
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
            {role === "administrator" && <NewInterestDialog />}
            {canCreate ? <NewRequestDialog requestorId={userId!} /> : null}
          </div>
        }
      />
      {role === "administrator" && inquiries.length > 0 && (
        <section className="mb-6" aria-labelledby="inquiries-heading">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 id="inquiries-heading" className="text-lg font-semibold">
                Training interests
              </h2>
              <p className="text-sm text-muted-foreground">
                Contact details saved for follow-up before a full request is created.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {filteredInquiries.length}{" "}
                {filteredInquiries.length === 1 ? "interest" : "interests"}
              </span>
              <Select
                value={interestFilter}
                onValueChange={(value) => setInterestFilter(value as InterestFilter)}
              >
                <SelectTrigger
                  className="h-9 w-48"
                  data-testid="select-interest-filter"
                  aria-label="Filter training interests"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTEREST_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                      {option.value === "archived" && archivedInterestCount > 0
                        ? ` (${archivedInterestCount})`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  exportTrainingInterests(
                    inquiries,
                    `training-interests-${new Date().toISOString().slice(0, 10)}.csv`,
                  )
                }
                data-testid="button-export-interests"
              >
                <Download className="h-4 w-4 mr-1.5" /> Export CSV
              </Button>
            </div>
          </div>
          {filteredInquiries.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground text-center">
                No {INTEREST_FILTER_OPTIONS.find((option) => option.value === interestFilter)?.label.toLowerCase()} training interests.
              </CardContent>
            </Card>
          ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredInquiries.map((inquiry) => (
              <Card
                key={inquiry.id}
                className="cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid={`card-inquiry-${inquiry.id}`}
                role="button"
                tabIndex={0}
                aria-label={`Open training interest with ${inquiry.people.length} ${inquiry.people.length === 1 ? "person" : "people"}`}
                onClick={() => setSelectedInterest(inquiry)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedInterest(inquiry);
                  }
                }}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold">
                        {inquiry.people.length} {inquiry.people.length === 1 ? "person" : "people"}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {inquiry.archivedAt && <Badge variant="secondary">Archived</Badge>}
                        {getInterestStatusCounts(inquiry).map((status) => (
                          <Badge key={status.value} variant="outline">
                            {status.count} {status.label.toLowerCase()}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {inquiry.people.map((person, index) => (
                          <div key={`${person.phone}-${index}`} className="space-y-0.5 text-sm text-muted-foreground">
                            <p className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 shrink-0" />
                              <span>{person.name}</span>
                              <a
                                className="hover:underline"
                                href={`tel:${person.phone}`}
                                onClick={(event) => event.stopPropagation()}
                              >
                                {person.phone}
                              </a>
                            </p>
                            {person.email && (
                              <p className="flex items-center gap-1.5 pl-5">
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                <a
                                  className="hover:underline"
                                  href={`mailto:${person.email}`}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {person.email}
                                </a>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-xs whitespace-nowrap">
                      <div>{formatDate(inquiry.createdAt)}</div>
                      <div className="text-muted-foreground mt-0.5">{timeAgo(inquiry.createdAt)}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      {inquiry.division}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {inquiry.location}
                    </span>
                  </div>
                  {inquiry.note && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                      <span className="font-medium text-foreground">Note:</span> {inquiry.note}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          )}
        </section>
      )}
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
                        {r.status === "pending" ? "Inquiry" : r.status}
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
                        isPending={update.isPending}
                        onApprove={(selectedSessions) =>
                          update.mutate({
                            requestId: r.id,
                            data: { status: "approved", selectedSessions },
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
