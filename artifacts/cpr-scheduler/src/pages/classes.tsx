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
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCertificationType } from "@/lib/format";

const CERT_TYPES: CertificationType[] = [
  "adult_cpr",
  "pediatric_cpr",
  "cpr_aed",
  "bls",
  "first_aid",
];

function CreateClassDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: instructors = [] } = useListUsers({ role: "instructor" });
  const [form, setForm] = useState({
    title: "",
    certificationType: "cpr_aed" as CertificationType,
    date: "",
    startTime: "09:00",
    endTime: "12:00",
    location: "",
    capacity: 12,
    priceCents: 8500,
    instructorId: null as number | null,
    description: "",
  });
  const create = useCreateClass({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListClassesQueryKey() });
        toast({ title: "Class created" });
        setOpen(false);
        setForm({
          title: "",
          certificationType: "cpr_aed",
          date: "",
          startTime: "09:00",
          endTime: "12:00",
          location: "",
          capacity: 12,
          priceCents: 8500,
          instructorId: null,
          description: "",
        });
      },
      onError: () =>
        toast({ title: "Failed to create class", variant: "destructive" }),
    },
  });
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
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Adult CPR & AED — Saturday Morning"
            />
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
                value={form.instructorId?.toString() ?? "none"}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    instructorId: v === "none" ? null : parseInt(v, 10),
                  })
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                data-testid="input-date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Start</Label>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </div>
            <div>
              <Label>End</Label>
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Location</Label>
            <Input
              data-testid="input-location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="PulsePoint HQ — Studio A"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Capacity</Label>
              <Input
                type="number"
                value={form.capacity}
                onChange={(e) =>
                  setForm({ ...form, capacity: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div>
              <Label>Price (cents)</Label>
              <Input
                type="number"
                value={form.priceCents}
                onChange={(e) =>
                  setForm({ ...form, priceCents: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            data-testid="button-submit-class"
            disabled={!form.title || !form.date || !form.location || create.isPending}
            onClick={() =>
              create.mutate({
                data: {
                  ...form,
                  instructorId: form.instructorId ?? undefined,
                },
              })
            }
          >
            Create class
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
