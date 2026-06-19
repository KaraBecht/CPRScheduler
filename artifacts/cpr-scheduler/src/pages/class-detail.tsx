import { useRoute, Link } from "wouter";
import {
  useGetClass,
  useEnrollStudent,
  useUpdateEnrollment,
  useDeleteEnrollment,
  useCreateCertificate,
  useUpdateClass,
  useListUsers,
  getGetClassQueryKey,
  getListClassesQueryKey,
  getGetAdminDashboardQueryKey,
  getGetStudentDashboardQueryKey,
  type CertificationType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  User as UserIcon,
  Users,
  UserPlus,
  X,
  ClipboardList,
  Link2,
  Check,
  ExternalLink,
} from "lucide-react";
import {
  certificationDuration,
  formatCertificationType,
  formatDate,
  formatTime,
} from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";

export default function ClassDetail() {
  const [, params] = useRoute("/classes/:id");
  const classId = parseInt(params?.id ?? "0", 10);
  const qc = useQueryClient();
  const { role, userId } = useAuth();
  const { data: cls, isLoading } = useGetClass(classId);
  const { data: students = [] } = useListUsers({ role: "student" });
  const { data: instructors = [] } = useListUsers({ role: "instructor" });
  const [enrollStudentId, setEnrollStudentId] = useState<string>("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    certificationType: "cpr_aed_first_aid" as CertificationType,
    date: "",
    startTime: "",
    endTime: "",
    location: "",
    capacity: 10,
    instructorId: "",
    description: "",
    status: "scheduled" as "scheduled" | "completed" | "cancelled",
  });
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
  const updateClass = useUpdateClass({
    mutation: {
      onSuccess: () => {
        toast({ title: "Class updated" });
        invalidate();
        qc.invalidateQueries({ queryKey: getListClassesQueryKey() });
        setEditOpen(false);
      },
      onError: () =>
        toast({ title: "Could not update class", variant: "destructive" }),
    },
  });

  function openEdit() {
    if (!cls) return;
    setEditForm({
      title: cls.title,
      certificationType: cls.certificationType as CertificationType,
      date: cls.date,
      startTime: cls.startTime,
      endTime: cls.endTime ?? "",
      location: cls.location === "TBD" ? "" : cls.location,
      capacity: cls.capacity,
      instructorId: cls.instructorId?.toString() ?? "",
      description: cls.description ?? "",
      status: cls.status as "scheduled" | "completed" | "cancelled",
    });
    setEditOpen(true);
  }

  function submitEdit() {
    updateClass.mutate({
      classId,
      data: {
        title: editForm.title || undefined,
        certificationType: editForm.certificationType,
        date: editForm.date || undefined,
        startTime: editForm.startTime || undefined,
        endTime: editForm.endTime || undefined,
        location: editForm.location || "TBD",
        capacity: editForm.capacity,
        instructorId: editForm.instructorId ? parseInt(editForm.instructorId, 10) : undefined,
        description: editForm.description || undefined,
        status: editForm.status,
      },
    });
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
            <Badge variant="outline">
              {formatCertificationType(cls.certificationType)}
            </Badge>
            <Badge
              variant={
                cls.status === "scheduled"
                  ? "default"
                  : cls.status === "completed"
                    ? "secondary"
                    : "destructive"
              }
            >
              {cls.status}
            </Badge>
          </div>
        }
      />

      {role === "administrator" &&
        (cls.location === "TBD" || !cls.location || !cls.instructorId) && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
            <span>
              This class is missing{" "}
              {[
                (!cls.location || cls.location === "TBD") && "a location",
                !cls.instructorId && "an instructor",
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
              <Label>Title</Label>
              <Input
                data-testid="input-edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
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
                    <SelectItem value="scheduled">Scheduled</SelectItem>
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
              <Input
                data-testid="input-edit-location"
                value={editForm.location}
                placeholder="Building, address, or room"
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              />
            </div>
            <div>
              <Label>Instructor</Label>
              <Select
                value={editForm.instructorId || "none"}
                onValueChange={(v) =>
                  setEditForm({ ...editForm, instructorId: v === "none" ? "" : v })
                }
              >
                <SelectTrigger data-testid="select-edit-instructor">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {instructors.map((i) => (
                    <SelectItem key={i.id} value={i.id.toString()}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                updateClass.isPending
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
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <span>{cls.instructorName ?? "Unassigned"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                {cls.enrolledCount} / {cls.capacity} enrolled
                {remaining > 0 ? ` · ${remaining} seats open` : " · full"}
              </span>
            </div>
            {role === "student" && cls.status === "scheduled" && (
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
              <span>Roster · {enrollments.length}</span>
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
            {enrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No students enrolled yet.
              </p>
            ) : (
              <div className="divide-y divide-border">
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
    </>
  );
}
