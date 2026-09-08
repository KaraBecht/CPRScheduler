/**
 * 24-hour pre-class instructor reminder:
 *   1. Finds confirmed/scheduled classes starting within the next 24 hours.
 *   2. Emails each assigned active instructor with the roster sign-in link.
 *   3. Sends a confirmation to admin sub-role users listing who was notified.
 *
 * Runs hourly via scheduleInstructorPreClassReminders().
 */

import { and, eq, gte, inArray, isNotNull, isNull, lte } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";
import {
  db,
  classesTable,
  classInstructorsTable,
  instructorPreClassRemindersTable,
  trainerInvitationsTable,
  usersTable,
} from "@workspace/db";
import { logger } from "./logger";
import { sendEmail } from "./sendgrid";
import { formatCertificationType } from "./formatCertType";
import { buildCalendarLinks, calendarHtml, calendarText } from "./calendarLinks";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CLASS_TIME_ZONE =
  process.env["CLASS_TIME_ZONE"] || "America/Los_Angeles";
const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

function datePartsInTimeZone(date: Date, timeZone = CLASS_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function localIsoDate(date: Date, timeZone = CLASS_TIME_ZONE): string {
  const { year, month, day } = datePartsInTimeZone(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function shiftIsoDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year!, month! - 1, day! + days));
  return shifted.toISOString().split("T")[0]!;
}

export function classStartInstant(
  cls: Pick<typeof classesTable.$inferSelect, "date" | "startTime"> & {
    timeZone?: string | null;
  },
  timeZone = cls.timeZone ?? CLASS_TIME_ZONE,
): Date {
  const [year, month, day] = cls.date.split("-").map(Number);
  const [hour, minute] = cls.startTime.split(":").map(Number);
  const targetAsUtc = Date.UTC(year!, month! - 1, day!, hour!, minute!, 0);
  let candidate = targetAsUtc;

  // Iteratively correct the UTC candidate until formatting it in the class's
  // business timezone produces the stored local date and time.
  for (let i = 0; i < 3; i++) {
    const observed = datePartsInTimeZone(new Date(candidate), timeZone);
    const observedAsUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      observed.second,
    );
    candidate += targetAsUtc - observedAsUtc;
  }

  return new Date(candidate);
}

export function isClassWithin24Hours(
  cls: Pick<typeof classesTable.$inferSelect, "date" | "startTime"> & {
    timeZone?: string | null;
  },
  now = new Date(),
): boolean {
  const untilStart = classStartInstant(cls).getTime() - now.getTime();
  return untilStart > 0 && untilStart <= REMINDER_WINDOW_MS;
}

function appBaseUrl(): string {
  const domains = process.env["REPLIT_DOMAINS"];
  if (domains) {
    const first = domains.split(",")[0]?.trim();
    if (first) return `https://${first}`;
  }
  return "http://localhost";
}

function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y!, m! - 1, d!)));
}

function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h! >= 12 ? "PM" : "AM";
  return `${h! % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px;white-space:nowrap">${label}</td><td style="padding:4px 0;font-size:14px"><strong>${value}</strong></td></tr>`;
}

// ---------------------------------------------------------------------------
// Roster form attachment
// ---------------------------------------------------------------------------

/**
 * Reads the offline roster HTML form, injects the class details as pre-filled
 * values, and returns a base64-encoded attachment ready for the Graph API.
 */
export function buildRosterAttachmentForClass(cls: typeof classesTable.$inferSelect) {
  return buildRosterAttachment(cls);
}

function buildRosterAttachment(
  cls: typeof classesTable.$inferSelect,
): { name: string; contentType: string; contentBytes: string } | null {
  try {
    // dist/ is one level inside artifacts/api-server/, so ../../cpr-scheduler/public/
    const formPath = path.resolve(
      __dirname,
      "../../cpr-scheduler/public/cpr-roster-form.html",
    );
    let html = fs.readFileSync(formPath, "utf-8");

    // Inject a small script that pre-fills the class fields after the page loads.
    // The form's own init script runs synchronously, so appending before </body>
    // guarantees all input elements already exist.
    const prefill = `
<script>
(function () {
  var el;
  el = document.getElementById('classId');    if (el) el.value = ${cls.id || ""};
  el = document.getElementById('classDate');  if (el) el.value = ${JSON.stringify(cls.date)};
  el = document.getElementById('startTime');  if (el) el.value = ${JSON.stringify(cls.startTime)};
  el = document.getElementById('classTitle'); if (el) el.value = ${JSON.stringify(cls.title)};
})();
</script>`;

    html = html.replace("</body>", `${prefill}\n</body>`);

    const safeTitle = cls.title.replace(/[^a-z0-9]/gi, "_").slice(0, 40);
    const name = `CPR_Roster_${safeTitle}_${cls.date}.html`;
    const contentBytes = Buffer.from(html, "utf-8").toString("base64");
    return { name, contentType: "text/html", contentBytes };
  } catch (err) {
    logger.warn({ err }, "Could not build roster form attachment — skipping");
    return null;
  }
}

