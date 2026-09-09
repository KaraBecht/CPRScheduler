import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type { Logger } from "pino";
import {
  db, classesTable, classInstructorsTable, usersTable,
  checklistEmailDeliveriesTable,
  classChecklistItemsTable,
} from "@workspace/db";
import { sendEmail } from "./sendgrid";
import { STANDARD_CHECKLIST } from "./checklistDefaults";

const REQUIRED = ["kara.becht@fox.com", "sharon.anctil@fox.com"];
export function getChecklistRecipients(trainerEmails: string[]): string[] {
  return [...new Set([...REQUIRED, ...trainerEmails.map(email => email.toLowerCase())])];
}
function appBaseUrl() {
  const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim();
  return domain ? `https://${domain}` : "http://localhost";
}
function esc(value: string) {
  return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
export function renderChecklistEmail(title: string, date: string, startTime: string, classId: number, items: { title: string; defaultKey?: string | null }[]) {
  const url = `${appBaseUrl()}/classes/${classId}`;
  const text = [`Checklist for ${title} on ${date} at ${startTime}`, `View class: ${url}`, "", ...items.map((item, i) => `${i + 1}. ${item.title}`)].join("\n");
  const html = `<h2>Checklist for ${esc(title)}</h2><p>${date} at ${startTime}</p><p><a href="${url}">View class in app</a></p><ol>${items.map(i => `<li>${esc(i.title)}</li>`).join("")}</ol>`;
  return { subject: `Checklist required: ${title}`, text, html };
}

/** Launches the checklist only once a confirmed/scheduled class has a trainer. */
export async function launchClassChecklist(classId: number, log: Logger) {
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, classId));
  if (!cls || !["confirmed", "scheduled"].includes(cls.status)) return;
  const links = await db.select({ userId: classInstructorsTable.userId })
    .from(classInstructorsTable).where(eq(classInstructorsTable.classId, classId));
  const ids = [...new Set([...links.map(x => x.userId), ...(cls.instructorId ? [cls.instructorId] : [])])];
  if (!ids.length) return;
  await db.insert(classChecklistItemsTable).values(STANDARD_CHECKLIST.map((title, index) => ({
    classId, title, defaultKey: `standard-${index + 1}`,
  }))).onConflictDoNothing();
  const items = await db.select({ title: classChecklistItemsTable.title, defaultKey: classChecklistItemsTable.defaultKey })
    .from(classChecklistItemsTable).where(eq(classChecklistItemsTable.classId, classId)).orderBy(asc(classChecklistItemsTable.createdAt));
  const emailContent = renderChecklistEmail(cls.title, cls.date, cls.startTime, classId, items);
  const trainers = await db.select({ email: usersTable.email, name: usersTable.name })
    .from(usersTable).where(and(inArray(usersTable.id, ids), eq(usersTable.isActive, true)));
  const recipients = getChecklistRecipients(trainers.map(t => t.email));
  for (const recipientEmail of recipients) {
    await db.insert(checklistEmailDeliveriesTable).values({ classId, email: recipientEmail }).onConflictDoNothing();
    const [delivery] = await db.update(checklistEmailDeliveriesTable)
      .set({ claimedAt: new Date() })
      .where(and(eq(checklistEmailDeliveriesTable.classId, classId), eq(checklistEmailDeliveriesTable.email, recipientEmail),
        isNull(checklistEmailDeliveriesTable.sentAt),
        isNull(checklistEmailDeliveriesTable.claimedAt)))
      .returning();
    if (!delivery) continue;
    try {
      const ok = await sendEmail({
      to: recipientEmail,
      ...emailContent,
      }, log);
      if (ok) {
        await db.update(checklistEmailDeliveriesTable).set({ sentAt: new Date(), claimedAt: null })
          .where(and(eq(checklistEmailDeliveriesTable.id, delivery.id), isNull(checklistEmailDeliveriesTable.sentAt)));
      } else {
        await db.update(checklistEmailDeliveriesTable).set({ claimedAt: null }).where(eq(checklistEmailDeliveriesTable.id, delivery.id));
      }
    } catch (err) {
      await db.update(checklistEmailDeliveriesTable).set({ claimedAt: null }).where(eq(checklistEmailDeliveriesTable.id, delivery.id));
      log.error({ err, classId, email: recipientEmail }, "Checklist email delivery failed");
    }
  }
}