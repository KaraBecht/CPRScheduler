/**
 * 24-hour pre-class instructor reminder:
 *   1. Finds confirmed/scheduled classes happening tomorrow.
 *   2. Emails each assigned active instructor with the roster sign-in link.
 *   3. Sends a confirmation to admin sub-role users listing who was notified.
 *
 * Runs daily via scheduleInstructorPreClassReminders().
 */

import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  classesTable,
  classInstructorsTable,
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

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
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

  const subject = `Reminder: You're teaching tomorrow — ${cls.title} (${formattedDate})`;

  const cal = buildCalendarLinks(
    { classId: cls.id, title: cls.title, certificationType: cls.certificationType, date: cls.date, startTime: cls.startTime, endTime: cls.endTime, location: cls.location },
    appBaseUrl(),
  );

  const text = [
    `Hi ${instructorName},`,
    ``,
    `This is your 24-hour reminder for the CPR class you are scheduled to teach tomorrow.`,
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
    <h1 style="margin:0;color:#fff;font-size:18px">You're Teaching Tomorrow</h1>
    <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px">PulsePoint CPR Hub — Instructor Reminder</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <p style="margin:0 0 16px">Hi <strong>${instructorName}</strong>,</p>
    <p style="margin:0 0 20px">This is your 24-hour reminder for the CPR class you are scheduled to teach tomorrow.</p>

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
    `A 24-hour pre-class reminder was sent to the following instructor(s) for tomorrow's class:`,
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
    <p style="margin:0 0 20px">A 24-hour pre-class reminder was sent to the following instructor(s) for tomorrow's class:</p>

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

// ---------------------------------------------------------------------------
// Instructor lookup
// ---------------------------------------------------------------------------

async function getClassInstructors(
  cls: typeof classesTable.$inferSelect,
): Promise<{ id: number; name: string; email: string }[]> {
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

  if (accepted.length > 0) return accepted;

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

  if (fromJoin.length > 0) return fromJoin;

  // 3. Legacy: single instructorId column
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
// Main send function
// ---------------------------------------------------------------------------

export async function sendInstructorPreClassReminders(): Promise<void> {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const targetDate = isoDate(tomorrow);

  const classes = await db
    .select()
    .from(classesTable)
    .where(
      and(
        eq(classesTable.date, targetDate),
        inArray(classesTable.status, ["confirmed", "scheduled"]),
      ),
    );

  if (classes.length === 0) {
    logger.debug({ targetDate }, "Instructor pre-class reminder: no classes tomorrow");
    return;
  }

  // Admin sub-role recipients — fetched once for all classes
  const admins = await db
    .select({ name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(and(eq(usersTable.role, "administrator"), eq(usersTable.adminRole, "admin")));

  logger.info({ targetDate, count: classes.length }, "Instructor pre-class reminder: sending");

  for (const cls of classes) {
    const instructors = await getClassInstructors(cls);

    if (instructors.length === 0) {
      logger.warn({ classId: cls.id }, "Instructor pre-class reminder: no active instructor assigned, skipping");
      continue;
    }

    const signinUrl = `${appBaseUrl()}/roster-signin/${cls.id}`;
    const rosterUrl = `${appBaseUrl()}/classes/${cls.id}/signin-sheet`;

    // Email each instructor
    for (const instructor of instructors) {
      const content = buildInstructorEmail(instructor.name, cls, signinUrl, rosterUrl);
      await sendEmail({ to: instructor.email, ...content }, logger).catch(err =>
        logger.error({ err, instructorId: instructor.id, classId: cls.id }, "Instructor pre-class reminder failed"),
      );
    }

    // Confirm to each admin
    const instructorNames = instructors.map(i => i.name);
    for (const admin of admins) {
      const content = buildAdminConfirmationEmail(admin.name, cls, instructorNames, signinUrl);
      await sendEmail({ to: admin.email, ...content }, logger).catch(err =>
        logger.error({ err, to: admin.email, classId: cls.id }, "Instructor pre-class reminder admin confirm failed"),
      );
    }

    logger.info(
      { classId: cls.id, instructors: instructorNames, adminCount: admins.length },
      "Instructor pre-class reminder sent",
    );
  }
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

export function scheduleInstructorPreClassReminders(): void {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // First check after 1 hour (avoids firing on every server restart)
  setTimeout(() => {
    sendInstructorPreClassReminders().catch(err =>
      logger.error({ err }, "Instructor pre-class reminder initial check failed"),
    );
    setInterval(() => {
      sendInstructorPreClassReminders().catch(err =>
        logger.error({ err }, "Instructor pre-class reminder daily check failed"),
      );
    }, MS_PER_DAY);
  }, 60 * 60 * 1000);

  logger.info("Instructor pre-class reminder job scheduled (daily, first check in 1 hour)");
}
