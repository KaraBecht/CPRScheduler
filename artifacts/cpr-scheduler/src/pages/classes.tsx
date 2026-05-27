import { useState } from "react";
import {
  useListClasses,
  useCreateClass,
  getListClassesQueryKey,
  type CertificationType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { ClassCard } from "@/components/ClassCard";
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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCertificationType } from "@/lib/format";

const CERT_TYPES: CertificationType[] = [
  "cpr_aed_first_aid",
  "stop_the_bleed",
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
              <Input
                data-testid="input-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="1211"
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

export default function Classes() {
  const { role } = useAuth();
  const [tab, setTab] = useState<"all" | "upcoming" | "completed">("upcoming");
  const { data: classes = [], isLoading } = useListClasses(
    tab === "all"
      ? undefined
      : tab === "upcoming"
        ? { upcoming: true }
        : { status: "completed" },
  );

  return (
    <>
      <PageHeader
        title="Classes"
        subtitle="Every scheduled, upcoming, and completed CPR training session."
        action={role === "administrator" ? <CreateClassDialog /> : null}
      />
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
          ) : classes.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground text-center">
                No classes found.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((c) => (
                <ClassCard key={c.id} session={c} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
