import { Router, type IRouter } from "express";
import { parseId } from "../lib/errors";
import { db, requestsTable, usersTable, classesTable, locationsTable } from "@workspace/db";
import { and, eq, desc, ilike } from "drizzle-orm";
import {
  CreateRequestBody,
  UpdateRequestBody,
  ListRequestsQueryParams,
  SubmitTrainingRequestBody,
} from "@workspace/api-zod";
import { sendEmail, buildRequestEmail, buildScheduledEmail } from "../lib/sendgrid";
import { serializeClass } from "./classes";

const router: IRouter = Router();

async function serializeRequest(row: typeof requestsTable.$inferSelect) {
  const [u] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, row.requestorId));
  let classStatus: string | null = null;
  if (row.classId) {
    const [cls] = await db
      .select({ status: classesTable.status })
      .from(classesTable)
      .where(eq(classesTable.id, row.classId));
    classStatus = cls?.status ?? null;
  }
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
    classStatus,
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
  const saved = await serializeRequest(row);

  const emailContent = buildRequestEmail({
    requestorName: body.requestorName,
    requestorEmail: email,
    requestorPhone: body.requestorPhone,
    locationName: body.locationName,
    address: body.address,
    certificationType: body.certificationType ?? "cpr_aed_first_aid",
    numberOfClasses: body.numberOfClasses,
    attendeeCount: body.attendeeCount,
    sessions: body.sessions,
    notes: body.notes,
  });
  sendEmail({ to: process.env.NOTIFY_EMAIL ?? "", ...emailContent }, req.log).catch(() => {});

  res.status(201).json(saved);
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

  if (body.status === "approved") {
    const [existing] = await db
      .select()
      .from(requestsTable)
      .where(eq(requestsTable.id, id));
    if (!existing) { res.status(404).json({ error: "Request not found" }); return; }

    // Use admin-provided sessions from the approval payload if present,
    // otherwise fall back to the requestor's proposed sessions, then preferredDate.
    const sessions: { date: string; startTime: string }[] =
      body.sessions && body.sessions.length > 0
        ? body.sessions
        : existing.sessions && existing.sessions.length > 0
          ? (existing.sessions as { date: string; startTime: string }[])
          : [{ date: existing.preferredDate, startTime: "09:00" }];

    // Upsert a location record for this organization so it appears in the Locations tab
    const locationName = existing.organizationName;
    const [existingLoc] = await db
      .select()
      .from(locationsTable)
      .where(ilike(locationsTable.name, locationName))
      .limit(1);
    if (!existingLoc) {
      await db.insert(locationsTable).values({
        name: locationName,
        address: existing.address ?? null,
        contactEmail: existing.contactEmail ?? null,
        contactPhone: existing.contactPhone ?? null,
      });
    }

    const { updatedRequest, createdClassRows } = await db.transaction(async (tx) => {
      const insertedClasses: typeof classesTable.$inferSelect[] = [];
      for (const session of sessions) {
        const [cls] = await tx
          .insert(classesTable)
          .values({
            title: existing.organizationName,
            certificationType: existing.certificationType,
            date: session.date,
            startTime: session.startTime,
            location: locationName,
            capacity: existing.attendeeCount,
            status: (session as { date: string; startTime: string; status?: string }).status ?? "confirmed",
          })
          .returning();
        if (cls) insertedClasses.push(cls);
      }
      const firstClassId = insertedClasses[0]?.id ?? null;
      const [updated] = await tx
        .update(requestsTable)
        .set({ status: "scheduled", classId: firstClassId })
        .where(eq(requestsTable.id, id))
        .returning();
      return { updatedRequest: updated!, createdClassRows: insertedClasses };
    });

    const serializedRequest = await serializeRequest(updatedRequest);
    const serializedClasses = await Promise.all(createdClassRows.map(serializeClass));

    if (existing.contactEmail) {
      const scheduledEmailContent = buildScheduledEmail({
        requestorName: serializedRequest.requestorName,
        organizationName: existing.organizationName,
        certificationType: existing.certificationType,
        sessions: sessions as { date: string; startTime: string }[],
      });
      sendEmail(
        { to: existing.contactEmail, ...scheduledEmailContent },
        req.log,
      ).catch(() => {});
    }

    res.json({ ...serializedRequest, createdClasses: serializedClasses });
    return;
  }

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
