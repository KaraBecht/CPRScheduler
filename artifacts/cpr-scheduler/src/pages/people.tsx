import { useState } from "react";
import {
  useListUsers,
  useCreateUser,
  useListRosterAttendees,
  getListUsersQueryKey,
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
import {
  Plus,
  Mail,
  Phone,
  Building2,
  CalendarDays,
  MapPin,
  Search,
  CheckCircle2,
  XCircle,
  MailCheck,
} from "lucide-react";
import { Link } from "wouter";
import { formatDate } from "@/lib/format";
import { toast } from "@/hooks/use-toast";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "administrator", label: "Administrators" },
  { value: "instructor", label: "Instructors" },
  { value: "student", label: "Students" },
  { value: "requestor", label: "Requestors" },
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

export default function People() {
  const [tab, setTab] = useState<UserRole>("instructor");
  const [query, setQuery] = useState("");
  const { data: users = [] } = useListUsers({ role: tab });
  const { data: rosterAttendees = [] } = useListRosterAttendees();

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
                    <div className="hidden md:grid grid-cols-[1.4fr_1fr_1.2fr_5rem_5rem] gap-3 py-2 text-xs font-medium text-muted-foreground">
                      <span>Name</span>
                      <span>Class date</span>
                      <span>Location</span>
                      <span className="text-center">Result</span>
                      <span className="text-center">Card</span>
                    </div>
                    {filteredAttendees.map((a, i) => (
                      <div
                        key={`${a.classId}-${i}`}
                        className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1.2fr_5rem_5rem] gap-2 md:gap-3 py-2.5 text-sm items-center"
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
                        <span className="flex justify-center">
                          {a.result === "pass" ? (
                            <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Pass
                            </Badge>
                          ) : a.result === "fail" ? (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" /> Fail
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">—</Badge>
                          )}
                        </span>
                        <span className="flex justify-center">
                          {a.cardSent ? (
                            <Badge className="bg-sky-500/10 text-sky-700 hover:bg-sky-500/10 border-sky-500/20">
                              <MailCheck className="h-3 w-3 mr-1" /> Sent
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">No</Badge>
                          )}
                        </span>
                      </div>
                    ))}
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
