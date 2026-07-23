import { Router, type IRouter } from "express";
import { parseId } from "../lib/errors";
import { db, remindersTable, classesTable } from "@workspace/db";
import { eq, lte, and } from "drizzle-orm";
import { serializeClass } from "./classes";

const router: IRouter = Router();

async function serializeReminder(row: typeof remindersTable.$inferSelect) {
  const [classRow] = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.id, row.classId));

  return {
    id: row.id,
    classId: row.classId,
    triggerDate: row.triggerDate,
    status: row.status,
    emailSubject: row.emailSubject,
    emailBody: row.emailBody,
    createdAt: row.createdAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
    class: classRow ? await serializeClass(classRow) : null,
  };
}

router.get("/reminders", async (req, res) => {
  const status = req.query["status"] as string | undefined;
  const due = req.query["due"] === "true";
  const today = new Date().toISOString().split("T")[0]!;

  const conditions = [];
  if (status) conditions.push(eq(remindersTable.status, status as "pending" | "sent" | "dismissed"));
  if (due) conditions.push(lte(remindersTable.triggerDate, today));

  const rows = await db
    .select()
    .from(remindersTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(remindersTable.triggerDate);

  const out = await Promise.all(rows.map(serializeReminder));
  res.json(out);
});

const VALID_STATUSES = ["pending", "sent", "dismissed"] as const;
type ReminderStatus = (typeof VALID_STATUSES)[number];

router.patch("/reminders/:reminderId", async (req, res) => {
  const reminderId = parseId(req.params.reminderId, "reminderId");
  const rawStatus = req.body?.status as string | undefined;
  if (rawStatus !== undefined && !VALID_STATUSES.includes(rawStatus as ReminderStatus)) {
    res.status(400).json({ error: `Invalid status: ${rawStatus}` });
    return;
  }
  const body = { status: rawStatus as ReminderStatus | undefined };

  const updateData: Partial<typeof remindersTable.$inferInsert> = {};
  if (body.status !== undefined) {
    updateData.status = body.status;
    if (body.status === "sent") updateData.sentAt = new Date();
  }

  const [row] = await db
    .update(remindersTable)
    .set(updateData)
    .where(eq(remindersTable.id, reminderId))
    .returning();

  if (!row) { res.status(404).json({ error: "Reminder not found" }); return; }
  res.json(await serializeReminder(row));
});

export default router;
