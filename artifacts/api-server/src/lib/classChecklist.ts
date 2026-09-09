import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Logger } from "pino";
import {
  db, classesTable, classInstructorsTable, usersTable,
  checklistEmailDeliveriesTable,
} from "@workspace/db";
import { sendEmail } from "./sendgrid";

const REQUIRED = ["kara.becht@fox.com", "sharon.anctil@fox.com"];
export function getChecklistRecipients(trainerEmails: string[]): string[] {
  return [...new Set([...REQUIRED, ...trainerEmails.map(email => email.toLowerCase())])];
}

/** Launches the checklist only once a confirmed/scheduled class has a trainer. */
export async function launchClassChecklist(classId: number, log: Logger) {
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, classId));
  if (!cls || !["confirmed", "scheduled"].includes(cls.status)) return;
  const links = await db.select({ userId: classInstructorsTable.userId })
    .from(classInstructorsTable).where(eq(classInstructorsTable.classId, classId));
  const ids = [...new Set([...links.map(x => x.userId), ...(cls.instructorId ? [cls.instructorId] : [])])];
  if (!ids.length) return;
  const trainers = await db.select({ email: usersTable.email, name: usersTable.name })
    .from(usersTable).where(and(inArray(usersTable.id, ids), eq(usersTable.isActive, true)));
  const recipients = getChecklistRecipients(trainers.map(t => t.email));
  for (const email of recipients) {
    await db.insert(checklistEmailDeliveriesTable).values({ classId, email }).onConflictDoNothing();
    const [delivery] = await db.update(checklistEmailDeliveriesTable)
      .set({ claimedAt: new Date() })
      .where(and(eq(checklistEmailDeliveriesTable.classId, classId), eq(checklistEmailDeliveriesTable.email, email),
        isNull(checklistEmailDeliveriesTable.sentAt),
        isNull(checklistEmailDeliveriesTable.claimedAt)))
      .returning();
    if (!delivery) continue;
    try {
      const ok = await sendEmail({
      to: email,
      subject: `Checklist required: ${cls.title}`,
      text: `A checklist is ready for ${cls.title} on ${cls.date} at ${cls.startTime}.`,
      html: `<p>A checklist is ready for <strong>${cls.title}</strong> on ${cls.date} at ${cls.startTime}.</p><p>Open the class in PulsePoint CPR Hub to review assigned items.</p>`,
      }, log);
      if (ok) {
        await db.update(checklistEmailDeliveriesTable).set({ sentAt: new Date(), claimedAt: null })
          .where(and(eq(checklistEmailDeliveriesTable.id, delivery.id), isNull(checklistEmailDeliveriesTable.sentAt)));
      } else {
        await db.update(checklistEmailDeliveriesTable).set({ claimedAt: null }).where(eq(checklistEmailDeliveriesTable.id, delivery.id));
      }
    } catch (err) {
      await db.update(checklistEmailDeliveriesTable).set({ claimedAt: null }).where(eq(checklistEmailDeliveriesTable.id, delivery.id));
      log.error({ err, classId, email }, "Checklist email delivery failed");
    }
  }
}