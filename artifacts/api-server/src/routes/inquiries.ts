import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, trainingInquiriesTable, type TrainingInquiryPerson } from "@workspace/db";
import { CreateInquiryBody } from "@workspace/api-zod";

const router: IRouter = Router();

function serializeInquiry(row: typeof trainingInquiriesTable.$inferSelect) {
  const rawPeople =
    Array.isArray(row.people) && row.people.length > 0
      ? row.people
      : [{ name: row.name, phone: row.phone, email: "" }];
  const people = rawPeople.map((person) => ({
    name: person.name,
    phone: person.phone,
    email: "email" in person && typeof person.email === "string" ? person.email : "",
  }));

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    division: row.division,
    location: row.location,
    note: row.note ?? "",
    people,
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
    { name: parsed.data.name, phone: parsed.data.phone, email: "" },
  ]).map((person) => ({
    name: person.name.trim(),
    phone: person.phone.trim(),
    email: person.email.trim(),
  }));

  if (people.some((person) => !person.name || !person.phone || !person.email)) {
    res.status(400).json({ error: "Every person must have a name, phone number, and email" });
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

export default router;