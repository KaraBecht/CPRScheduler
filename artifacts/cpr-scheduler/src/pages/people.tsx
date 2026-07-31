import { useState } from "react";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useListRosterAttendees,
  useUpdateRosterEntry,
  getListUsersQueryKey,
  getListRosterAttendeesQueryKey,
  getGetClassRosterQueryKey,
  type UserRole,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Mail,
  Phone,
  Building2,
  CalendarDays,
  MapPin,
  Search,
  Save,
} from "lucide-react";
import { Link } from "wouter";
import { formatDate } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "administrator", label: "Administrators" },
  { value: "instructor", label: "Instructors" },
  { value: "student", label: "Students" },
];

function NewUserDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "student" as UserRole,
    phone: "",
    organization: "",
    bio: "",
  });
  const create = useCreateUser({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "User added" });
        setOpen(false);
        setForm({
          name: "",
          email: "",
          role: "student",
          phone: "",
          organization: "",
          bio: "",
        });
      },
      onError: () => toast({ title: "Failed", variant: "destructive" }),
    },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-user">
          <Plus className="h-4 w-4 mr-1.5" /> Add person
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a person</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name</Label>
            <Input
              data-testid="input-user-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                data-testid="input-user-email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as UserRole })}
              >
                <SelectTrigger data-testid="select-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label.slice(0, -1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Organization</Label>
              <Input
                value={form.organization}
                onChange={(e) =>
                  setForm({ ...form, organization: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea
              rows={2}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            data-testid="button-submit-user"
            disabled={!form.name || !form.email || create.isPending}
            onClick={() => create.mutate({ data: form })}
          >
            Add person
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ user }: { user: { id: number; name: string; email: string; phone?: string | null; organization?: string | null; bio?: string | null } }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone ?? "", organization: user.organization ?? "", bio: user.bio ?? "" });
  const update = useUpdateUser({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "Saved" });
        setOpen(false);
      },
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    },
  });
  const remove = useDeleteUser({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "Administrator deleted" });
        setOpen(false);
      },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    },
  });
  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) { setForm({ name: user.name, email: user.email, phone: user.phone ?? "", organization: user.organization ?? "", bio: user.bio ?? "" }); setConfirmDelete(false); } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full mt-3">Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit administrator</DialogTitle>
        </DialogHeader>
        {confirmDelete ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{user.name}</strong>? This cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate({ userId: user.id })}>
                {remove.isPending ? "Deleting…" : "Yes, delete"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Organization</Label>
                  <Input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Bio</Label>
                <Textarea rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              </div>
            </div>
            <DialogFooter className="sm:justify-between">
              <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button disabled={!form.name || !form.email || update.isPending} onClick={() => update.mutate({ userId: user.id, data: { name: form.name, email: form.email, phone: form.phone || undefined, organization: form.organization || undefined, bio: form.bio || undefined } })}>
                  Save
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InstructorActiveToggle({ userId, isActive }: { userId: number; isActive: boolean }) {
  const qc = useQueryClient();
  const update = useUpdateUser({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: isActive ? "Instructor marked inactive" : "Instructor marked active" });
      },
      onError: () => toast({ title: "Failed to update", variant: "destructive" }),
    },
  });
  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
      <Checkbox
        id={`active-${userId}`}
        checked={isActive}
        disabled={update.isPending}
        onCheckedChange={(checked) =>
          update.mutate({ userId, data: { isActive: checked === true } })
        }
      />
      <label
        htmlFor={`active-${userId}`}
        className="text-xs cursor-pointer select-none text-muted-foreground"
      >
        Active instructor
      </label>
      {!isActive && (
        <Badge variant="destructive" className="ml-auto text-[10px]">
          Inactive
        </Badge>
      )}
    </div>
  );
}