// ---------------------------------------------------------------------------
// Email builders
// ---------------------------------------------------------------------------

export function buildInstructorEmail(
  instructorName: string,
  cls: typeof classesTable.$inferSelect,
  signinUrl: string,
  rosterUrl: string,
): { subject: string; text: string; html: string } {
  const cert = formatCertificationType(cls.certificationType);
  const formattedDate = formatDateLong(cls.date);
  const timeStr = cls.endTime
    ? `${formatTime12(cls.startTime)} – ${formatTime12(cls.endTime)}`
    : formatTime12(cls.startTime);

  const subject = `Reminder: Upcoming CPR class — ${cls.title} (${formattedDate})`;

  const cal = buildCalendarLinks(
    { classId: cls.id, title: cls.title, certificationType: cls.certificationType, date: cls.date, startTime: cls.startTime, endTime: cls.endTime, location: cls.location },
    appBaseUrl(),
  );

  const text = [
    `Hi ${instructorName},`,
    ``,
    `This is your reminder for the CPR class you are scheduled to teach within the next 24 hours.`,
    ``,
    `CLASS DETAILS`,
    `  Organization:  ${cls.title}`,
    `  Certification: ${cert}`,
    `  Date:          ${formattedDate}`,
    `  Time:          ${timeStr}`,
    `  Location:      ${cls.location}`,
    ``,
    `ROSTER SIGN-IN LINK`,
    `Share this link with attendees so they can sign in on their own device:`,
    `  ${signinUrl}`,
    ``,
    `FULL ROSTER`,
    `View the current roster (names already signed in) here:`,
    `  ${rosterUrl}`,
    ``,
    calendarText(cal),
    ``,
    `— PulsePoint CPR Hub`,
  ].join("\n");

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827">
  <div style="background:#1d4ed8;padding:20px 24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;color:#fff;font-size:18px">Upcoming CPR Class</h1>
    <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px">PulsePoint CPR Hub — Instructor Reminder</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <p style="margin:0 0 16px">Hi <strong>${instructorName}</strong>,</p>
    <p style="margin:0 0 20px">This is your reminder for the CPR class you are scheduled to teach within the next 24 hours.</p>

    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Class Details</h2>
    <table style="border-collapse:collapse;margin-bottom:24px">
      ${row("Organization", cls.title)}
      ${row("Certification", cert)}
      ${row("Date", formattedDate)}
      ${row("Time", timeStr)}
      ${row("Location", cls.location)}
    </table>

    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Roster Sign-In Link</h2>
    <p style="margin:0 0 12px;color:#374151;font-size:14px">Share this link with attendees so they can sign in on their own device:</p>
    <a href="${signinUrl}" style="display:inline-block;padding:12px 24px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">Open Sign-In Sheet →</a>
    <p style="margin:12px 0 20px;font-size:12px;color:#6b7280;word-break:break-all">${signinUrl}</p>

    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Full Roster</h2>
    <p style="margin:0 0 12px;color:#374151;font-size:14px">View the current roster with all signed-in students:</p>
    <a href="${rosterUrl}" style="display:inline-block;padding:12px 24px;background:#f3f4f6;color:#111827;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;border:1px solid #e5e7eb">View Full Roster →</a>
    <p style="margin:12px 0 0;font-size:12px;color:#6b7280;word-break:break-all">${rosterUrl}</p>

    <div style="margin-top:24px;padding:14px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#1e40af">📎 Offline Roster Form Attached</p>
      <p style="margin:0;font-size:13px;color:#374151">A pre-filled roster form is attached to this email. Open it in any browser to collect attendee names, pass/fail results, and card-sent status — no internet required. Upload the saved <strong>.json</strong> file at the class roster page when you're back online.</p>
    </div>

    ${calendarHtml(cal)}
  </div>
</div>`.trim();

  return { subject, text, html };
}

function buildAdminConfirmationEmail(
  adminName: string,
  cls: typeof classesTable.$inferSelect,
  instructorNames: string[],
  signinUrl: string,
): { subject: string; text: string; html: string } {
  const cert = formatCertificationType(cls.certificationType);
  const formattedDate = formatDateLong(cls.date);
  const nameList = instructorNames.join(", ");

  const subject = `[Admin] Pre-class reminder sent — ${cls.title} (${formattedDate})`;

  const text = [
    `Hi ${adminName},`,
    ``,
    `A pre-class reminder was sent to the following instructor(s) for a class starting within the next 24 hours:`,
    ``,
    `  Instructor(s): ${nameList}`,
    `  Organization:  ${cls.title}`,
    `  Certification: ${cert}`,
    `  Date:          ${formattedDate}`,
    `  Location:      ${cls.location}`,
    ``,
    `The roster sign-in link shared with the instructor:`,
    `  ${signinUrl}`,
  ].join("\n");

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827">
  <div style="background:#1d4ed8;padding:20px 24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;color:#fff;font-size:18px">Pre-Class Reminder Sent</h1>
    <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px">PulsePoint CPR Hub — Admin Notification</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <p style="margin:0 0 16px">Hi <strong>${adminName}</strong>,</p>
    <p style="margin:0 0 20px">A pre-class reminder was sent to the following instructor(s) for a class starting within the next 24 hours:</p>

    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Class Details</h2>
    <table style="border-collapse:collapse;margin-bottom:24px">
      ${row("Instructor(s)", nameList)}
      ${row("Organization", cls.title)}
      ${row("Certification", cert)}
      ${row("Date", formattedDate)}
      ${row("Location", cls.location)}
    </table>

    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Sign-In Link</h2>
    <p style="margin:0 0 4px;font-size:14px;color:#374151">The following link was shared with the instructor:</p>
    <p style="margin:0;font-size:12px;color:#6b7280;word-break:break-all"><a href="${signinUrl}" style="color:#1d4ed8">${signinUrl}</a></p>
  </div>
</div>`.trim();

  return { subject, text, html };
}

