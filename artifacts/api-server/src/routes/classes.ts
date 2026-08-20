import { Router, type IRouter } from "express";
import { parseId } from "../lib/errors";
import {
  db,
  classesTable,
  classInstructorsTable,
  enrollmentsTable,
  classRosterTable,
  usersTable,
  certificatesTable,
  locationsTable,
} from "@workspace/db";
import { and, eq, gte, ilike, ne, or, sql, desc, asc, isNotNull, inArray } from "drizzle-orm";
import {
  CreateClassBody,
  UpdateClassBody,
  ListClassesQueryParams,
} from "@workspace/api-zod";
import { serializeUser } from "./users";
import { upsertClassReminder } from "../lib/classReminder";
import { sendTrainerInvitations } from "../lib/trainerNotifications";
import { sendClassNotifications, type ClassInfo } from "../lib/classNotifications";
import { sendCompletionRoster } from "../lib/completionRoster";
import { sendImmediateReminderIfWithin24h } from "../lib/instructorPreClassReminder";

const router: IRouter = Router();

/**
 * When a class is confirmed, ensure a matching location card exists.
 * Uses case-insensitive name match; creates a populated record if absent.
 * Existing records are never overwritten.
 */
async function ensureLocationExists(row: {
  title: string;
  location?: string | null;
  businessUnit?: string | null;
}) {
  const name = row.title.trim();
  if (!name) return;
  const existing = await db
    .select({ id: locationsTable.id })
    .from(locationsTable)
    .where(ilike(locationsTable.name, name))
    .limit(1);
  if (existing.length > 0) return;

  const notes = row.businessUnit ? `Business Unit: ${row.businessUnit}` : undefined;
  await db
    .insert(locationsTable)
    .values({
      name,
      address: row.location?.trim() || null,
      notes: notes ?? null,
    })
    .onConflictDoNothing();
}

async function serializeClass(row: typeof classesTable.$inferSelect) {
  const [[enrollCounts], [rosterCounts], classInstructors] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(enrollmentsTable)
      .where(
        and(
          eq(enrollmentsTable.classId, row.id),
          sql`${enrollmentsTable.status} <> 'cancelled'`,
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(classRosterTable)
      .where(
        and(
          eq(classRosterTable.classId, row.id),
          ne(sql`trim(${classRosterTable.name})`, ""),
        ),
      ),
    db
      .select({ id: usersTable.id, name: usersTable.name })
      .from(classInstructorsTable)
      .innerJoin(usersTable, eq(classInstructorsTable.userId, usersTable.id))
      .where(eq(classInstructorsTable.classId, row.id)),
  ]);
  const enrolledCount = Math.max(
    enrollCounts?.count ?? 0,
    rosterCounts?.count ?? 0,
  );
  // Fall back to instructor_id column if class_instructors is empty (migration compat)
  let instructors: { id: number; name: string }[] = classInstructors;
  if (instructors.length === 0 && row.instructorId) {
    const [u] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, row.instructorId));
    if (u) instructors = [{ id: u.id, name: u.name }];
  }
  const first = instructors[0] ?? null;
  return {
    id: row.id,
    title: row.title,
    certificationType: row.certificationType,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    location: row.location,
    capacity: row.capacity,
    enrolledCount,
    status: row.status,
    instructorId: first?.id ?? null,
    instructorName: first?.name ?? null,
    instructors,
    description: row.description,
    businessUnit: row.businessUnit,
  };
}

router.get("/classes", async (req, res) => {
  const params = ListClassesQueryParams.parse(req.query);
  const conditions = [];
  if (params.status) conditions.push(eq(classesTable.status, params.status));
  if (params.instructorId) {
    // Match classes where instructor_id = X OR class is in class_instructors for this user
    const classIdsForInstructor = db
      .select({ classId: classInstructorsTable.classId })
      .from(classInstructorsTable)
      .where(eq(classInstructorsTable.userId, params.instructorId));
    conditions.push(
      sql`(${classesTable.instructorId} = ${params.instructorId} OR ${classesTable.id} IN (${classIdsForInstructor}))`,
    );
  }
  if (params.upcoming) {
    const today = new Date().toISOString().split("T")[0]!;
    conditions.push(gte(classesTable.date, today));
  }
  if (params.location) {
    conditions.push(
      or(
        ilike(classesTable.location, `%${params.location}%`),
        ilike(classesTable.title, `%${params.location}%`),
      )!
    );
  }
  const rows = await db
    .select()
    .from(classesTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(classesTable.date), asc(classesTable.startTime));
  const out = await Promise.all(rows.map(serializeClass));
  res.json(out);
});

