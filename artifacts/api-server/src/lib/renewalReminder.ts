import { db, classesTable, usersTable } from "@workspace/db";
import { and, eq, gte, lte, inArray } from "drizzle-orm";
import { logger } from "./logger";
import { sendMail } from "./mailer";
import { formatCertificationType } from "./formatCertType";

/**
 * Window around the 18-month mark that triggers a reminder.
 * ±15 days ensures no class is missed between monthly runs.
 */
const MONTHS = 18;
const WINDOW_DAYS = 15;

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
 * Finds completed classes hitting their 18-month anniversary (±15 days),
 * skips any whose location already has a scheduled or confirmed future class,
 * and emails only administrators with adminRole = "admin".
 *
 * Runs monthly — the ±15-day window ensures no class falls between runs.
 */
export async function sendRenewalReminders(): Promise<number> {
  const today = new Date();
  const todayStr = isoDate(today);

  // Classes completed ~18 months ago
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

  // Fetch all future classes that are already scheduled or confirmed
  const coveredClasses = await db
    .select({ location: classesTable.location })
    .from(classesTable)
    .where(
      and(
        inArray(classesTable.status, ["scheduled", "confirmed"]),
        gte(classesTable.date, todayStr),
      ),
    );
  const coveredLocations = new Set(coveredClasses.map((c) => c.location));

  // Filter out locations already covered by a scheduled/confirmed class
  const needsReminder = dueClasses.filter((cls) => !coveredLocations.has(cls.location));

  if (needsReminder.length === 0) {
    logger.info(
      { windowStart, windowEnd, skipped: dueClasses.length },
      "Renewal reminder: all due classes already have a scheduled or confirmed class — no emails sent",
    );
    return 0;
  }

  // Only notify admins with the "admin" sub-role (Kara and Sharon)
  const admins = await db
    .select({ name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.role, "administrator"),
        eq(usersTable.adminRole, "admin"),
      ),
    );

  if (admins.length === 0) {
    logger.warn("Renewal reminder: no admin-role administrators found to notify");
    return 0;
  }

  logger.info(
    {
      count: needsReminder.length,
      skipped: dueClasses.length - needsReminder.length,
      windowStart,
      windowEnd,
    },
    "Renewal reminder: sending emails",
  );

  for (const cls of needsReminder) {
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

  return needsReminder.length;
}

/**
 * Schedule the monthly renewal reminder — does NOT fire on startup.
 *
 * Uses a daily tick counter to avoid exceeding Node's 32-bit setInterval
 * limit (~24.8 days max). At 30 ticks the reminders are sent and the
 * counter resets.
 */
export function scheduleRenewalReminders(): void {
  const MS_PER_DAY = 24 * 60 * 60 * 1000; // 86 400 000 ms — safely within int32
  const RUN_EVERY_DAYS = 30;
  let daysElapsed = 0;

  setInterval(() => {
    daysElapsed++;
    if (daysElapsed >= RUN_EVERY_DAYS) {
      daysElapsed = 0;
      sendRenewalReminders().catch((err) =>
        logger.error({ err }, "Renewal reminder monthly job failed"),
      );
    }
  }, MS_PER_DAY);

  logger.info(
    { nextRunInDays: RUN_EVERY_DAYS },
    "Renewal reminder job scheduled (monthly)",
  );
}