export default function People() {
  const qc = useQueryClient();
  const { role } = useAuth();
  const canEdit = role === "administrator" || role === "instructor";
  const [tab, setTab] = useState<UserRole>(() => {
    const p = new URLSearchParams(window.location.search).get("tab") as UserRole | null;
    return p && ["administrator", "instructor", "student", "requestor"].includes(p) ? p : "instructor";
  });
  const [query, setQuery] = useState("");
  const { data: users = [] } = useListUsers({ role: tab });
  const { data: rosterAttendees = [] } = useListRosterAttendees();

  const [pending, setPending] = useState<
    Record<string, { result?: "pass" | "fail" | null; cardSent?: boolean }>
  >({});

  const updateRoster = useUpdateRosterEntry({
    mutation: {
      onSuccess: (_d, vars) => {
        qc.invalidateQueries({ queryKey: getListRosterAttendeesQueryKey() });
        qc.invalidateQueries({
          queryKey: getGetClassRosterQueryKey(vars.classId),
        });
        const key = `${vars.classId}-${vars.position}`;
        setPending((p) => {
          const { [key]: _, ...rest } = p;
          return rest;
        });
        toast({ title: "Saved" });
      },
      onError: () =>
        toast({ title: "Failed to update roster", variant: "destructive" }),
    },
  });

  const q = query.trim().toLowerCase();
  const filteredUsers = users.filter((u) => {
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.organization ?? "").toLowerCase().includes(q) ||
      (u.phone ?? "").toLowerCase().includes(q)
    );
  });
  const filteredAttendees = rosterAttendees.filter((a) => {
    if (q && !(
      a.name.toLowerCase().includes(q) ||
      a.classLocation.toLowerCase().includes(q) ||
      a.classTitle.toLowerCase().includes(q)
    )) return false;
    return true;
  });

  return (
    <>
      <PageHeader
        title="People"
        subtitle="Administrators, instructors, students, and partner organizations."
        action={<NewUserDialog />}
      />
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Filter by name, email, organization, or location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="input-people-filter"
          />
        </div>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as UserRole)}>
        <TabsList>
          {ROLES.map((r) => (
            <TabsTrigger
              key={r.value}
              value={r.value}
              data-testid={`tab-people-${r.value}`}
            >
              {r.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="mt-4 space-y-6">
          {tab === "student" && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">
                    Class roster attendees
                  </h3>
                  <Badge variant="outline" data-testid="badge-roster-count">
                    {filteredAttendees.length} / {rosterAttendees.length}
                  </Badge>
                </div>
                {rosterAttendees.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No roster names yet. Save a class roster to see attendees
                    here.
                  </p>
                ) : filteredAttendees.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No attendees match the current filters.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    <div className="hidden md:grid grid-cols-[1.4fr_1fr_1.2fr_5rem_5rem_4rem] gap-3 py-2 text-xs font-medium text-muted-foreground">
                      <span>Name</span>
                      <span>Class date</span>
                      <span>Location</span>
                      <span className="text-center">Result</span>
                      <span className="text-center">Card</span>
                      <span className="text-center">Save</span>
                    </div>
                    {filteredAttendees.map((a, i) => {
                      const key = `${a.classId}-${a.position}`;
                      const draft = pending[key] ?? {};
                      const currentResult =
                        "result" in draft ? draft.result : a.result;
                      const currentCard =
                        "cardSent" in draft ? draft.cardSent : a.cardSent;
                      const dirty = Object.keys(draft).length > 0;
                      const saving =
                        updateRoster.isPending &&
                        updateRoster.variables?.classId === a.classId &&
                        updateRoster.variables?.position === a.position;
                      return (
                        <div
                          key={key}
                          className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1.2fr_5rem_5rem_4rem] gap-2 md:gap-3 py-2.5 text-sm items-center"
                          data-testid={`roster-attendee-${i}`}
                        >
                          <span className="font-medium">{a.name}</span>
                          <Link
                            href={`/classes/${a.classId}`}
                            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                          >
                            <CalendarDays className="h-3.5 w-3.5" />
                            <span>{formatDate(a.classDate)}</span>
                          </Link>
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{a.classLocation}</span>
                          </span>
                          <Select
                            value={currentResult ?? "none"}
                            disabled={!canEdit}
                            onValueChange={(v) =>
                              setPending((p) => ({
                                ...p,
                                [key]: {
                                  ...p[key],
                                  result:
                                    v === "none"
                                      ? null
                                      : (v as "pass" | "fail"),
                                },
                              }))
                            }
                          >
                            <SelectTrigger
                              className="h-8 w-full"
                              data-testid={`attendee-result-${i}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">—</SelectItem>
                              <SelectItem value="pass">Pass</SelectItem>
                              <SelectItem value="fail">Fail</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={currentCard ? "yes" : "no"}
                            disabled={!canEdit}
                            onValueChange={(v) =>
                              setPending((p) => ({
                                ...p,
                                [key]: {
                                  ...p[key],
                                  cardSent: v === "yes",
                                },
                              }))
                            }
                          >
                            <SelectTrigger
                              className="h-8 w-full"
                              data-testid={`attendee-card-${i}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            size="sm"
                            variant={dirty ? "default" : "outline"}
                            disabled={!canEdit || !dirty || saving}
                            onClick={() =>
                              updateRoster.mutate({
                                classId: a.classId,
                                position: a.position,
                                data: draft,
                              })
                            }
                            data-testid={`attendee-save-${i}`}
                            className="h-8 px-2"
                          >
                            <Save className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground text-center">
                {users.length === 0
                  ? `No ${tab}s yet.`
                  : `No ${tab}s match the current filter.`}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((u) => (
                <Card key={u.id} data-testid={`user-${u.id}`}>
                  <CardContent className="pt-5">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {u.name
                            .split(" ")
                            .map((s) => s[0])
                            .slice(0, 2)
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{u.name}</p>
                        <Badge variant="outline" className="mt-0.5 text-[10px]">
                          {u.role}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{u.email}</span>
                      </div>
                      {u.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3" />
                          <span>{u.phone}</span>
                        </div>
                      )}
                      {u.organization && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3 w-3" />
                          <span className="truncate">{u.organization}</span>
                        </div>
                      )}
                    </div>
                    {u.bio && (
                      <p className="text-xs text-foreground/70 mt-3 line-clamp-2">
                        {u.bio}
                      </p>
                    )}
                    {tab === "administrator" && role === "administrator" && (
                      <EditUserDialog user={u} />
                    )}
                    {tab === "instructor" && role === "administrator" && (
                      <InstructorActiveToggle userId={u.id} isActive={u.isActive} />
                    )}
                    {tab === "instructor" && role !== "administrator" && !u.isActive && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <Badge variant="destructive" className="text-[10px]">Inactive</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