router.post("/classes", async (req, res) => {
  const body = UpdateClassBody.parse(req.body);
  const { instructorIds, ...classData } = body;
  const [row] = await db
    .update(classesTable)
    .set(updateData)
    .where(eq(classesTable.id, classId))
    .returning();
  if (instructorIds && instructorIds.length > 0) {
    await db
      .insert(classInstructorsTable)
      .values(instructorIds.map((userId) => ({ classId: row.id, userId })))
      .onConflictDoNothing();
  }
  await upsertClassReminder(row);

  // Notify admin/coordinator/EHS staff when a class is created directly as scheduled or confirmed
  if (row.status === "scheduled" || row.status === "confirmed") {
    // Fire immediate reminder if class is within 24 h and has instructors
    if (instructorIds && instructorIds.length > 0) {
      sendImmediateReminderIfWithin24h(row, instructorIds, req.log).catch((err) =>
        req.log.error({ err, classId: row.id }, "Immediate instructor reminder error (create)"),
      );
    }
    const clsInfo: ClassInfo = {
      id: row.id, title: row.title, location: row.location,
      certificationType: row.certificationType, date: row.date, startTime: row.startTime,
      endTime: row.endTime ?? null,
    };
    sendClassNotifications(clsInfo, null, "confirmation", req.log, row.businessUnit ?? null).catch(() => {});
    sendTrainerInvitations(
      {
        id: row.id,
        title: row.title,
        certificationType: row.certificationType,
        date: row.date,
        startTime: row.startTime,
        endTime: row.endTime ?? null,
        location: row.location,
        capacity: row.capacity ?? null,
      },
      req.log,
    ).catch(() => {});
    // Auto-create a location card if one doesn't already exist for this name
    ensureLocationExists(row).catch(() => {});
  }

  // When a class is marked complete, email the full roster to the instructor(s)
  if (statusChanged && row.status === "completed") {
    sendCompletionRoster(row, req.log).catch(() => {});
  }

  res.json(await serializeClass(row));
});

router.delete("/classes/:classId", async (req, res) => {
  const classId = parseId(req.params.classId, "classId");
  const [row] = await db
    .update(classesTable)
    .set(updateData)
    .where(eq(classesTable.id, classId))
    .returning();
  if (!row) { res.status(404).json({ error: "Class not found" }); return; }
  const base = await serializeClass(row);
  const enrolls = await db
    .select({
      e: enrollmentsTable,
      u: usersTable,
    })
    .from(enrollmentsTable)
    .leftJoin(usersTable, eq(enrollmentsTable.studentId, usersTable.id))
    .where(eq(enrollmentsTable.classId, classId))
    .orderBy(desc(enrollmentsTable.enrolledAt));
  res.json({
    ...base,
    enrollments: enrolls.map(({ e, u }) => ({
      id: e.id,
      classId: e.classId,
      studentId: e.studentId,
      studentName: u?.name ?? "",
      studentEmail: u?.email ?? "",
      status: e.status,
      certificateIssued: e.certificateIssued,
      enrolledAt: e.enrolledAt.toISOString(),
    })),
  });
});

router.patch("/classes/:classId", async (req, res) => {
  const classId = parseId(req.params.classId, "classId");
  const body = UpdateClassBody.parse(req.body);

  // Capture old status before the update so we can detect status transitions
  const [oldRow] = await db
    .select({ status: classesTable.status })
    .from(classesTable)
    .where(eq(classesTable.id, classId));

  const { instructorIds, ...classData } = body;
  const updateData: typeof classData & { instructorId?: number | null } = {
    ...classData,
  };
  if (instructorIds !== undefined) {
    updateData.instructorId = instructorIds[0] ?? null;
  }
  const [row] = await db
    .update(classesTable)
    .set(updateData)
    .where(eq(classesTable.id, classId))
    .returning();
  if (!row) { res.status(404).json({ error: "Class not found" }); return; }
  if (instructorIds !== undefined) {
    await db
      .delete(classInstructorsTable)
      .where(eq(classInstructorsTable.classId, classId));
    if (instructorIds.length > 0) {
      await db
        .insert(classInstructorsTable)
        .values(instructorIds.map((userId) => ({ classId, userId })))
        .onConflictDoNothing();
      // Fire immediate reminder if the class is already within the next 24 hours
      sendImmediateReminderIfWithin24h(row, instructorIds, req.log).catch((err) =>
        req.log.error({ err, classId }, "Immediate instructor reminder error"),
      );
    }
  }
  await upsertClassReminder(row);

  // Only fire notifications when status actually changes to scheduled/confirmed
  const statusChanged = oldRow && row.status !== oldRow.status;
  if (statusChanged && (row.status === "confirmed" || row.status === "scheduled")) {
    const clsInfo: ClassInfo = {
      id: row.id, title: row.title, location: row.location,
      certificationType: row.certificationType, date: row.date, startTime: row.startTime,
      endTime: row.endTime ?? null,
    };
    sendClassNotifications(clsInfo, null, "confirmation", req.log, row.businessUnit ?? null).catch(() => {});
    sendTrainerInvitations(
      {
        id: row.id,
        title: row.title,
        certificationType: row.certificationType,
        date: row.date,
        startTime: row.startTime,
        endTime: row.endTime ?? null,
        location: row.location,
        capacity: row.capacity ?? null,
      },
      req.log,
    ).catch(() => {});
    // Auto-create a location card if one doesn't already exist for this name
    ensureLocationExists(row).catch(() => {});
  }

  // When a class is marked complete, email the full roster to the instructor(s)
  if (statusChanged && row.status === "completed") {
    sendCompletionRoster(row, req.log).catch(() => {});
  }

  res.json(await serializeClass(row));
});

router.delete("/classes/:classId", async (req, res) => {
  const classId = parseId(req.params.classId, "classId");
  await db.transaction(async (tx) => {
    await tx
      .update(certificatesTable)
      .set({ classId: null })
      .where(and(isNotNull(certificatesTable.classId), eq(certificatesTable.classId, classId)));
    await tx.delete(classesTable).where(eq(classesTable.id, classId));
  });
  res.status(204).end();
});

export { serializeClass };
export default router;
