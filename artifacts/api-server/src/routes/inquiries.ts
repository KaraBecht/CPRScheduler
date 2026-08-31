import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, trainingInquiriesTable, type TrainingInquiryPerson } from "@workspace/db";
import {
  CreateInquiryBody,
  DeleteInquiryBody,
  UpdateInquiryPersonStatusBody,
  UpdateInquiryBody,
} from "@workspace/api-zod";
import { parseId } from "../lib/errors";

const router: IRouter = Router();

const PERSON_STATUSES = ["interested", "scheduled", "completed", "not_interested"] as const;
type PersonStatus = (typeof PERSON_STATUSES)[number];

function isPersonStatus(value: unknown): value is PersonStatus {
  return typeof value === "string" && PERSON_STATUSES.includes(value as PersonStatus);
}

function getPeople(row: typeof trainingInquiriesTable.$inferSelect): TrainingInquiryPerson[] {
  const rawPeople =
    Array.isArray(row.people) && row.people.length > 0
      ? row.people
      : [{ name: row.name, phone: row.phone, email: "" }];
  return rawPeople.map((person) => ({
    name: person.name,
    phone: person.phone,
    email: "email" in person && typeof person.email === "string" ? person.email : "",
    status: isPersonStatus(person.status) ? person.status : "interested",
  }));
}

function serializeInquiry(row: typeof trainingInquiriesTable.$inferSelect) {
  const people = getPeople(row);

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    division: row.division,
    location: row.location,
    note: row.note ?? "",
    people,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/inquiries", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(trainingInquiriesTable)
    .orderBy(desc(trainingInquiriesTable.createdAt));
  res.json(rows.map(serializeInquiry));
});

router.post("/inquiries", async (req, res): Promise<void> => {
  const parsed = CreateInquiryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const people: TrainingInquiryPerson[] = (parsed.data.people ?? [
    { name: parsed.data.name, phone: parsed.data.phone ?? "", email: "" },
  ]).map((person) => ({
    name: person.name.trim(),
    phone: person.phone.trim(),
    email: person.email.trim(),
    status: "interested" as const,
  }));

  if (people.some((person) => !person.name || !person.email)) {
    res.status(400).json({ error: "Every person must have a name and email" });
    return;
  }

  const [row] = await db
    .insert(trainingInquiriesTable)
    .values({
      name: people[0].name,
      phone: people[0].phone,
      division: parsed.data.division.trim(),
      location: parsed.data.location.trim(),
      note: parsed.data.note?.trim() ?? "",
      people,
    })
    .returning();

  res.status(201).json(serializeInquiry(row));
});

router.patch("/inquiries/:inquiryId/people/:personIndex", async (req, res): Promise<void> => {
  const inquiryId = parseId(req.params.inquiryId, "inquiryId");
  const personIndex = Number(req.params.personIndex);
  if (!Number.isInteger(personIndex) || personIndex < 0) {
    res.status(400).json({ error: `Invalid personIndex: ${req.params.personIndex}` });
    return;
  }
  const parsed = UpdateInquiryPersonStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(trainingInquiriesTable)
    .where(eq(trainingInquiriesTable.id, inquiryId));
  if (!existing) {
    res.status(404).json({ error: "Training interest not found" });
    return;
  }

  const people = getPeople(existing);
  if (personIndex >= people.length) {
    res.status(404).json({ error: "Person not found in training interest" });
    return;
  }
  people[personIndex] = { ...people[personIndex], status: parsed.data.status };

  const [row] = await db
    .update(trainingInquiriesTable)
    .set({ people })
    .where(eq(trainingInquiriesTable.id, inquiryId))
    .returning();
  res.json(serializeInquiry(row));
});

router.patch("/inquiries/:inquiryId", async (req, res): Promise<void> => {
  const inquiryId = parseId(req.params.inquiryId, "inquiryId");
  const parsed = UpdateInquiryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .update(trainingInquiriesTable)
    .set({ archivedAt: parsed.data.archived ? new Date() : null })
    .where(eq(trainingInquiriesTable.id, inquiryId))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Training interest not found" });
    return;
  }
  res.json(serializeInquiry(row));
});

router.delete("/inquiries/:inquiryId", async (req, res): Promise<void> => {
  const inquiryId = parseId(req.params.inquiryId, "inquiryId");
  const parsed = DeleteInquiryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Permanent deletion requires explicit confirmation" });
    return;
  }
  const deleted = await db
    .delete(trainingInquiriesTable)
    .where(eq(trainingInquiriesTable.id, inquiryId))
    .returning({ id: trainingInquiriesTable.id });
  if (deleted.length === 0) {
    res.status(404).json({ error: "Training interest not found" });
    return;
  }
  res.status(204).send();
});

export default router;