import { useState } from "react";
import {
  useSubmitTrainingRequest,
  getListRequestsQueryKey,
  getGetAdminDashboardQueryKey,
  type CertificationType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCertificationType, certificationDuration } from "@/lib/format";

const CERT_TYPES: CertificationType[] = [
  "cpr_aed_first_aid",
  "stop_the_bleed",
  "cpr_aed_first_aid_stop_the_bleed",
];

const BUSINESS_UNITS = [
  "FOX Digital",
  "Fox Corp",
  "FOX Entertainment",
  "FOX News Media",
  "FOX Sports",
  "FOX Studio Lot",
  "FOX Television Stations",
];

type Session = { date: string; startTime: string };

interface TrainingRequestFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export function TrainingRequestForm({ onSuccess, onCancel }: TrainingRequestFormProps) {
  const qc = useQueryClient();
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [requestorName, setRequestorName] = useState("");
  const [requestorEmail, setRequestorEmail] = useState("");
  const [requestorPhone, setRequestorPhone] = useState("");
  const [certificationType, setCertificationType] =
    useState<CertificationType>("cpr_aed_first_aid");
  const [numberOfClasses, setNumberOfClasses] = useState(1);
  const [attendeeCount, setAttendeeCount] = useState(10);
  const [businessUnit, setBusinessUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [sessions, setSessions] = useState<Session[]>([
    { date: "", startTime: "09:00" },
  ]);

  const resetForm = () => {
    setLocationName("");
    setAddress("");
    setRequestorName("");
    setRequestorEmail("");
    setRequestorPhone("");
    setCertificationType("cpr_aed_first_aid");
    setNumberOfClasses(1);
    setBusinessUnit("");
    setNotes("");
    setSessions([{ date: "", startTime: "09:00" }]);
  };

  const submit = useSubmitTrainingRequest({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListRequestsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() });
        resetForm();
        onSuccess();
      },
      onError: () =>
        toast({ title: "Could not submit request", variant: "destructive" }),
    },
  });

  const updateSession = (i: number, patch: Partial<Session>) =>
    setSessions((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    );
  const addSession = () =>
    setSessions((prev) => [...prev, { date: "", startTime: "09:00" }]);
  const removeSession = (i: number) =>
    setSessions((prev) => prev.filter((_, idx) => idx !== i));

  const validSessions = sessions.every((s) => s.date && s.startTime);
  const disabled =
    !locationName ||
    !requestorName ||
    !requestorEmail ||
    !validSessions ||
    sessions.length === 0 ||
    submit.isPending;

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
          Where
        </h3>
        <div>
          <Label>Location name</Label>
          <Input
            data-testid="input-location-name"
            placeholder="e.g. Studio Lot"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
          />
        </div>
        <div>
          <Label>Address</Label>
          <Input
            data-testid="input-address"
            placeholder="Street, city, state, zip"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
          Your contact info
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Name</Label>
            <Input
              data-testid="input-requestor-name"
              value={requestorName}
              onChange={(e) => setRequestorName(e.target.value)}
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              data-testid="input-requestor-phone"
              value={requestorPhone}
              onChange={(e) => setRequestorPhone(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            data-testid="input-requestor-email"
            value={requestorEmail}
            onChange={(e) => setRequestorEmail(e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Class details
          </h3>
          <Button
            variant="outline"
            size="sm"
            data-testid="button-add-class"
            onClick={() => {
              setNumberOfClasses((n) => n + 1);
              addSession();
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Add class
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Certification</Label>
            <Select
              value={certificationType}
              onValueChange={(v) => setCertificationType(v as CertificationType)}
            >
              <SelectTrigger data-testid="select-cert-type">
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
            <p className="text-xs text-muted-foreground mt-1">
              {certificationDuration(certificationType)}
            </p>
          </div>
          <div>
            <Label>Number of classes</Label>
            <Input
              type="number"
              min={1}
              data-testid="input-number-of-classes"
              value={numberOfClasses}
              onChange={(e) => setNumberOfClasses(parseInt(e.target.value) || 1)}
            />
          </div>
          <div>
            <Label>Attendees per class</Label>
            <Input
              type="number"
              min={1}
              data-testid="input-attendees"
              value={attendeeCount}
              onChange={(e) => setAttendeeCount(Math.max(1, parseInt(e.target.value) || 1))}
            />
            {attendeeCount > 10 ? (
              <p className="text-xs text-amber-600 mt-1">
                Groups over 10 need multiple instructors — please describe your needs in the Notes field below.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Max 10 students per instructor.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Suggested dates & times
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={addSession}
            data-testid="button-add-session"
          >
            <Plus className="h-4 w-4 mr-1" /> Add date
          </Button>
        </div>
        <div className="space-y-2">
          {sessions.map((s, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end"
            >
              <div>
                {i === 0 && <Label>Date</Label>}
                <Input
                  type="date"
                  data-testid={`input-session-date-${i}`}
                  value={s.date}
                  onChange={(e) => updateSession(i, { date: e.target.value })}
                />
              </div>
              <div>
                {i === 0 && <Label>Start time</Label>}
                <Input
                  type="time"
                  data-testid={`input-session-time-${i}`}
                  value={s.startTime}
                  onChange={(e) => updateSession(i, { startTime: e.target.value })}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                disabled={sessions.length === 1}
                onClick={() => removeSession(i)}
                data-testid={`button-remove-session-${i}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
          Business unit
        </h3>
        <Select
          value={businessUnit || "none"}
          onValueChange={(v) => setBusinessUnit(v === "none" ? "" : v)}
        >
          <SelectTrigger data-testid="select-business-unit">
            <SelectValue placeholder="Select a business unit…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— None —</SelectItem>
            {BUSINESS_UNITS.map((bu) => (
              <SelectItem key={bu} value={bu}>{bu}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <section className="space-y-2">
        <Label>Notes (optional)</Label>
        <Textarea
          rows={3}
          data-testid="input-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else we should know?"
        />
      </section>

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          data-testid="button-submit-training-request"
          disabled={disabled}
          onClick={() =>
            submit.mutate({
              data: {
                locationName,
                address: address || undefined,
                requestorName,
                requestorEmail,
                requestorPhone: requestorPhone || undefined,
                certificationType,
                numberOfClasses,
                attendeeCount,
                sessions,
                notes: businessUnit
                  ? [`Business Unit: ${businessUnit}`, notes].filter(Boolean).join("\n")
                  : notes || undefined,
              },
            })
          }
        >
          {submit.isPending ? "Submitting…" : "Submit request"}
        </Button>
      </div>
    </div>
  );
}
