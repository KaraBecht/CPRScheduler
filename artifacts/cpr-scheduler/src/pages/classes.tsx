import { useState } from "react";
import {
  useListClasses,
  useCreateClass,
  getListClassesQueryKey,
  type CertificationType,
  type ClassSession,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { ClassCard } from "@/components/ClassCard";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
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
import { useAuth } from "@/lib/auth-context";
import { useListUsers } from "@workspace/api-client-react";
import { Plus, Trash2, LayoutGrid, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCertificationType, certificationDuration } from "@/lib/format";
import { Link } from "wouter";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const CERT_TYPES: CertificationType[] = [
  "cpr_aed_first_aid",
  "stop_the_bleed",
  "cpr_aed_first_aid_stop_the_bleed",
];

type ClassSlot = { date: string; startTime: string };

function CreateClassDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: instructors = [] } = useListUsers({ role: "instructor" });
  const CAPACITY = 10;
  const [title, setTitle] = useState("");
  const [certificationType, setCertificationType] =
    useState<CertificationType>("cpr_aed_first_aid");
  const [location, setLocation] = useState("");
  const [instructorId, setInstructorId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [slots, setSlots] = useState<ClassSlot[]>([
    { date: "", startTime: "09:00" },
  ]);

  const reset = () => {
    setTitle("");
    setCertificationType("cpr_aed_first_aid");
    setLocation("");
    setInstructorId(null);
    setDescription("");
    setSlots([{ date: "", startTime: "09:00" }]);
  };

  const create = useCreateClass({
    mutation: {
      onError: () =>
        toast({ title: "Failed to create class", variant: "destructive" }),
    },
  });

  const updateSlot = (i: number, patch: Partial<ClassSlot>) =>
    setSlots((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    );
  const addSlot = () =>
    setSlots((prev) => [...prev, { date: "", startTime: "09:00" }]);
  const removeSlot = (i: number) =>
    setSlots((prev) => prev.filter((_, idx) => idx !== i));

  const allValid =
    title && location && slots.length > 0 && slots.every((s) => s.date && s.startTime);

  const handleSubmit = async () => {
    try {
      for (const slot of slots) {
        await create.mutateAsync({
          data: {
            title,
            certificationType,
            date: slot.date,
            startTime: slot.startTime,
            location,
            capacity: CAPACITY,
            instructorId: instructorId ?? undefined,
            description,
          },
        });
      }
      qc.invalidateQueries({ queryKey: getListClassesQueryKey() });
      toast({
        title: slots.length === 1 ? "Class created" : `${slots.length} classes created`,
      });
      setOpen(false);
      reset();
    } catch {
      // error toast handled in mutation onError
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-class">
          <Plus className="h-4 w-4 mr-1.5" /> Schedule class
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule a new class</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input
              data-testid="input-class-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="CPR/AED/First Aid"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
              <Label>Instructor</Label>
              <Select
                value={instructorId?.toString() ?? "none"}
                onValueChange={(v) =>
                  setInstructorId(v === "none" ? null : parseInt(v, 10))
                }
              >
                <SelectTrigger data-testid="select-instructor">
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
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Location</Label>
              <LocationAutocomplete
                data-testid="input-location"
                value={location}
                onChange={setLocation}
                placeholder="Building, address, or room"
              />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input type="number" value={CAPACITY} readOnly disabled />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Dates & start times</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSlot}
                data-testid="button-add-class-slot"
              >
                <Plus className="h-4 w-4 mr-1" /> Add date
              </Button>
            </div>
            {slots.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input
                  type="date"
                  data-testid={`input-class-date-${i}`}
                  value={s.date}
                  onChange={(e) => updateSlot(i, { date: e.target.value })}
                />
                <Input
                  type="time"
                  data-testid={`input-class-time-${i}`}
                  value={s.startTime}
                  onChange={(e) => updateSlot(i, { startTime: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={slots.length === 1}
                  onClick={() => removeSlot(i)}
                  data-testid={`button-remove-class-slot-${i}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            data-testid="button-submit-class"
            disabled={!allValid || create.isPending}
            onClick={handleSubmit}
          >
            {slots.length === 1 ? "Create class" : `Create ${slots.length} classes`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_CHIP: Record<string, string> = {
  scheduled: "bg-primary text-primary-foreground",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/15 text-destructive",
};

function CalendarView({ classes }: { classes: ClassSession[] }) {
  const [month, setMonth] = useState(() => new Date());

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const byDate = new Map<string, ClassSession[]>();
  for (const cls of classes) {
    const key = cls.date; // "YYYY-MM-DD"
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(cls);
  }

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card className="shadow-sm overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-foreground">
          {format(month, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 px-3"
            onClick={() => setMonth(new Date())}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[11px] font-medium uppercase tracking-widest text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 divide-x divide-y divide-border">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayClasses = byDate.get(key) ?? [];
          const inMonth = isSameMonth(day, month);
          const today = isToday(day);
          const MAX_CHIPS = 3;
          const visible = dayClasses.slice(0, MAX_CHIPS);
          const overflow = dayClasses.length - MAX_CHIPS;

          return (
            <div
              key={key}
              className={cn(
                "min-h-[100px] p-1.5 flex flex-col gap-1",
                !inMonth && "bg-muted/30",
              )}
            >
              {/* Day number */}
              <div className="flex justify-end">
                <span
                  className={cn(
                    "text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full",
                    today
                      ? "bg-primary text-primary-foreground"
                      : inMonth
                        ? "text-foreground"
                        : "text-muted-foreground/50",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* Class chips */}
              {visible.map((cls) => (
                <Link key={cls.id} href={`/classes/${cls.id}`}>
                  <div
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight truncate cursor-pointer transition-opacity hover:opacity-80",
                      STATUS_CHIP[cls.status] ?? STATUS_CHIP.scheduled,
                    )}
                    title={`${cls.title} — ${cls.startTime} @ ${cls.location}`}
                  >
                    {cls.title}
                  </div>
                </Link>
              ))}

              {overflow > 0 && (
                <span className="text-[10px] text-muted-foreground pl-1">
                  +{overflow} more
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-3 border-t border-border bg-muted/20">
        {[
          { label: "Scheduled", cls: "bg-primary" },
          { label: "Completed", cls: "bg-muted-foreground/40" },
          { label: "Cancelled", cls: "bg-destructive/50" },
        ].map(({ label, cls }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-sm", cls)} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function Classes() {
  const { role } = useAuth();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [tab, setTab] = useState<"all" | "upcoming" | "completed">("upcoming");

  const { data: allClasses = [], isLoading } = useListClasses();

  const today = new Date().toISOString().split("T")[0]!;
  const listClasses =
    tab === "upcoming"
      ? allClasses.filter((c) => c.date >= today && c.status === "scheduled")
      : tab === "completed"
        ? allClasses.filter((c) => c.status === "completed")
        : allClasses;

  return (
    <>
      <PageHeader
        title="Classes"
        subtitle="Every scheduled, upcoming, and completed CPR training session."
        action={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-md border border-border overflow-hidden">
              <button
                onClick={() => setView("list")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors",
                  view === "list"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
                aria-label="List view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>List</span>
              </button>
              <button
                onClick={() => setView("calendar")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l border-border",
                  view === "calendar"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
                aria-label="Calendar view"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Calendar</span>
              </button>
            </div>
            {role === "administrator" && <CreateClassDialog />}
          </div>
        }
      />

      {view === "calendar" ? (
        isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <CalendarView classes={allClasses} />
        )
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="all" data-testid="tab-all">
              All
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed">
              Completed
            </TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : listClasses.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-sm text-muted-foreground text-center">
                  No classes found.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listClasses.map((c) => (
                  <ClassCard key={c.id} session={c} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}
