import { Router, type IRouter } from "express";
import { parseId } from "../lib/errors";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateUserBody, ListUsersQueryParams, UpdateUserBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users", async (req, res) => {
  const params = ListUsersQueryParams.parse(req.query);
  const rows = params.role
    ? await db.select().from(usersTable).where(eq(usersTable.role, params.role))
    : await db.select().from(usersTable);
  res.json(rows.map(serializeUser));
});

router.post("/users", async (req, res) => {
  const body = CreateUserBody.parse(req.body);
  if (!body.email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }
  const [row] = await db.insert(usersTable).values({ ...body, email: body.email! }).returning();
  res.status(201).json(serializeUser(row));
});

router.patch("/users/:userId", async (req, res) => {
  const userId = parseId(req.params.userId, "userId");
  const body = UpdateUserBody.parse(req.body);
  // Exclude null email from the update set — the column is NOT NULL; omitting it leaves it unchanged
  const { email, ...rest } = body;
  const updateSet = email != null ? { ...rest, email } : rest;
  const [row] = await db
    .update(usersTable)
    .set(updateSet)
    .where(eq(usersTable.id, userId))
    .returning();
  if (!row) { res.status(404).json({ error: "User not found" }); return; }
  res.json(serializeUser(row));
});

router.delete("/users/:userId", async (req, res) => {
  const userId = parseId(req.params.userId, "userId");
  const [row] = await db.delete(usersTable).where(eq(usersTable.id, userId)).returning();
  if (!row) { res.status(404).json({ error: "User not found" }); return; }
  res.status(204).send();
});

export function serializeUser(row: typeof usersTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    adminRole: row.adminRole ?? null,
    phone: row.phone,
    organization: row.organization,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  };
}

export default router;
