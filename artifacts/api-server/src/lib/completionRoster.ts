import type { Logger } from "pino";
import { and, eq, isNull } from "drizzle-orm";
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
): Promise<{ id: number; name: string; email: string | null }[]> {
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
// Release the completion-email claim so a retry is possible
// ---------------------------------------------------------------------------
async function releaseClaim(classId: number, log: Logger): Promise<void> {
  await db
    .update(classesTable)
    .set({ completionEmailSentAt: null })
    .where(eq(classesTable.id, classId))
    .catch(err => log.error({ err, classId }, "Failed to release completion email claim"));
}

// ---------------------------------------------------------------------------
// Main export — call after a class is marked completed
// ---------------------------------------------------------------------------
export async function sendCompletionRoster(
  cls: typeof classesTable.$inferSelect,
  log: Logger,
): Promise<void> {
  // Atomically claim the send slot.
  // If completion_email_sent_at is already set (by any concurrent or previous
  // request), the WHERE clause matches no rows and `claimed` is undefined —
  // we exit immediately without sending.  Only one caller can ever proceed.
  const [claimed] = await db
    .update(classesTable)
    .set({ completionEmailSentAt: new Date() })
    .where(
      and(
        eq(classesTable.id, cls.id),
        isNull(classesTable.completionEmailSentAt),
      ),
    )
    .returning({ id: classesTable.id });

  if (!claimed) {
    log.warn(
      { classId: cls.id },
      "Completion roster already sent for this class — skipping duplicate send",
    );
    return;
  }

  // We own the slot.  All post-claim work runs inside try/finally so that any
  // unexpected exception (DB read failure, serialization error, etc.) releases
  // the claim and allows a retry rather than permanently blocking the send.
  let sentCount = 0;
  let claimHandled = false; // set true when we intentionally keep or release the claim

  try {
    const [instructors, rosterRows] = await Promise.all([
      getInstructors(cls),
      db
        .select()
        .from(classRosterTable)
        .where(eq(classRosterTable.classId, cls.id))
        .orderBy(classRosterTable.position),
    ]);

    if (instructors.length === 0) {
      // No instructor assigned yet — release so it can be retried once one is added
      await releaseClaim(cls.id, log);
      claimHandled = true;
      log.warn({ classId: cls.id }, "Completion roster: no instructors found, releasing claim for retry");
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
      const delivered = await sendEmail({ to: instructor.email, ...content }, log);
      if (delivered) sentCount++;
    }

    if (sentCount === 0) {
      // No email was accepted for delivery — release so an admin can retry after
      // fixing the provider issue or adding valid addresses
      await releaseClaim(cls.id, log);
      claimHandled = true;
      log.warn(
        { classId: cls.id },
        "Completion roster: all send attempts failed or no valid addresses — releasing claim for retry",
      );
      return;
    }

    // At least one email delivered — keep the claim stamp
    claimHandled = true;
    log.info(
      { classId: cls.id, instructors: instructors.map(i => i.name), attendeeCount: attendees.length, sentCount },
      "Completion roster sent",
    );
  } finally {
    // Safety net: if we exit via an unexpected exception before setting claimHandled,
    // release the claim so the class isn't permanently locked out of retries
    if (!claimHandled) {
      await releaseClaim(cls.id, log);
      log.warn({ classId: cls.id }, "Completion roster: releasing claim after unexpected error");
    }
  }
}
