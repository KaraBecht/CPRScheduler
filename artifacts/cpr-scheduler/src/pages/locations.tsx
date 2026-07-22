import { useState } from "react";
import {
  useListLocations,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
  useCreateLocationNote,
  useDeleteLocationNote,
  getListLocationsQueryKey,
  type LocationDetail,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  MapPin,
  User,
  Mail,
  Phone,
  CalendarDays,
  AlertTriangle,
  MessageSquare,
  Trash2,
  Pencil,
  Search,
  ChevronDown,
  ChevronUp,
  Send,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CERT_LABELS: Record<string, string> = {
  cpr_aed_first_aid: "CPR+AED",
  stop_the_bleed: "Stop the Bleed",
  cpr_aed_first_aid_stop_the_bleed: "CPR+STB",
};

// ─── Add / Edit dialog ────────────────────────────────────────────────────────

type LocationForm = {
  name: string;
  address: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
};

const EMPTY_FORM: LocationForm = {
  name: "",
  address: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  notes: "",
};

function LocationFormDialog({
  initial,
  trigger,
  onSave,
  isPending,
}: {
  initial?: LocationForm;
  trigger: React.ReactNode;
  onSave: (form: LocationForm) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LocationForm>(initial ?? EMPTY_FORM);

  function handleOpen(v: boolean) {
    if (v) setForm(initial ?? EMPTY_FORM);
    setOpen(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit location" : "Add location"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label>Location name *</Label>
            <Input
              placeholder="e.g. Riverside Fire Station 4"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="input-location-name"
            />
          </div>
          <div>
            <Label>Address</Label>
            <Input
              placeholder="123 Main St, City, State 12345"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Contact name</Label>
              <Input
                placeholder="Jane Smith"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              />
            </div>
            <div>
              <Label>Contact phone</Label>
              <Input
                placeholder="(555) 000-0000"
                value={form.contactPhone}
                onChange={(e) =>
                  setForm({ ...form, contactPhone: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <Label>Contact email</Label>
            <Input
              type="email"
              placeholder="contact@example.com"
              value={form.contactEmail}
              onChange={(e) =>
                setForm({ ...form, contactEmail: e.target.value })
              }
            />
          </div>
          <div>
            <Label>General notes</Label>
            <Textarea
              rows={3}
              placeholder="Parking info, building access, scheduling preferences…"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!form.name.trim() || isPending}
            onClick={() => {
              onSave(form);
              setOpen(false);
            }}
            data-testid="button-save-location"
          >
            {initial ? "Save changes" : "Add location"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add note inline ──────────────────────────────────────────────────────────

function AddNoteForm({
  locationId,
  onDone,
}: {
  locationId: number;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const create = useCreateLocationNote({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        setBody("");
        onDone();
        toast({ title: "Note added" });
      },
      onError: () => toast({ title: "Failed to add note", variant: "destructive" }),
    },
  });

  return (
    <div className="flex gap-2 mt-2">
      <Textarea
        rows={2}
        placeholder="Scheduling conversation, follow-up details…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="flex-1 text-sm"
      />
      <Button
        size="sm"
        className="self-end"
        disabled={!body.trim() || create.isPending}
        onClick={() =>
          create.mutate({ locationId, data: { body } })
        }
      >
        <Send className="h-3.5 w-3.5 mr-1" />
        Add
      </Button>
    </div>
  );
}

// ─── Location card ────────────────────────────────────────────────────────────

function LocationCard({ loc }: { loc: LocationDetail }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  const update = useUpdateLocation({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        toast({ title: "Location updated" });
      },
      onError: () =>
        toast({ title: "Failed to update", variant: "destructive" }),
    },
  });

  const del = useDeleteLocation({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        toast({ title: "Location deleted" });
      },
      onError: () =>
        toast({ title: "Failed to delete", variant: "destructive" }),
    },
  });

  const delNote = useDeleteLocationNote({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        toast({ title: "Note deleted" });
      },
      onError: () =>
        toast({ title: "Failed to delete note", variant: "destructive" }),
    },
  });

  const expiringCount = loc.expiringCertificates?.length ?? 0;

  return (
    <Card
      className="overflow-hidden"
      data-testid={`location-card-${loc.id}`}
    >
      <CardContent className="pt-5 pb-4">
        {/* ── Header row ── */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base leading-tight">
                {loc.name}
              </h3>
              {expiringCount > 0 && (
                <Badge
                  variant="destructive"
                  className="text-[10px] px-1.5 py-0"
                >
                  <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                  {expiringCount} cert{expiringCount !== 1 ? "s" : ""} expiring
                </Badge>
              )}
            </div>
            {loc.address && (
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" />
                <span>{loc.address}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <LocationFormDialog
              initial={{
                name: loc.name,
                address: loc.address ?? "",
                contactName: loc.contactName ?? "",
                contactEmail: loc.contactEmail ?? "",
                contactPhone: loc.contactPhone ?? "",
                notes: loc.notes ?? "",
              }}
              trigger={
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  data-testid={`button-edit-location-${loc.id}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              }
              onSave={(form) =>
                update.mutate({
                  locationId: loc.id,
                  data: {
                    name: form.name || undefined,
                    address: form.address || undefined,
                    contactName: form.contactName || undefined,
                    contactEmail: form.contactEmail || undefined,
                    contactPhone: form.contactPhone || undefined,
                    notes: form.notes || undefined,
                  },
                })
              }
              isPending={update.isPending}
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  data-testid={`button-delete-location-${loc.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete location?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete <strong>{loc.name}</strong> and
                    all its communication notes. Classes linked by name are not
                    affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => del.mutate({ locationId: loc.id })}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* ── Contact row ── */}
        {(loc.contactName || loc.contactEmail || loc.contactPhone) && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {loc.contactName && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {loc.contactName}
              </span>
            )}
            {loc.contactEmail && (
              <a
                href={`mailto:${loc.contactEmail}`}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Mail className="h-3 w-3" />
                {loc.contactEmail}
              </a>
            )}
            {loc.contactPhone && (
              <a
                href={`tel:${loc.contactPhone}`}
                className="flex items-center gap-1 hover:text-foreground"
              >
                <Phone className="h-3 w-3" />
                {loc.contactPhone}
              </a>
            )}
          </div>
        )}

        {/* ── Quick stats row ── */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {loc.lastClassDate ? (
              <span>
                Last class:{" "}
                <span className="font-medium text-foreground">
                  {formatDate(loc.lastClassDate)}
                </span>
                {loc.lastClassTitle && (
                  <span className="ml-1 text-muted-foreground">
                    — {loc.lastClassTitle}
                  </span>
                )}
              </span>
            ) : (
              <span className="italic">No classes yet</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>
              {loc.notes_log?.length ?? 0} comm note
              {(loc.notes_log?.length ?? 0) !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* ── General notes (always visible if present) ── */}
        {loc.notes && (
          <p className="mt-3 text-xs text-foreground/70 bg-muted/50 rounded-lg px-3 py-2 italic">
            {loc.notes}
          </p>
        )}

        {/* ── Expand / collapse toggle ── */}
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 h-7 px-2 text-xs text-muted-foreground w-full justify-center"
          onClick={() => setExpanded((v) => !v)}
          data-testid={`button-expand-location-${loc.id}`}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5 mr-1" /> Hide details
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5 mr-1" /> Show details
            </>
          )}
        </Button>

        {/* ── Expanded section ── */}
        {expanded && (
          <div className="mt-2 space-y-4 border-t border-border pt-4">

            {/* Expiring certificates */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Certificates expiring within 90 days
              </h4>
              {expiringCount === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No certificates expiring soon at this location.
                </p>
              ) : (
                <div className="space-y-1">
                  {loc.expiringCertificates.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0"
                    >
                      <span className="font-medium">{c.studentName ?? "—"}</span>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] px-1">
                          {CERT_LABELS[c.certificationType] ?? c.certificationType}
                        </Badge>
                        <span>expires {formatDate(c.expiryDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Communication notes log */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Scheduling / communication notes
                </h4>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs"
                  onClick={() => setAddingNote((v) => !v)}
                  data-testid={`button-add-note-${loc.id}`}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add note
                </Button>
              </div>

              {addingNote && (
                <AddNoteForm
                  locationId={loc.id}
                  onDone={() => setAddingNote(false)}
                />
              )}

              {(loc.notes_log?.length ?? 0) === 0 && !addingNote ? (
                <p className="text-xs text-muted-foreground italic">
                  No communication notes yet.
                </p>
              ) : (
                <div className="space-y-2 mt-2">
                  {loc.notes_log?.map((note) => (
                    <div
                      key={note.id}
                      className={cn(
                        "group relative rounded-lg bg-muted/50 px-3 py-2 text-xs",
                      )}
                      data-testid={`note-${note.id}`}
                    >
                      <p className="whitespace-pre-wrap text-foreground/80 pr-6">
                        {note.body}
                      </p>
                      <p className="text-muted-foreground mt-1">
                        {new Date(note.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-1.5 right-1.5 h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          delNote.mutate({
                            locationId: loc.id,
                            noteId: note.id,
                          })
                        }
                        data-testid={`button-delete-note-${note.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Locations() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const { data: locations = [], isLoading } = useListLocations();

  const create = useCreateLocation({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        toast({ title: "Location added" });
      },
      onError: () =>
        toast({ title: "Failed to add location", variant: "destructive" }),
    },
  });

  const q = query.trim().toLowerCase();
  const filtered = locations.filter((loc) => {
    if (!q) return true;
    return (
      loc.name.toLowerCase().includes(q) ||
      (loc.address ?? "").toLowerCase().includes(q) ||
      (loc.contactName ?? "").toLowerCase().includes(q) ||
      (loc.contactEmail ?? "").toLowerCase().includes(q)
    );
  });

  const expiringTotal = locations.reduce(
    (sum, l) => sum + (l.expiringCertificates?.length ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        title="Locations"
        subtitle="Training venues, contacts, and scheduling history."
        action={
          <LocationFormDialog
            trigger={
              <Button data-testid="button-add-location">
                <Plus className="h-4 w-4 mr-1.5" /> Add location
              </Button>
            }
            onSave={(form) =>
              create.mutate({
                data: {
                  name: form.name,
                  address: form.address || undefined,
                  contactName: form.contactName || undefined,
                  contactEmail: form.contactEmail || undefined,
                  contactPhone: form.contactPhone || undefined,
                  notes: form.notes || undefined,
                },
              })
            }
            isPending={create.isPending}
          />
        }
      />

      {/* ── Summary badges ── */}
      {locations.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline">
            {locations.length} location{locations.length !== 1 ? "s" : ""}
          </Badge>
          {expiringTotal > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              <AlertTriangle className="h-2.5 w-2.5 mr-1" />
              {expiringTotal} cert{expiringTotal !== 1 ? "s" : ""} expiring &lt;
              90 days
            </Badge>
          )}
        </div>
      )}

      {/* ── Search ── */}
      {locations.length > 0 && (
        <div className="relative max-w-sm mb-5">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Filter by name, address, or contact…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="input-locations-filter"
          />
        </div>
      )}

      {/* ── Content ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-5 h-32" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center text-sm text-muted-foreground">
            {locations.length === 0
              ? "No locations yet. Add your first training venue above."
              : "No locations match the current filter."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((loc) => (
            <LocationCard key={loc.id} loc={loc} />
          ))}
        </div>
      )}
    </>
  );
}
