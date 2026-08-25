import { useRoute, Link, useLocation } from "wouter";
import {
  useGetClass,
  useGetClassRoster,
  useEnrollStudent,
  useUpdateEnrollment,
  useDeleteEnrollment,
  useCreateCertificate,
  useCreateClass,
  useUpdateClass,
  useDeleteClass,
  useListUsers,
  getGetClassQueryKey,
  getGetClassRosterQueryKey,
  getListClassesQueryKey,
  getGetAdminDashboardQueryKey,
  getGetStudentDashboardQueryKey,
  type CertificationType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import {
  ArrowLeft,
  AlertTriangle,
  Award,
  CalendarDays,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Printer,
  Trash2,
  Upload,
  User as UserIcon,
  Users,
  UserPlus,
  X,
  ClipboardList,
  Link2,
  Check,
  ExternalLink,
  Phone,
  Mail,
} from "lucide-react";
import { UploadRosterDialog } from "@/components/UploadRosterDialog";
import { openSigninSheet } from "@/lib/generate-signin-sheet";
import {
  certificationDuration,
  formatCertificationType,
  formatDate,
  formatTime,
} from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect } from "react";

const BUSINESS_UNITS = [
  "FOX Digital",
  "Fox Corp",
  "FOX Entertainment",
  "FOX News Media",
  "FOX Sports",
  "FOX Studio Lot",
  "FOX Television Stations",
];

type ExtraSlot = { date: string; startTime: string };

