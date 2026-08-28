import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, trainingInquiriesTable } from "@workspace/db";
import { CreateInquiryBody } from "@workspace/api-zod";

const router: IRouter = Router();

function serializeInquiry(row: typeof trainingInquiriesTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    division: row.division,
    location: row.location,
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

  const [row] = await db
    .insert(trainingInquiriesTable)
    .values({
      name: parsed.data.name.trim(),
      phone: parsed.data.phone.trim(),
      division: parsed.data.division.trim(),
      location: parsed.data.location.trim(),
    })
    .returning();

  res.status(201).json(serializeInquiry(row));
});

export default router;