import { useRoute, Link } from "wouter";
import { useEffect, useState } from "react";
import {
  useGetClass,
  useGetClassRoster,
  useSaveClassRoster,
  getGetClassRosterQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

type Entry = { position: number; name: string; email: string; phone: string };

export default function ClassRoster() {
  const [, params] = useRoute("/classes/:id/roster");
  const classId = parseInt(params?.id ?? "0", 10);
  const qc = useQueryClient();
  const { role } = useAuth();
  const canEdit = role === "administrator" || role === "instructor";

  const { data: cls } = useGetClass(classId);
  const { data: roster, isLoading } = useGetClassRoster(classId);
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    if (roster) setEntries(roster.entries.map((e) => ({ ...e })));
  }, [roster]);

  const save = useSaveClassRoster({
    mutation: {
      onSuccess: () => {
        toast({ title: "Roster saved" });
        qc.invalidateQueries({ queryKey: getGetClassRosterQueryKey(classId) });
      },
      onError: () =>
        toast({ title: "Failed to save roster", variant: "destructive" }),
    },
  });

  const update = (i: number, patch: Partial<Entry>) =>
    setEntries((prev) =>
      prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    );

  if (isLoading || !roster || !cls) {
    return <PageHeader title="Loading roster..." />;
  }

  return (
    <>
      <Link
        href={`/classes/${classId}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        data-testid="link-back-to-class"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to class
      </Link>
      <PageHeader
        title={`${cls.title} — Roster`}
        subtitle={`Up to ${roster.capacity} attendees · ${cls.location} · ${cls.date}`}
        action={
          canEdit && (
            <Button
              data-testid="button-save-roster"
              disabled={save.isPending}
              onClick={() => save.mutate({ classId, data: { entries } })}
            >
              <Save className="h-4 w-4 mr-1.5" /> Save roster
            </Button>
          )
        }
      />
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="hidden md:grid grid-cols-[2rem_1fr_1fr_1fr] gap-3 text-xs font-medium text-muted-foreground px-1">
            <span>#</span>
            <span>Name</span>
            <span>Email</span>
            <span>Phone</span>
          </div>
          {entries.map((e, i) => (
            <div
              key={i}
              className="grid grid-cols-1 md:grid-cols-[2rem_1fr_1fr_1fr] gap-3 items-center"
              data-testid={`roster-row-${i}`}
            >
              <span className="text-sm text-muted-foreground font-mono">
                {i + 1}
              </span>
              <div>
                <Label className="md:hidden text-xs">Name</Label>
                <Input
                  value={e.name}
                  readOnly={!canEdit}
                  placeholder="Full name"
                  data-testid={`input-roster-name-${i}`}
                  onChange={(ev) => update(i, { name: ev.target.value })}
                />
              </div>
              <div>
                <Label className="md:hidden text-xs">Email</Label>
                <Input
                  type="email"
                  value={e.email}
                  readOnly={!canEdit}
                  placeholder="name@example.com"
                  data-testid={`input-roster-email-${i}`}
                  onChange={(ev) => update(i, { email: ev.target.value })}
                />
              </div>
              <div>
                <Label className="md:hidden text-xs">Phone</Label>
                <Input
                  type="tel"
                  value={e.phone}
                  readOnly={!canEdit}
                  placeholder="(555) 123-4567"
                  data-testid={`input-roster-phone-${i}`}
                  onChange={(ev) => update(i, { phone: ev.target.value })}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