async function getClassInstructors(
  cls: typeof classesTable.$inferSelect,
): Promise<{ id: number; name: string; email: string }[]> {
  const hasEmail = (u: { id: number; name: string; email: string | null }): u is { id: number; name: string; email: string } =>
    u.email !== null;

  // 1. Prefer instructors who explicitly accepted their invitation
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

  if (accepted.length > 0) return accepted.filter(hasEmail);

  // 2. No one has accepted yet — fall back to all assigned instructors
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

  if (fromJoin.length > 0) return fromJoin.filter(hasEmail);

  // 3. Legacy: single instructorId column
  if (cls.instructorId) {
    const [u] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(and(eq(usersTable.id, cls.instructorId), eq(usersTable.isActive, true)));
    if (u && hasEmail(u)) return [u];
  }

  return [];
}

type ReminderLog = {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

async function claimInstructorReminder(
  classId: number,
  instructorId: number,
): Promise<boolean> {
  const claimedAt = new Date();
  const [inserted] = await db
    .insert(instructorPreClassRemindersTable)
    .values({ classId, instructorId, claimedAt })
    .onConflictDoNothing()
    .returning({ id: instructorPreClassRemindersTable.id });

  if (inserted) return true;

  const [claimed] = await db
    .update(instructorPreClassRemindersTable)
    .set({ claimedAt })
    .where(
      and(
        eq(instructorPreClassRemindersTable.classId, classId),
        eq(instructorPreClassRemindersTable.instructorId, instructorId),
        isNull(instructorPreClassRemindersTable.sentAt),
        isNull(instructorPreClassRemindersTable.claimedAt),
      ),
    )
    .returning({ id: instructorPreClassRemindersTable.id });

  return Boolean(claimed);
}

async function releaseInstructorReminderClaim(
  classId: number,
  instructorId: number,
): Promise<void> {
  await db
    .update(instructorPreClassRemindersTable)
    .set({ claimedAt: null })
    .where(
      and(
        eq(instructorPreClassRemindersTable.classId, classId),
        eq(instructorPreClassRemindersTable.instructorId, instructorId),
        isNull(instructorPreClassRemindersTable.sentAt),
      ),
    );
}

async function markInstructorReminderSent(
  classId: number,
  instructorId: number,
): Promise<void> {
  await db
    .update(instructorPreClassRemindersTable)
    .set({ claimedAt: null, sentAt: new Date() })
    .where(
      and(
        eq(instructorPreClassRemindersTable.classId, classId),
        eq(instructorPreClassRemindersTable.instructorId, instructorId),
      ),
    );
}

async function sendRemindersForClass(
  cls: typeof classesTable.$inferSelect,
  instructors: { id: number; name: string; email: string }[],
  log: ReminderLog,
): Promise<void> {
  if (!isClassWithin24Hours(cls)) return;

  const signinUrl = `${appBaseUrl()}/roster-signin/${cls.id}`;
  const rosterUrl = `${appBaseUrl()}/classes/${cls.id}/signin-sheet`;
  const attachment = buildRosterAttachment(cls);
  const notifiedNames: string[] = [];

  for (const instructor of instructors) {
    const claimed = await claimInstructorReminder(cls.id, instructor.id);
    if (!claimed) {
      continue;
    }

    try {
      const content = buildInstructorEmail(
        instructor.name,
        cls,
        signinUrl,
        rosterUrl,
      );
      const ok = await sendEmail(
        {
          to: instructor.email,
          ...content,
          attachments: attachment ? [attachment] : [],
        },
        logger,
      );

      if (!ok) {
        await releaseInstructorReminderClaim(cls.id, instructor.id);
        log.error(
          { instructorId: instructor.id, classId: cls.id },
          "Instructor pre-class reminder failed — claim released for retry",
        );
        continue;
      }

      await markInstructorReminderSent(cls.id, instructor.id);
      notifiedNames.push(instructor.name);
    } catch (err) {
      await releaseInstructorReminderClaim(cls.id, instructor.id);
      log.error(
        { err, instructorId: instructor.id, classId: cls.id },
        "Instructor pre-class reminder failed — claim released for retry",
      );
    }
  }

  if (notifiedNames.length === 0) return;

  const admins = await db
    .select({ name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.role, "administrator"),
        eq(usersTable.adminRole, "admin"),
        isNotNull(usersTable.email),
      ),
    ) as { name: string; email: string }[];

  for (const admin of admins) {
    const content = buildAdminConfirmationEmail(
      admin.name,
      cls,
      notifiedNames,
      signinUrl,
    );
    await sendEmail({ to: admin.email, ...content }, logger).catch((err) =>
      log.error(
        { err, to: admin.email, classId: cls.id },
        "Instructor pre-class reminder admin confirmation failed",
      ),
    );
  }

  log.info(
    {
      classId: cls.id,
      instructors: notifiedNames,
      adminCount: admins.length,
    },
    "Instructor pre-class reminder sent",
  );
}

