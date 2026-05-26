import { Router, type IRouter } from "express";
import { parseId } from "../lib/errors";
import { db, requestsTable, usersTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import {
  CreateRequestBody,
  UpdateRequestBody,
  ListRequestsQueryParams,
  SubmitTrainingRequestBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function serializeRequest(row: typeof requestsTable.$inferSelect) {
  const [u] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, row.requestorId));
  return {
    id: row.id,
    requestorId: row.requestorId,
    requestorName: u?.name ?? "",
    organizationName: row.organizationName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    certificationType: row.certificationType,
    preferredDate: row.preferredDate,
    preferredLocation: row.preferredLocation,
    address: row.address,
    numberOfClasses: row.numberOfClasses,
    sessions: row.sessions ?? [],
    attendeeCount: row.attendeeCount,
    notes: row.notes,
    status: row.status,
    classId: row.classId,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/requests", async (req, res) => {
  const params = ListRequestsQueryParams.parse(req.query);
  const conditions = [];
  if (params.status) conditions.push(eq(requestsTable.status, params.status));
  if (params.requestorId)
    conditions.push(eq(requestsTable.requestorId, params.requestorId));
  const rows = await db
    .select()
    .from(requestsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(requestsTable.createdAt));
  res.json(await Promise.all(rows.map(serializeRequest)));
});

router.post("/requests", async (req, res) => {
  const body = CreateRequestBody.parse(req.body);
  const [row] = await db.insert(requestsTable).values(body).returning();
  res.status(201).json(await serializeRequest(row));
});

router.post("/training-requests", async (req, res) => {
  const body = SubmitTrainingRequestBody.parse(req.body);
  const email = body.requestorEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }
  const [user] = await db
    .insert(usersTable)
    .values({
      name: body.requestorName,
      email,
      role: "requestor",
      phone: body.requestorPhone ?? null,
      organization: body.locationName,
    })
    .onConflictDoUpdate({
      target: usersTable.email,
      set: { email },
    })
    .returning();
  const firstSession = body.sessions[0]!;
  const [row] = await db
    .insert(requestsTable)
    .values({
      requestorId: user.id,
      organizationName: body.locationName,
      contactEmail: email,
      contactPhone: body.requestorPhone ?? null,
      certificationType: body.certificationType ?? "cpr_aed_first_aid",
      preferredDate: firstSession.date,
      preferredLocation: body.locationName,
      address: body.address ?? null,
      numberOfClasses: body.numberOfClasses,
      sessions: body.sessions,
      attendeeCount: body.attendeeCount,
      notes: body.notes ?? null,
    })
    .returning();
  res.status(201).json(await serializeRequest(row));
});

router.get("/requests/:requestId", async (req, res) => {
  const id = parseId(req.params.requestId, "requestId");
  const [row] = await db.select().from(requestsTable).where(eq(requestsTable.id, id));
  if (!row) { res.status(404).json({ error: "Request not found" }); return; }
  res.json(await serializeRequest(row));
});

router.patch("/requests/:requestId", async (req, res) => {
  const id = parseId(req.params.requestId, "requestId");
  const body = UpdateRequestBody.parse(req.body);
  const [row] = await db
    .update(requestsTable)
    .set(body)
    .where(eq(requestsTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Request not found" }); return; }
  res.json(await serializeRequest(row));
});

export { serializeRequest };
export default router;
