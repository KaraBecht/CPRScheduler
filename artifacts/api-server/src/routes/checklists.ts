import { Router, type IRouter } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, classChecklistItemsTable, classChecklistHistoryTable, usersTable, classesTable } from "@workspace/db";
import { parseId } from "../lib/errors";

const router: IRouter = Router();
const eligible = (id: number) => db.select({ id: usersTable.id }).from(usersTable)
  .where(and(eq(usersTable.id, id), eq(usersTable.isActive, true),
    inArray(usersTable.role, ["administrator", "instructor"])));
async function assertEligible(id: number) {
  const rows = await eligible(id);
  if (!rows.length) throw new Error("Assignee must be an active administrator or instructor");
}
async function serialize(item: typeof classChecklistItemsTable.$inferSelect) {
  const [assignee] = item.assigneeId ? await db.select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable).where(eq(usersTable.id, item.assigneeId)) : [];
  return { ...item, assignee: assignee ?? null, history: await db.select().from(classChecklistHistoryTable)
    .where(eq(classChecklistHistoryTable.itemId, item.id)).orderBy(asc(classChecklistHistoryTable.createdAt)) };
}

router.get("/classes/:classId/checklist", async (req, res) => {
  const classId = parseId(req.params.classId, "classId");
  res.json(await Promise.all((await db.select().from(classChecklistItemsTable)
    .where(eq(classChecklistItemsTable.classId, classId)).orderBy(asc(classChecklistItemsTable.createdAt))).map(serialize)));
});
router.post("/classes/:classId/checklist", async (req, res): Promise<void> => {
  const classId = parseId(req.params.classId, "classId");
  const { title, description, assigneeId, currentUserId } = req.body;
  if (!title || !currentUserId) { res.status(400).json({ error: "title and currentUserId are required" }); return; }
  const [actor] = await db.select({ role: usersTable.role, isActive: usersTable.isActive }).from(usersTable).where(eq(usersTable.id, currentUserId));
  if (!actor?.isActive || actor.role !== "administrator") { res.status(403).json({ error: "Only administrators may create checklist items" }); return; }
  if (assigneeId) await assertEligible(assigneeId);
  const [cls] = await db.select({ id: classesTable.id }).from(classesTable).where(eq(classesTable.id, classId));
  if (!cls) { res.status(404).json({ error: "Class not found" }); return; }
  const [item] = await db.insert(classChecklistItemsTable).values({ classId, title, description, assigneeId, assignedBy: currentUserId }).returning();
  res.status(201).json(await serialize(item));
});
router.patch("/checklist-items/:itemId", async (req, res): Promise<void> => {
  const itemId = parseId(req.params.itemId, "itemId");
  const { currentUserId, action, assigneeId, title, description } = req.body;
  if (!currentUserId) { res.status(400).json({ error: "currentUserId is required" }); return; }
  const [item] = await db.select().from(classChecklistItemsTable).where(eq(classChecklistItemsTable.id, itemId));
  if (!item) { res.status(404).json({ error: "Checklist item not found" }); return; }
  const [actor] = await db.select().from(usersTable).where(eq(usersTable.id, currentUserId));
  const admin = actor?.role === "administrator";
  if (!actor || (!admin && item.assigneeId !== currentUserId)) { res.status(403).json({ error: "Not allowed" }); return; }
  let values: Partial<typeof item> = { updatedAt: new Date() };
  if (title !== undefined || description !== undefined) {
    if (!admin) { res.status(403).json({ error: "Only administrators may edit items" }); return; }
    values = { ...values, ...(title !== undefined ? { title } : {}), ...(description !== undefined ? { description } : {}) };
  } else if (action === "accept") {
    if (item.status !== "pending" || item.assigneeId !== currentUserId) { res.status(409).json({ error: "Item cannot be accepted" }); return; }
    values = { ...values, status: "accepted", acceptedAt: new Date() };
  } else if (action === "complete") {
    if (item.status !== "accepted" || item.assigneeId !== currentUserId) { res.status(409).json({ error: "Item cannot be completed" }); return; }
    values = { ...values, status: "completed", completedAt: new Date() };
  } else if (action === "pass" || assigneeId !== undefined) {
    if (assigneeId == null) { res.status(400).json({ error: "assigneeId is required" }); return; }
    await assertEligible(assigneeId);
    if (!admin && action !== "pass") { res.status(403).json({ error: "Only administrators may reassign" }); return; }
    values = { ...values, assigneeId, assignedBy: currentUserId, status: "pending", acceptedAt: null, completedAt: null };
  } else if (admin && action === "delete") {
    await db.delete(classChecklistItemsTable).where(eq(classChecklistItemsTable.id, itemId));
    res.status(204).end(); return;
  } else { res.status(400).json({ error: "Invalid action" }); return; }
  const [updated] = await db.update(classChecklistItemsTable).set(values).where(eq(classChecklistItemsTable.id, itemId)).returning();
  if (action === "pass" || assigneeId !== undefined) await db.insert(classChecklistHistoryTable).values({
    itemId, fromUserId: item.assigneeId, toUserId: assigneeId, action: action ?? "reassign", actorId: currentUserId,
  });
  res.json(await serialize(updated));
});
export default router;