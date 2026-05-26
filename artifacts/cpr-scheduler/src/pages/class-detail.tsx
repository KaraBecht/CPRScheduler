import { useRoute, Link } from "wouter";
import {
  useGetClass,
  useEnrollStudent,
  useUpdateEnrollment,
  useDeleteEnrollment,
  useCreateCertificate,
  useListUsers,
  getGetClassQueryKey,
  getGetAdminDashboardQueryKey,
  getGetStudentDashboardQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Award,
  CalendarDays,
  Clock,
  MapPin,
  User as UserIcon,
  Users,
  UserPlus,
  X,
} from "lucide-react";
import {
  formatCertificationType,
  formatDate,
  formatTime,
} from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

export default function ClassDetail() {
  const [, params] = useRoute("/classes/:id");
  const classId = parseInt(params?.id ?? "0", 10);
  const qc = useQueryClient();
  const { role, userId } = useAuth();
  const { data: cls, isLoading } = useGetClass(classId);
  const { data: students = [] } = useListUsers({ role: "student" });
  const [enrollStudentId, setEnrollStudentId] = useState<string>("");

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
                {formatTime(cls.startTime)} – {formatTime(cls.endTime)}
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
