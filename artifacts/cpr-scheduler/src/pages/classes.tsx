import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import {
  useListClasses,
  useCreateClass,
  useDeleteClass,
  useUpdateClass,
  getListClassesQueryKey,
  getListLocationsQueryKey,
  getGetAdminDashboardQueryKey,
  type CertificationType,
  type ClassSession,
  useListLocations,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Plus, Trash2, LayoutGrid, CalendarDays, ChevronLeft, ChevronRight, X, Search, SlidersHorizontal, ClipboardList, MapPin, Clock, Globe2, TriangleAlert } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCertificationType, certificationDuration, formatDate, formatTime } from "@/lib/format";
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
import { DEFAULT_TIME_ZONE, TIME_ZONE_OPTIONS, formatTimeZone } from "@/lib/timezones";

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

type ClassSlot = { date: string; startTime: string };

function CreateClassDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: instructors = [] } = useListUsers({ role: "instructor" });
  const { data: locations = [] } = useListLocations();
  const [title, setTitle] = useState("");
  const [certificationType, setCertificationType] =
    useState<CertificationType>("cpr_aed_first_aid");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState(10);
  const [instructorIds, setInstructorIds] = useState<number[]>([]);
  const [description, setDescription] = useState("");
  const [businessUnit, setBusinessUnit] = useState("");
  const [slots, setSlots] = useState<ClassSlot[]>([
    { date: "", startTime: "09:00" },
  ]);
  const [status, setStatus] = useState<string>("confirmed");
  const [timeZone, setTimeZone] = useState(DEFAULT_TIME_ZONE);
  const maxInstructors = Math.ceil(capacity / 10);

  useEffect(() => {
    const matchingLocation = locations.find(
      (candidate) =>
        candidate.name.trim().toLowerCase() === title.trim().toLowerCase(),
    );
    if (matchingLocation) setTimeZone(matchingLocation.timeZone ?? DEFAULT_TIME_ZONE);
  }, [locations, title]);

  const reset = () => {
    setTitle("");
    setCertificationType("cpr_aed_first_aid");
    setLocation("");
    setCapacity(10);
    setInstructorIds([]);
    setDescription("");
    setBusinessUnit("");
    setSlots([{ date: "", startTime: "09:00" }]);
    setStatus("confirmed");
    setTimeZone(DEFAULT_TIME_ZONE);
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
            timeZone,
            capacity,
            instructorIds: instructorIds.length > 0 ? instructorIds : undefined,
            description,
            businessUnit: businessUnit || undefined,
            status: status as ClassSession["status"],
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
            <Label>Location name</Label>
            <Input
              data-testid="input-class-title"
              placeholder="1211, Studio Lot, KTTV, DC Bureau…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              <Label>Capacity</Label>
              <Input
                type="number"
                min={1}
                data-testid="input-capacity"
                value={capacity}
                onChange={(e) => {
                  const newCap = Math.max(1, parseInt(e.target.value) || 1);
                  setCapacity(newCap);
                  const newMax = Math.ceil(newCap / 10);
                  if (instructorIds.length > newMax) {
                    setInstructorIds(instructorIds.slice(0, newMax));
                  }
                }}
              />
              {maxInstructors > 1 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Up to {maxInstructors} instructors for {capacity} students
                </p>
              )}
            </div>
          </div>
          <div>
            <Label>Location</Label>
            <LocationAutocomplete
              data-testid="input-location"
              value={location}
              onChange={setLocation}
              placeholder="Address"
            />
          </div>
          <div>
            <Label>Time zone</Label>
            <Select value={timeZone} onValueChange={setTimeZone}>
              <SelectTrigger data-testid="select-class-time-zone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_ZONE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Automatically set from the matching location when available.
            </p>
          </div>
          <div>
            <Label>
              {maxInstructors > 1
                ? `Instructors (up to ${maxInstructors})`
                : "Instructor"}
            </Label>
            <div className="space-y-2 mt-1">
              {instructorIds.map((id, idx) => {
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
                        setInstructorIds(instructorIds.filter((_, i) => i !== idx))
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              {instructorIds.length < maxInstructors && (
                <Select
                  value="none"
                  onValueChange={(v) => {
                    if (v !== "none")
                      setInstructorIds([...instructorIds, parseInt(v, 10)]);
                  }}
                >
                  <SelectTrigger data-testid="select-instructor">
                    <SelectValue
                      placeholder={
                        instructorIds.length === 0
                          ? "Unassigned"
                          : "Add another instructor"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {instructorIds.length === 0
                        ? "Unassigned"
                        : "— add instructor —"}
                    </SelectItem>
                    {instructors
                      .filter((i) => i.isActive && !instructorIds.includes(i.id))
                      .map((i) => (
                        <SelectItem key={i.id} value={i.id.toString()}>
                          {i.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
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
            <Label>Business unit</Label>
            <Select
              value={businessUnit || "none"}
              onValueChange={(v) => setBusinessUnit(v === "none" ? "" : v)}
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
          <div>
            <Label>Additional information</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-class-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLASS_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
  being_scheduled: "bg-amber-100 text-amber-800",
  pending_schedule: "bg-orange-100 text-orange-800",
  confirmed:        "bg-emerald-100 text-emerald-800",
  completed:        "bg-muted text-muted-foreground",
  cancelled:        "bg-destructive/15 text-destructive",
  scheduled:        "bg-primary text-primary-foreground", // legacy
};

const STATUS_LABEL: Record<string, string> = {
  being_scheduled: "Scheduling",
  pending_schedule: "Inquiry",
  confirmed:        "Confirmed",
  completed:        "Completed",
  cancelled:        "Cancelled",
  scheduled:        "Scheduled",
};

/** Canonical status options used in every class create/edit form across the app. */
export const CLASS_STATUS_OPTIONS = [
  { value: "pending_schedule", label: "Inquiry" },
  { value: "being_scheduled",  label: "Scheduling" },
  { value: "confirmed",        label: "Confirmed" },
  { value: "completed",        label: "Completed" },
  { value: "cancelled",        label: "Cancelled" },
] as const;

/** Statuses considered "active" (not yet done or cancelled). */
const ACTIVE_STATUSES = new Set(["being_scheduled", "pending_schedule", "confirmed", "scheduled"]);

const CERT_ACCENT: Record<string, string> = {
  cpr_aed_first_aid: "#007BA7",
  stop_the_bleed:    "#4CAF50",
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
                      STATUS_CHIP[cls.status] ?? STATUS_CHIP.confirmed,
                    )}
                    title={`${cls.title} — ${cls.startTime} @ ${cls.location}`}
                  >
                    <span className="block truncate">{cls.title}</span>
                    <span className="block truncate text-[10px] font-normal opacity-75">
                      {formatTimeZone(cls.timeZone)}
                    </span>
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
      <div className="flex items-center gap-4 px-5 py-3 border-t border-border bg-muted/20 flex-wrap">
        {[
          { label: "Being scheduled", cls: "bg-amber-400" },
          { label: "Inquiry", cls: "bg-orange-400" },
          { label: "Confirmed", cls: "bg-emerald-500" },
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

function OverdueClassesBanner({ classes }: { classes: ClassSession[] }) {
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<{ id: number; action: "completed" | "cancelled" } | null>(null);

  const update = useUpdateClass({
    mutation: {
      onSuccess: (_d, vars) => {
        qc.invalidateQueries({ queryKey: getListClassesQueryKey() });
        qc.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() });
        const action = pending?.action ?? "completed";
        toast({ title: action === "completed" ? "Class marked as completed" : "Class cancelled" });
        setDismissed((s) => new Set([...s, vars.classId]));
        setPending(null);
      },
      onError: () => {
        toast({ title: "Failed to update class", variant: "destructive" });
        setPending(null);
      },
    },
  });

  const today = new Date().toISOString().split("T")[0]!;
  const overdue = classes.filter(
    (c) => (c.status === "confirmed" || c.status === "scheduled") && c.date < today && !dismissed.has(c.id),
  );

  if (overdue.length === 0) return null;

  function act(id: number, action: "completed" | "cancelled") {
    setPending({ id, action });
    update.mutate({ classId: id, data: { status: action } });
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-amber-800">
          {overdue.length === 1
            ? "1 class has passed without being closed out"
            : `${overdue.length} classes have passed without being closed out`}
        </p>
        <button
          onClick={() => setDismissed(new Set(overdue.map((c) => c.id)))}
          className="text-amber-500 hover:text-amber-700 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-2">
        {overdue.map((c) => {
          const busy = pending?.id === c.id && update.isPending;
          return (
            <div key={c.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-amber-900 truncate">
                <span className="font-medium">{c.title}</span>
                <span className="text-amber-600 ml-2 text-xs">{c.date}</span>
                {c.location && <span className="text-amber-600 ml-1 text-xs">· {c.location}</span>}
              </span>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-300 text-amber-800 hover:bg-amber-100 h-7 text-xs"
                  disabled={busy}
                  onClick={() => act(c.id, "completed")}
                >
                  {busy && pending?.action === "completed" ? "Saving…" : "Mark completed"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50 h-7 text-xs"
                  disabled={busy}
                  onClick={() => act(c.id, "cancelled")}
                >
                  {busy && pending?.action === "cancelled" ? "Saving…" : "Cancel class"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Classes() {
  const { role, userId } = useAuth();
  const qs = useSearch();
  const [view, setView] = useState<"list" | "calendar">("list");
  const validTabs = ["all", "upcoming", "completed", "scheduling", "cancelled"] as const;
  type TabValue = typeof validTabs[number];
  const paramTab = new URLSearchParams(qs).get("tab");
  const initialTab = validTabs.includes(paramTab as TabValue) ? (paramTab as TabValue) : "all";
  const [tab, setTab] = useState<TabValue>(initialTab);
  const [deletingClass, setDeletingClass] = useState<ClassSession | null>(null);
  const [search, setSearch] = useState("");
  const [certFilter, setCertFilter] = useState<CertificationType | "all">("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: allClasses = [], isLoading } = useListClasses();
  const isAdmin = role === "administrator";
  const today = new Date().toISOString().split("T")[0]!;
  const incompleteUpcoming = isAdmin
    ? allClasses.filter(
        (c) =>
          ["confirmed", "scheduled"].includes(String(c.status)) &&
          c.date >= today &&
          (!c.location || c.location === "TBD" || !c.instructorName),
      )
    : [];
  const qc = useQueryClient();
  const deleteClass = useDeleteClass({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListClassesQueryKey() });
        setDeletingClass(null);
      },
    },
  });

  const tabClasses =
    tab === "upcoming"
      ? allClasses.filter((c) => c.status === "confirmed" || c.status === "scheduled")
      : tab === "completed"
        ? allClasses.filter((c) => c.status === "completed")
        : tab === "scheduling"
          ? allClasses.filter((c) => c.status === "being_scheduled" || c.status === "pending_schedule")
          : tab === "cancelled"
            ? allClasses.filter((c) => c.status === "cancelled")
            : allClasses;

  const q = search.trim().toLowerCase();
  const listClasses = tabClasses
    .filter((c) => {
      const matchSearch =
        !q ||
        c.title.toLowerCase().includes(q) ||
        (c.location ?? "").toLowerCase().includes(q);
      const matchCert = certFilter === "all" || c.certificationType === certFilter;
      return matchSearch && matchCert;
    })
    .sort((a, b) =>
      tab === "upcoming"
        ? a.date.localeCompare(b.date)   // oldest first for active
        : b.date.localeCompare(a.date),  // newest first for all / completed
    );

  const calendarClasses = allClasses.filter((c) => {
    const matchSearch =
      !q ||
      c.title.toLowerCase().includes(q) ||
      (c.location ?? "").toLowerCase().includes(q);
    const matchCert = certFilter === "all" || c.certificationType === certFilter;
    return matchSearch && matchCert;
  });

  const activeFilterCount = (certFilter !== "all" ? 1 : 0);

  function clearFilters() {
    setSearch("");
    setCertFilter("all");
  }

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
      <OverdueClassesBanner classes={allClasses} />
      {isAdmin && incompleteUpcoming.length > 0 && (
        <div
          className="flex items-start gap-3 rounded-lg border px-4 py-3 mb-4 text-sm"
          style={{ background: "#FFFBEB", borderColor: "#FCD34D", color: "#78350F" }}
          data-testid="banner-incomplete-classes"
        >
          <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#D97706" }} />
          <span>
            <strong>
              {incompleteUpcoming.length}{" "}
              {incompleteUpcoming.length === 1 ? "upcoming class is" : "upcoming classes are"}
            </strong>{" "}
            missing a location or instructor. Find them below — each card shows exactly what is needed.
          </span>
        </div>
      )}

      {/* My Schedule — shown to instructors with a known userId */}
      {role === "instructor" && userId !== null && (
        <MyScheduleSection userId={userId} />
      )}

      {/* Search + Filter bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by title or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 relative">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                  style={{ background: "#007BA7" }}>
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Certification type
              </p>
              <div className="space-y-1.5">
                {([["all", "Any type"], ...CERT_TYPES.map((c) => [c, formatCertificationType(c)])] as [string, string][]).map(
                  ([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setCertFilter(value as CertificationType | "all")}
                      className={cn(
                        "w-full text-left text-sm px-3 py-1.5 rounded-md transition-colors",
                        certFilter === value
                          ? "font-semibold text-white"
                          : "text-foreground hover:bg-muted",
                      )}
                      style={certFilter === value ? { background: "#007BA7" } : {}}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { clearFilters(); setFilterOpen(false); }}
                className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 text-center pt-1"
              >
                Clear all filters
              </button>
            )}
          </PopoverContent>
        </Popover>

        {(search || activeFilterCount > 0) && (
          <button
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {view === "calendar" ? (
        isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <CalendarView classes={calendarClasses} />
        )
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="scheduling" data-testid="tab-scheduling">
              Scheduling
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed">
              Completed
            </TabsTrigger>
            <TabsTrigger value="cancelled" data-testid="tab-cancelled">
              Cancelled
            </TabsTrigger>
            <TabsTrigger value="all" data-testid="tab-all">
              All
            </TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : listClasses.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-sm text-muted-foreground text-center">
                  {search || activeFilterCount > 0
                    ? "No classes match your search or filters."
                    : "No classes found."}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listClasses.map((c) => (
                  <ClassCard
                    key={c.id}
                    session={c}
                    showIncompleteWarning={isAdmin}
                    onDelete={role === "administrator" ? () => setDeletingClass(c) : undefined}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <AlertDialog open={!!deletingClass} onOpenChange={(v) => !v && setDeletingClass(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deletingClass?.title}"?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>This will permanently delete:</p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>The class record</li>
                  <li>All roster sign-in entries</li>
                  <li>All enrollment records</li>
                  <li>Certificates will be preserved but unlinked from this class</li>
                </ul>
                <p className="font-medium text-foreground pt-1">This cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingClass && deleteClass.mutate({ classId: deletingClass.id })}
            >
              {deleteClass.isPending ? "Deleting…" : "Delete class"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MyScheduleCard({ session }: { session: ClassSession }) {
  const accent = CERT_ACCENT[session.certificationType] ?? DEFAULT_ACCENT;
  return (
    <div
      className="bg-card rounded-2xl overflow-hidden flex flex-col"
      style={{ border: "1px solid hsl(200 18% 90%)", boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.06)" }}
    >
      {/* Cert-type stripe */}
      <div className="h-1 w-full shrink-0" style={{ background: accent }} />

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Cert badge + title */}
        <div>
          <span
            className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-2 text-white"
            style={{ background: accent }}
          >
            {formatCertificationType(session.certificationType)}
          </span>
          <h3 className="font-semibold text-base leading-tight text-foreground">
            {session.title}
          </h3>
        </div>

        {/* Date / time / location */}
        <div className="text-xs space-y-1.5" style={{ color: "#A9B0B3" }}>
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
            <span>{formatDate(session.date)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
            <span>
              {formatTime(session.startTime ?? "")}
              {session.endTime ? ` – ${formatTime(session.endTime)}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe2 className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
            <span className="truncate">{formatTimeZone(session.timeZone)}</span>
          </div>
          {session.location && session.location !== "TBD" && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
              <span className="truncate">{session.location}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto pt-1 flex-wrap">
          <Link href={`/classes/${session.id}`}>
            <Button variant="outline" size="sm" className="text-xs h-7">
              View details
            </Button>
          </Link>
          <Link href={`/classes/${session.id}/signin-sheet`}>
            <Button size="sm" className="text-xs h-7 gap-1" style={{ background: accent, color: "#fff" }}>
              <ClipboardList className="h-3.5 w-3.5" />
              Sign-in sheet
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function MyScheduleSection({ userId }: { userId: number }) {
  const { data: myClasses = [], isLoading } = useListClasses(
    { instructorId: userId, upcoming: true },
  );

  // Only show active (non-completed, non-cancelled) upcoming classes
  const upcoming = myClasses
    .filter((c) => ACTIVE_STATUSES.has(c.status))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? ""));

  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-foreground">My Schedule</h2>
        <p className="text-sm text-muted-foreground">
          Your upcoming assigned classes
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : upcoming.length === 0 ? (
        <Card>
          <CardContent className="pt-6 pb-6 text-sm text-muted-foreground text-center">
            You have no upcoming classes scheduled.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcoming.map((c) => (
            <MyScheduleCard key={c.id} session={c} />
          ))}
        </div>
      )}
    </section>
  );
}

const DEFAULT_ACCENT = "#008080";