// ---------------------------------------------------------------------------
// Main send function
// ---------------------------------------------------------------------------

export async function sendInstructorPreClassReminders(): Promise<void> {
  const now = new Date();
  // A UTC date plus/minus one day covers every IANA timezone while avoiding
  // an unbounded scan of old classes. The final check uses each class's zone.
  const utcDate = localIsoDate(now, "UTC");
  const startDate = shiftIsoDate(utcDate, -1);
  const endDate = shiftIsoDate(utcDate, 2);

  const classes = await db
    .select()
    .from(classesTable)
    .where(
      and(
        gte(classesTable.date, startDate),
        lte(classesTable.date, endDate),
        inArray(classesTable.status, ["confirmed", "scheduled"]),
      ),
    );
  const dueClasses = classes.filter((cls) => isClassWithin24Hours(cls, now));

  if (dueClasses.length === 0) {
    logger.debug(
      { startDate, endDate },
      "Instructor pre-class reminder: no classes within 24 hours",
    );
    return;
  }

  logger.info(
    { count: dueClasses.length },
    "Instructor pre-class reminder: classes found within 24 hours",
  );

  for (const cls of dueClasses) {
    const instructors = await getClassInstructors(cls);

    if (instructors.length === 0) {
      logger.warn({ classId: cls.id }, "Instructor pre-class reminder: no active instructor assigned, skipping");
      continue;
    }

    await sendRemindersForClass(cls, instructors, logger);
  }
}

/**
 * If `cls` starts within the next 24 hours, sends pre-class reminders to any
 * of the supplied `instructorIds` that haven't already received one.
 */
export async function sendImmediateReminderIfWithin24h(
  cls: typeof classesTable.$inferSelect,
  instructorIds: number[],
  log: { info: (...args: unknown[]) => void; warn: (...args: unknown[]) => void; error: (...args: unknown[]) => void },
): Promise<void> {
  // Only send for active classes — mirrors the status filter used by the daily job
  if (cls.status !== "confirmed" && cls.status !== "scheduled") return;

  if (!isClassWithin24Hours(cls)) return;

  // Fetch instructor records — only those with an email address
  const instructors = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(and(inArray(usersTable.id, instructorIds), eq(usersTable.isActive, true), isNotNull(usersTable.email))) as { id: number; name: string; email: string }[];

  if (instructors.length === 0) {
    log.warn({ classId: cls.id }, "Immediate instructor reminder: no active instructors with email found, skipping");
    return;
  }

  await sendRemindersForClass(cls, instructors, log);
}
export function scheduleInstructorPreClassReminders(): void {
  const MS_PER_HOUR = 60 * 60 * 1000;

  // Durable claims make repeated checks safe. Keep the one-hour startup delay
  // to avoid sending from short-lived development processes, then run hourly.
  setTimeout(() => {
    sendInstructorPreClassReminders().catch(err =>
      logger.error({ err }, "Instructor pre-class reminder initial check failed"),
    );
    setInterval(() => {
      sendInstructorPreClassReminders().catch(err =>
        logger.error({ err }, "Instructor pre-class reminder hourly check failed"),
      );
    }, MS_PER_HOUR);
  }, MS_PER_HOUR);

  logger.info("Instructor pre-class reminder job scheduled (hourly, first check in 1 hour)");
}
