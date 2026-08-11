import { db, classesTable, usersTable } from "@workspace/db";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { logger } from "./logger";
import { sendMail } from "./mailer";
import { formatCertificationType } from "./formatCertType";

/** Window around the 18-month mark that triggers a reminder (±7 days). */
const MONTHS = 18;
const WINDOW_DAYS = 7;

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

/**
 * Finds every completed class whose date falls within ±WINDOW_DAYS of its
 * 18-month anniversary (relative to today), then emails all administrators.
 *
 * Safe to call daily — the window ensures each class only triggers once per
 * 2-week period.
 */
export async function sendRenewalReminders(): Promise<number> {
  const today = new Date();
  // A class completed MONTHS ago today would have date = today - 18 months.
  const anniversaryDate = addMonths(today, -MONTHS);
  const windowStart = isoDate(addDays(anniversaryDate, -WINDOW_DAYS));
  const windowEnd = isoDate(addDays(anniversaryDate, WINDOW_DAYS));

  const dueClasses = await db
    .select()
    .from(classesTable)
    .where(
      and(
        eq(classesTable.status, "completed"),
        gte(classesTable.date, windowStart),
        lte(classesTable.date, windowEnd),
      ),
    );

  if (dueClasses.length === 0) {
    logger.debug({ windowStart, windowEnd }, "Renewal reminder: no classes due");
    return 0;
  }

  const admins = await db
    .select({ name: usersTable.name, email: usersTable.email, adminRole: usersTable.adminRole })
    .from(usersTable)
    .where(eq(usersTable.role, "administrator"));

  if (admins.length === 0) {
    logger.warn("Renewal reminder: no administrator accounts found to notify");
    return 0;
  }

  logger.info(
    { count: dueClasses.length, windowStart, windowEnd },
    "Renewal reminder: classes approaching 18-month renewal",
  );

  for (const cls of dueClasses) {
    const certLabel = formatCertificationType(cls.certificationType);
    const renewalBy = isoDate(addMonths(new Date(cls.date), MONTHS + 2));

    const subject = `CPR Renewal Planning: "${cls.title}" is due for renewal`;

    const text = [
      `Hi,`,
      ``,
      `This is an automated renewal planning reminder from the CPR Training Hub.`,
      ``,
      `Class: ${cls.title}`,
      `Certification: ${certLabel}`,
      `Completed: ${cls.date}`,
      `Location: ${cls.location}`,
      ``,
      `This class was completed 18 months ago. Participants whose certifications`,
      `expire every 2 years should be scheduled for renewal by ${renewalBy}.`,
      ``,
      `Log in to the scheduler to create a renewal class or send outreach.`,
      ``,
      `— FOX Medical CPR Training Hub`,
    ].join("\n");

    const html = `
<p>Hi,</p>
<p>This is an automated renewal planning reminder from the <strong>CPR Training Hub</strong>.</p>
<table style="border-collapse:collapse;font-size:14px;margin:12px 0">
  <tr><td style="padding:4px 12px 4px 0;color:#666">Class</td><td><strong>${cls.title}</strong></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666">Certification</td><td>${certLabel}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666">Completed</td><td>${cls.date}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666">Location</td><td>${cls.location}</td></tr>
</table>
<p>This class was completed <strong>18 months ago</strong>. Participants whose certifications
expire every 2 years should be scheduled for renewal by <strong>${renewalBy}</strong>.</p>
<p>Log in to the scheduler to create a renewal class or send outreach.</p>
<p style="color:#888;font-size:12px">— FOX Medical CPR Training Hub</p>
    `.trim();

    for (const admin of admins) {
      await sendMail({ to: admin.email, subject, text, html });
    }
  }

  return dueClasses.length;
}

/** Run once immediately, then every 24 hours. */
export function scheduleRenewalReminders(): void {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  sendRenewalReminders().catch((err) =>
    logger.error({ err }, "Renewal reminder job failed on startup"),
  );

  setInterval(() => {
    sendRenewalReminders().catch((err) =>
      logger.error({ err }, "Renewal reminder daily job failed"),
    );
  }, MS_PER_DAY);

  logger.info("Renewal reminder job scheduled (daily)");
}