export default function ClassDetail() {
  const [, params] = useRoute("/classes/:id");
  const classId = parseInt(params?.id ?? "0", 10);
  const qc = useQueryClient();
  const { role, userId } = useAuth();
  const { data: cls, isLoading } = useGetClass(classId);
  const { data: rosterData } = useGetClassRoster(classId);

  useEffect(() => {
    const id = setInterval(() => {
      qc.invalidateQueries({ queryKey: getGetClassQueryKey(classId) });
      qc.invalidateQueries({ queryKey: getGetClassRosterQueryKey(classId) });
    }, 5000);
    return () => clearInterval(id);
  }, [classId]);

  const { data: students = [] } = useListUsers({ role: "student" });
  const { data: instructors = [] } = useListUsers({ role: "instructor" });
  const [enrollStudentId, setEnrollStudentId] = useState<string>("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [, navigate] = useLocation();

  const deleteClass = useDeleteClass({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListClassesQueryKey() });
        qc.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() });
        navigate("/classes");
      },
    },
  });
  const [editForm, setEditForm] = useState({
    title: "",
    certificationType: "cpr_aed_first_aid" as CertificationType,
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    capacity: 10,
    instructorIds: [] as number[],
    description: "",
    businessUnit: "",
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    status: "confirmed" as "being_scheduled" | "pending_schedule" | "confirmed" | "completed" | "cancelled" | "scheduled",
  });
  const [extraSlots, setExtraSlots] = useState<ExtraSlot[]>([]);
  const signInUrl = useMemo(() => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    return `${window.location.origin}${base}/roster-signin/${classId}`;
  }, [classId]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetClassQueryKey(classId) });
    qc.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() });
    if (userId)
      qc.invalidateQueries({ queryKey: getGetStudentDashboardQueryKey(userId) });
  };

  const enroll = useEnrollStudent({
    mutation: {
      onSuccess: () => {
        toast({ title: "Student enrolled" });
        invalidate();
        setEnrollStudentId("");
      },
      onError: () =>
        toast({ title: "Could not enroll", variant: "destructive" }),
    },
  });
  const updateEnroll = useUpdateEnrollment({
    mutation: { onSuccess: invalidate },
  });
  const deleteEnroll = useDeleteEnrollment({
    mutation: {
      onSuccess: () => {
        toast({ title: "Enrollment removed" });
        invalidate();
      },
    },
  });
  const issueCert = useCreateCertificate({
    mutation: {
      onSuccess: () => {
        toast({ title: "Certificate issued" });
        invalidate();
      },
    },
  });
  const createClass = useCreateClass({
    mutation: {
      onError: () => toast({ title: "Could not create session", variant: "destructive" }),
    },
  });
  const updateClass = useUpdateClass({
    mutation: {
      onError: () => toast({ title: "Could not update class", variant: "destructive" }),
    },
  });

  function openEdit() {
    if (!cls) return;
    const ids =
      cls.instructors && cls.instructors.length > 0
        ? cls.instructors.map((i) => i.id)
        : cls.instructorId
          ? [cls.instructorId]
          : [];
    setEditForm({
      title: cls.title,
      certificationType: cls.certificationType as CertificationType,
      date: cls.date,
      startTime: cls.startTime,
      endTime: cls.endTime ?? "",
      location: cls.location === "TBD" ? "" : cls.location,
      capacity: cls.capacity,
      instructorIds: ids,
      description: cls.description ?? "",
      businessUnit: (cls as any).businessUnit ?? "",
      contactName: (cls as any).contactName ?? "",
      contactPhone: (cls as any).contactPhone ?? "",
      contactEmail: (cls as any).contactEmail ?? "",
      status: cls.status as "being_scheduled" | "pending_schedule" | "confirmed" | "completed" | "cancelled" | "scheduled",
    });
    setExtraSlots([]);
    setEditOpen(true);
  }

  async function submitEdit() {
    const validExtra = extraSlots.filter((s) => s.date && s.startTime);
    try {
      await updateClass.mutateAsync({
        classId,
        data: {
          title: editForm.title || undefined,
          certificationType: editForm.certificationType,
          date: editForm.date || undefined,
          startTime: editForm.startTime || undefined,
          endTime: editForm.endTime || undefined,
          location: editForm.location || "TBD",
          capacity: editForm.capacity,
          instructorIds: editForm.instructorIds,
          description: editForm.description || undefined,
          businessUnit: editForm.businessUnit || undefined,
          contactName: editForm.contactName || undefined,
          contactPhone: editForm.contactPhone || undefined,
          contactEmail: editForm.contactEmail || undefined,
          status: editForm.status,
        },
      });
      for (const slot of validExtra) {
        await createClass.mutateAsync({
          data: {
            title: editForm.title || "TBD",
            certificationType: editForm.certificationType,
            date: slot.date,
            startTime: slot.startTime,
            endTime: editForm.endTime || undefined,
            location: editForm.location || "TBD",
            capacity: editForm.capacity,
            instructorIds: editForm.instructorIds.length > 0 ? editForm.instructorIds : undefined,
            description: editForm.description || undefined,
            businessUnit: editForm.businessUnit || undefined,
            status: editForm.status,
          },
        });
      }
      invalidate();
      qc.invalidateQueries({ queryKey: getListClassesQueryKey() });
      setEditOpen(false);
      toast({
        title: validExtra.length > 0
          ? `Saved — ${validExtra.length} additional session${validExtra.length > 1 ? "s" : ""} created`
          : "Class updated",
      });
    } catch {
      // individual mutation onError handlers show toasts
    }
  }

  if (isLoading || !cls) {
    return <PageHeader title="Loading..." />;
  }

  const remaining = cls.capacity - cls.enrolledCount;
  const enrollments = cls.enrollments ?? [];
  const enrolledStudentIds = new Set(enrollments.map((e) => e.studentId));
  const availableStudents = students.filter((s) => !enrolledStudentIds.has(s.id));
  const canManage = role === "administrator" || role === "instructor";
  const studentEnrollment = enrollments.find((e) => e.studentId === userId);
  const signInEntries = (rosterData?.entries ?? []).filter((e) => e.name.trim() !== "");

  return (
    <>
      <Link
        href="/classes"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        data-testid="link-back"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to classes
      </Link>
      <PageHeader
        title={cls.title}
        subtitle={cls.description ?? undefined}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              data-testid="button-share-signin"
              onClick={() => setShareOpen(true)}
            >
              <Link2 className="h-4 w-4 mr-1.5" /> Share sign-in link
            </Button>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                data-testid="button-download-sheet"
                onClick={() =>
                  openSigninSheet(cls, rosterData?.entries ?? [])
                }
              >
                <ExternalLink className="h-4 w-4 mr-1.5" /> Open sign-in sheet
              </Button>
            )}
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                data-testid="button-upload-csv"
                onClick={() => setUploadOpen(true)}
              >
                <Upload className="h-4 w-4 mr-1.5" /> Upload CSV
              </Button>
            )}
            {role === "administrator" && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                data-testid="button-delete-class"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" /> Delete
              </Button>
            )}
            <Dialog open={shareOpen} onOpenChange={setShareOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Student sign-in link</DialogTitle>
                  <DialogDescription>
                    Share this link with attendees — no login required.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex gap-2 mt-1">
                  <Input
                    readOnly
                    value={signInUrl}
                    className="text-sm"
                    onFocus={(e) => e.target.select()}
                  />
                  <Button
                    variant="outline"
                    className="shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(signInUrl);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                  >
                    {linkCopied ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                  </Button>
                  <a href={signInUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="shrink-0">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </DialogContent>
            </Dialog>
            {role === "administrator" && (
              <Button
                variant="outline"
                size="sm"
                data-testid="button-edit-class"
                onClick={openEdit}
              >
                <Pencil className="h-4 w-4 mr-1.5" /> Edit class
              </Button>
            )}
            <Link href={`/classes/${classId}/roster`}>
              <Button variant="outline" size="sm" data-testid="button-open-roster">
                <ClipboardList className="h-4 w-4 mr-1.5" /> Roster
              </Button>
            </Link>
          </div>
        }
      />

      {role === "administrator" &&
        (cls.location === "TBD" ||
          !cls.location ||
          !cls.instructors?.length) && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
            <span>
              This class is missing{" "}
              {[
                (!cls.location || cls.location === "TBD") && "a location",
                !cls.instructors?.length && "an instructor",
              ]
                .filter(Boolean)
                .join(" and ")}
              . Use <strong>Edit class</strong> to fill in the details before the session.
            </span>
          </div>
        )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit class</DialogTitle>
            <DialogDescription>
              Update class details. Changes take effect immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Location name</Label>
              <Input
                data-testid="input-edit-title"
                placeholder="1211, Studio Lot, KTTV, DC Bureau…"
                value={editForm.title}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Certification</Label>
                <Select
                  value={editForm.certificationType}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, certificationType: v as CertificationType })
                  }
                >
                  <SelectTrigger data-testid="select-edit-cert-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["cpr_aed_first_aid", "stop_the_bleed", "cpr_aed_first_aid_stop_the_bleed"] as CertificationType[]).map((c) => (
                      <SelectItem key={c} value={c}>
                        {formatCertificationType(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {certificationDuration(editForm.certificationType)}
                </p>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, status: v as typeof editForm.status })
                  }
                >
                  <SelectTrigger data-testid="select-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_schedule">Inquiry</SelectItem>
                    <SelectItem value="being_scheduled">Scheduling</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  data-testid="input-edit-date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                />
              </div>
              <div>
                <Label>Capacity</Label>
                <Input
                  type="number"
                  min={1}
                  data-testid="input-edit-capacity"
                  value={editForm.capacity}
                  onChange={(e) =>
                    setEditForm({ ...editForm, capacity: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start time</Label>
                <Input
                  type="time"
                  data-testid="input-edit-start-time"
                  value={editForm.startTime}
                  onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label>End time</Label>
                <Input
                  type="time"
                  data-testid="input-edit-end-time"
                  value={editForm.endTime}
                  onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Location</Label>
              <LocationAutocomplete
                data-testid="input-edit-location"
                placeholder="Address"
                value={editForm.location}
                onChange={(v) => setEditForm({ ...editForm, location: v })}
              />
            </div>
            <div>
              {(() => {
                const maxInst = Math.ceil(editForm.capacity / 10);
                return (
                  <>
                    <Label>
                      {maxInst > 1
                        ? `Instructors (up to ${maxInst})`
                        : "Instructor"}
                    </Label>
                    {maxInst > 1 && (
                      <p className="text-xs text-muted-foreground mb-1">
                        1 instructor per 10 students
                      </p>
                    )}
                    <div className="space-y-2 mt-1">
                      {editForm.instructorIds.map((id, idx) => {
                        const instr = instructors.find((i) => i.id === id);
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="flex-1 text-sm border rounded-md px-3 py-2 bg-background">
                              {instr?.name ?? "Unknown"}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 shrink-0"
                              onClick={() =>
                                setEditForm({
                                  ...editForm,
                                  instructorIds: editForm.instructorIds.filter(
                                    (_, i) => i !== idx,
                                  ),
                                })
                              }
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                      {editForm.instructorIds.length < maxInst && (
                        <Select
                          value="none"
                          onValueChange={(v) => {
                            if (v !== "none")
                              setEditForm({
                                ...editForm,
                                instructorIds: [
                                  ...editForm.instructorIds,
                                  parseInt(v, 10),
                                ],
                              });
                          }}
                        >
                          <SelectTrigger data-testid="select-edit-instructor">
                            <SelectValue
                              placeholder={
                                editForm.instructorIds.length === 0
                                  ? "Unassigned"
                                  : "Add another instructor"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              {editForm.instructorIds.length === 0
                                ? "Unassigned"
                                : "— add instructor —"}
                            </SelectItem>
                            {instructors
                              .filter(
                                (i) => i.isActive && !editForm.instructorIds.includes(i.id),
                              )
                              .map((i) => (
                                <SelectItem key={i.id} value={i.id.toString()}>
                                  {i.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={2}
                data-testid="input-edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Optional notes about this class"
              />
            </div>
            <div>
              <Label>Business unit</Label>
              <Select
                value={editForm.businessUnit || "none"}
                onValueChange={(v) => setEditForm({ ...editForm, businessUnit: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a business unit…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {BUSINESS_UNITS.map((bu) => (
                    <SelectItem key={bu} value={bu}>{bu}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contact person */}
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Contact person</p>
              <div className="space-y-2">
                <div>
                  <Label>Name</Label>
                  <Input
                    placeholder="Full name"
                    value={editForm.contactName}
                    onChange={(e) => setEditForm((f) => ({ ...f, contactName: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      placeholder="(555) 000-0000"
                      value={editForm.contactPhone}
                      onChange={(e) => setEditForm((f) => ({ ...f, contactPhone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      value={editForm.contactEmail}
                      onChange={(e) => setEditForm((f) => ({ ...f, contactEmail: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional sessions */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium text-muted-foreground">Add another session</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setExtraSlots((prev) => [...prev, { date: "", startTime: "09:00" }])}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add date
                </Button>
              </div>
              {extraSlots.length > 0 && (
                <p className="text-xs text-muted-foreground mb-2">
                  Each date creates a separate class with the same details above.
                </p>
              )}
              {extraSlots.map((slot, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <Input
                    type="date"
                    value={slot.date}
                    onChange={(e) =>
                      setExtraSlots((prev) =>
                        prev.map((s, idx) => idx === i ? { ...s, date: e.target.value } : s)
                      )
                    }
                    className="flex-1"
                  />
                  <Input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) =>
                      setExtraSlots((prev) =>
                        prev.map((s, idx) => idx === i ? { ...s, startTime: e.target.value } : s)
                      )
                    }
                    className="w-28"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setExtraSlots((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              data-testid="button-save-class"
              disabled={
                !editForm.title ||
                !editForm.date ||
                !editForm.startTime ||
                updateClass.isPending ||
                createClass.isPending
              }
              onClick={submitEdit}
            >
              {updateClass.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6 space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span>{formatDate(cls.date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {formatTime(cls.startTime)}
                {cls.endTime ? ` – ${formatTime(cls.endTime)}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{cls.location}</span>
            </div>
            <div className="flex items-start gap-2">
              <UserIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <span>
                {cls.instructors && cls.instructors.length > 0
                  ? cls.instructors.map((i) => i.name).join(", ")
                  : (cls.instructorName ?? "Unassigned")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                {cls.enrolledCount} / {cls.capacity} enrolled
                {remaining > 0 ? ` · ${remaining} seats open` : " · full"}
              </span>
            </div>
            {((cls as any).contactName || (cls as any).contactPhone || (cls as any).contactEmail) && (
              <div className="border-t pt-3 mt-1 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact</p>
                {(cls as any).contactName && (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{(cls as any).contactName}</span>
                  </div>
                )}
                {(cls as any).contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`tel:${(cls as any).contactPhone}`} className="hover:underline">{(cls as any).contactPhone}</a>
                  </div>
                )}
                {(cls as any).contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${(cls as any).contactEmail}`} className="hover:underline">{(cls as any).contactEmail}</a>
                  </div>
                )}
              </div>
            )}
            {role === "student" && (cls.status === "confirmed" || cls.status === "scheduled") && (
              <Button
                className="w-full"
                disabled={
                  !userId ||
                  !!studentEnrollment ||
                  remaining <= 0 ||
                  enroll.isPending
                }
                data-testid="button-self-enroll"
                onClick={() =>
                  userId &&
                  enroll.mutate({ classId, data: { studentId: userId } })
                }
              >
                {studentEnrollment
                  ? `Already ${studentEnrollment.status}`
                  : remaining <= 0
                    ? "Class is full"
                    : "Enroll in this class"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Roster · {enrollments.length + signInEntries.length}</span>
              {canManage && availableStudents.length > 0 && remaining > 0 && (
                <div className="flex items-center gap-2">
                  <Select
                    value={enrollStudentId}
                    onValueChange={setEnrollStudentId}
                  >
                    <SelectTrigger
                      className="w-[200px] h-9"
                      data-testid="select-enroll-student"
                    >
                      <SelectValue placeholder="Add student..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStudents.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    disabled={!enrollStudentId || enroll.isPending}
                    onClick={() =>
                      enroll.mutate({
                        classId,
                        data: { studentId: parseInt(enrollStudentId, 10) },
                      })
                    }
                    data-testid="button-add-student"
                  >
                    <UserPlus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {enrollments.length === 0 && signInEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No students enrolled yet.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {signInEntries.map((e) => (
                  <div
                    key={`signin-${e.position}`}
                    className="flex items-center gap-3 py-3"
                  >
                    <div className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-700 flex items-center justify-center text-xs font-semibold">
                      {e.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{e.email || e.phone || "Walk-in sign-in"}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">signed in</Badge>
                  </div>
                ))}
                {enrollments.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 py-3"
                    data-testid={`enrollment-${e.id}`}
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                      {e.studentName
                        .split(" ")
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{e.studentName}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.studentEmail}
                      </p>
                    </div>
                    {canManage ? (
                      <Select
                        value={e.status}
                        onValueChange={(v) =>
                          updateEnroll.mutate({
                            enrollmentId: e.id,
                            data: { status: v as any },
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="registered">registered</SelectItem>
                          <SelectItem value="attended">attended</SelectItem>
                          <SelectItem value="no_show">no_show</SelectItem>
                          <SelectItem value="cancelled">cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">{e.status}</Badge>
                    )}
                    {e.certificateIssued ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/20">
                        <Award className="h-3 w-3 mr-1" /> Issued
                      </Badge>
                    ) : (
                      canManage &&
                      e.status === "attended" && (
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`button-issue-cert-${e.id}`}
                          onClick={() =>
                            issueCert.mutate({
                              data: {
                                studentId: e.studentId,
                                classId: cls.id,
                                certificationType: cls.certificationType,
                              },
                            })
                          }
                        >
                          <Award className="h-3 w-3 mr-1" /> Issue
                        </Button>
                      )
                    )}
                    {canManage && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() =>
                          deleteEnroll.mutate({ enrollmentId: e.id })
                        }
                        data-testid={`button-remove-${e.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {canManage && (() => {
        // Once a class is confirmed/scheduled and a trainer is assigned, hide
        // pending invitations — they no longer reflect actionable state.
        const hasAssignedTrainer =
          (cls.instructors && cls.instructors.length > 0) || !!cls.instructorId;
        const classIsLocked = ["confirmed", "scheduled", "completed"].includes(cls.status);
        const visibleInvitations = (cls.trainerInvitations ?? []).filter(
          (inv) => !(classIsLocked && hasAssignedTrainer && inv.status === "pending"),
        );
        return visibleInvitations.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Trainer Responses · {visibleInvitations.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {visibleInvitations.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 py-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                    {inv.trainerName.split(" ").map((s: string) => s[0]).slice(0, 2).join("")}
                  </div>
                  <p className="flex-1 text-sm font-medium">{inv.trainerName}</p>
                  {inv.status === "accepted" && (
                    <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/20">
                      <Check className="h-3 w-3 mr-1" /> Accepted
                    </Badge>
                  )}
                  {inv.status === "declined" && (
                    <Badge className="bg-red-500/10 text-red-700 hover:bg-red-500/10 border-red-500/20">
                      <X className="h-3 w-3 mr-1" /> Declined
                    </Badge>
                  )}
                  {inv.status === "pending" && (
                    <Badge variant="secondary">Inquiry</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        ) : null;
      })()}

      <UploadRosterDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onImported={() => {
          qc.invalidateQueries({ queryKey: getGetClassRosterQueryKey(classId) });
          qc.invalidateQueries({ queryKey: getGetClassQueryKey(classId) });
        }}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{cls.title}"?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>This will permanently delete:</p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>The class record</li>
                  <li>All roster sign-in entries</li>
                  <li>All enrollment records</li>
                  <li>
                    Certificates will be preserved but unlinked from this class
                  </li>
                </ul>
                <p className="font-medium text-foreground pt-1">
                  This cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteClass.mutate({ classId })}
              data-testid="button-confirm-delete"
            >
              {deleteClass.isPending ? "Deleting…" : "Delete class"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
