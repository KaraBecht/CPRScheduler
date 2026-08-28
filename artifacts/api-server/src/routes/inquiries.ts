import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, trainingInquiriesTable, type TrainingInquiryPerson } from "@workspace/db";
import { CreateInquiryBody } from "@workspace/api-zod";

const router: IRouter = Router();

function serializeInquiry(row: typeof trainingInquiriesTable.$inferSelect) {
  const people =
    Array.isArray(row.people) && row.people.length > 0
      ? row.people
      : [{ name: row.name, phone: row.phone }];

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    division: row.division,
    location: row.location,
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
    { name: parsed.data.name, phone: parsed.data.phone },
  ]).map((person) => ({
    name: person.name.trim(),
    phone: person.phone.trim(),
  }));

  if (people.some((person) => !person.name || !person.phone)) {
    res.status(400).json({ error: "Every person must have a name and phone number" });
    return;
  }

  const [row] = await db
    .insert(trainingInquiriesTable)
    .values({
      name: people[0].name,
      phone: people[0].phone,
      division: parsed.data.division.trim(),
      location: parsed.data.location.trim(),
      people,
    })
    .returning();

  res.status(201).json(serializeInquiry(row));
});

export default router;