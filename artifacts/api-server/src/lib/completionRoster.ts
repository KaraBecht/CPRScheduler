import type { Logger } from "pino";
import { and, eq } from "drizzle-orm";
import {
  db,
  classesTable,
  classRosterTable,
  classInstructorsTable,
  trainerInvitationsTable,
  usersTable,
} from "@workspace/db";
import { sendEmail, buildInstructorRosterEmail } from "./sendgrid";

// ---------------------------------------------------------------------------
// Instructor lookup (same priority order as instructorPreClassReminder)
// ---------------------------------------------------------------------------
async function getInstructors(
  cls: typeof classesTable.$inferSelect,
): Promise<{ id: number; name: string; email: string }[]> {
  // 1. Prefer instructors who accepted their invitation
  const accepted = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(trainerInvitationsTable)
    .innerJoin(usersTable, eq(trainerInvitationsTable.userId, usersTable.id))
    .where(
      and(
        eq(trainerInvitationsTable.classId, cls.id),
        eq(trainerInvitationsTable.status, "accepted"),
        eq(usersTable.isActive, true),
      ),
    );
  if (accepted.length > 0) return accepted;

  // 2. Fall back to all assigned instructors in the join table
  const fromJoin = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(classInstructorsTable)
    .innerJoin(usersTable, eq(classInstructorsTable.userId, usersTable.id))
    .where(
      and(
        eq(classInstructorsTable.classId, cls.id),
        eq(usersTable.isActive, true),
      ),
    );
  if (fromJoin.length > 0) return fromJoin;

  // 3. Legacy single instructorId column
  if (cls.instructorId) {
    const [u] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(and(eq(usersTable.id, cls.instructorId), eq(usersTable.isActive, true)));
    if (u) return [u];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Main export — call after a class is marked completed
// ---------------------------------------------------------------------------
export async function sendCompletionRoster(
  cls: typeof classesTable.$inferSelect,
  log: Logger,
): Promise<void> {
  const [instructors, rosterRows] = await Promise.all([
    getInstructors(cls),
    db
      .select()
      .from(classRosterTable)
      .where(eq(classRosterTable.classId, cls.id))
      .orderBy(classRosterTable.position),
  ]);

  if (instructors.length === 0) {
    log.warn({ classId: cls.id }, "Completion roster: no instructors found, skipping");
    return;
  }

  const attendees = rosterRows
    .filter(r => r.name?.trim())
    .map(r => ({
      position: r.position,
      name: r.name,
      email: r.email ?? undefined,
      phone: r.phone ?? undefined,
      result: r.result ?? null,
    }));

  for (const instructor of instructors) {
    if (!instructor.email) continue;
    const content = buildInstructorRosterEmail({
      instructorName: instructor.name,
      classTitle: cls.title,
      classDate: cls.date,
      startTime: cls.startTime ?? null,
      location: cls.location ?? null,
      certificationType: cls.certificationType,
      attendees,
    });
    await sendEmail({ to: instructor.email, ...content }, log).catch(err =>
      log.error({ err, instructorId: instructor.id }, "Completion roster email failed"),
    );
  }

  log.info(
    { classId: cls.id, instructors: instructors.map(i => i.name), attendeeCount: attendees.length },
    "Completion roster sent",
  );
}
