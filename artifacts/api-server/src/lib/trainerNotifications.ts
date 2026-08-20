/**
 * Trainer invitation flow:
 *   1. When a class is confirmed/scheduled, send every active instructor an
 *      email with accept / decline links (token-based, stored in trainer_invitations).
 *   2. When a trainer responds, notify all admin sub-role users.
 *
 * "Active trainers" = all users with role = 'instructor'.
 * No emails are ever sent to users with role = 'student'.
 */

import crypto from "crypto";
import { eq, count, and } from "drizzle-orm";
import type { Logger } from "pino";
import {
  db,
  usersTable,
  classesTable,
  trainerInvitationsTable,
} from "@workspace/db";
import { sendEmail } from "./sendgrid";
import { formatCertificationType } from "./formatCertType";
import { buildCalendarLinks, calendarHtml, calendarText } from "./calendarLinks";

export const ADMIN_SERVICE_EMAIL = "svc_medical@fox.com";
export const API_PATH_PREFIX = "/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function apiBaseUrl(): string {
  const domains = process.env["REPLIT_DOMAINS"];
  if (domains) {
    const first = domains.split(",")[0]?.trim();
    if (first) return `https://${first}${API_PATH_PREFIX}`;
  }
  return `http://localhost${API_PATH_PREFIX}`;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y!, m! - 1, d!)));
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h! >= 12 ? "PM" : "AM";
  return `${h! % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ---------------------------------------------------------------------------
// Email builders
// ---------------------------------------------------------------------------

function buildTrainerInviteEmail(
  trainerName: string,
  cls: {
    id: number;
    title: string;
    certificationType: string;
    date: string;
    startTime: string;
    endTime?: string | null;
    location: string;
    capacity: number | null;
  },
  acceptUrl: string,
  declineUrl: string,
): { subject: string; text: string; html: string } {
  const cert = formatCertificationType(cls.certificationType);
  const formattedDate = formatDate(cls.date);
  const formattedTime = formatTime(cls.startTime);
  const subject = `CPR Class Invitation — ${cls.title} on ${formattedDate}`;

  const cal = buildCalendarLinks(
    { classId: cls.id, title: cls.title, certificationType: cls.certificationType, date: cls.date, startTime: cls.startTime, endTime: cls.endTime, location: cls.location },
    apiBaseUrl(),
  );

  const text = [
    `Hi ${trainerName},`,
    ``,
    `You have been invited to instruct a CPR training class. Please review the details below and let us know if you can take this class.`,
    ``,
    `CLASS DETAILS`,
    `  Organization:  ${cls.title}`,
    `  Certification: ${cert}`,
    `  Date:          ${formattedDate}`,
    `  Time:          ${formattedTime}`,
    `  Location:      ${cls.location}`,
    cls.capacity ? `  Capacity:      ${cls.capacity} attendees` : null,
    ``,
    `✓ ACCEPT this class:  ${acceptUrl}`,
    `✗ DECLINE this class: ${declineUrl}`,
    ``,
    calendarText(cal),
    ``,
    `Questions? Contact us at ${ADMIN_SERVICE_EMAIL}`,
    ``,
    `— PulsePoint CPR Hub`,
  ].filter((l): l is string => l !== null).join("\n");

  const btn = (href: string, bg: string, label: string) =>
    `<a href="${href}" style="display:inline-block;padding:12px 28px;border-radius:6px;font-weight:600;font-size:15px;text-decoration:none;color:#fff;background:${bg}">${label}</a>`;

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827">
  <div style="background:#1d4ed8;padding:20px 24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;color:#fff;font-size:18px">CPR Class Invitation</h1>
    <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px">PulsePoint CPR Hub</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <p style="margin:0 0 16px">Hi <strong>${trainerName}</strong>,</p>
    <p style="margin:0 0 20px">You have been invited to instruct a CPR training class. Please review the details below and let us know if you can take this class.</p>

    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Class Details</h2>
    <table style="border-collapse:collapse;margin-bottom:24px">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Organization</td><td style="font-size:14px"><strong>${cls.title}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Certification</td><td style="font-size:14px"><strong>${cert}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Date</td><td style="font-size:14px"><strong>${formattedDate}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Time</td><td style="font-size:14px"><strong>${formattedTime}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Location</td><td style="font-size:14px"><strong>${cls.location}</strong></td></tr>
      ${cls.capacity ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Capacity</td><td style="font-size:14px"><strong>${cls.capacity} attendees</strong></td></tr>` : ""}
    </table>

    <p style="margin:0 0 16px;font-weight:600">Can you teach this class?</p>
    <table style="border-collapse:collapse"><tr>
      <td style="padding-right:12px">${btn(acceptUrl, "#16a34a", "✓ Accept")}</td>
      <td>${btn(declineUrl, "#dc2626", "✗ Decline")}</td>
    </tr></table>

    ${calendarHtml(cal)}

    <p style="margin:16px 0 0;font-size:13px;color:#6b7280">
      Questions? Contact <a href="mailto:${ADMIN_SERVICE_EMAIL}" style="color:#1d4ed8">${ADMIN_SERVICE_EMAIL}</a>
    </p>
  </div>
</div>`.trim();

  return { subject, text, html };
}

function buildTrainerResponseEmail(
  recipientName: string,
  trainerName: string,
  trainerEmail: string,
  decision: "accepted" | "declined",
  cls: {
    title: string;
    certificationType: string;
    date: string;
    startTime: string;
    location: string;
  },
): { subject: string; text: string; html: string } {
  const cert = formatCertificationType(cls.certificationType);
  const formattedDate = formatDate(cls.date);
  const verb = decision === "accepted" ? "accepted" : "declined";
  const color = decision === "accepted" ? "#16a34a" : "#dc2626";
  const icon = decision === "accepted" ? "✓" : "✗";

  const subject = `[Trainer Response] ${trainerName} ${verb} — ${cls.title}`;

  const text = [
    `Hi ${recipientName},`,
    ``,
    `${trainerName} (${trainerEmail}) has ${verb} the class invitation.`,
    ``,
    `CLASS`,
    `  Organization:  ${cls.title}`,
    `  Certification: ${cert}`,
    `  Date:          ${formattedDate}`,
    `  Location:      ${cls.location}`,
  ].join("\n");

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827">
  <div style="background:#1d4ed8;padding:20px 24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;color:#fff;font-size:18px">Trainer Response</h1>
    <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px">PulsePoint CPR Hub — Admin Notification</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <p style="margin:0 0 16px">Hi <strong>${recipientName}</strong>,</p>
    <p style="margin:0 0 20px">
      <strong>${trainerName}</strong>
      (<a href="mailto:${trainerEmail}" style="color:#1d4ed8">${trainerEmail}</a>)
      has responded to the class invitation:
    </p>
    <p style="margin:0 0 24px">
      <span style="display:inline-block;padding:8px 20px;border-radius:6px;background:${color};color:#fff;font-weight:700;font-size:16px">
        ${icon} ${verb.charAt(0).toUpperCase() + verb.slice(1)}
      </span>
    </p>
    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Class</h2>
    <table style="border-collapse:collapse">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Organization</td><td style="font-size:14px"><strong>${cls.title}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Certification</td><td style="font-size:14px"><strong>${cert}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Date</td><td style="font-size:14px"><strong>${formattedDate}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Location</td><td style="font-size:14px"><strong>${cls.location}</strong></td></tr>
    </table>
  </div>
</div>`.trim();

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// Public send functions
// ---------------------------------------------------------------------------

export interface ClassBasic {
  id: number;
  title: string;
  certificationType: string;
  date: string;
  startTime: string;
  location: string;
  capacity: number | null;
}

/**
 * Send trainer invitation emails for a class.
 *
 * If specific instructors are assigned to the class (via class_instructors or
 * the legacy instructorId column), only those instructors receive the email.
 * When no instructor is assigned, all active instructors are invited.
 *
 * Skips silently if invitations have already been created for this class.
 */
export async function sendTrainerInvitations(
  cls: ClassBasic,
  log: Logger,
): Promise<void> {
  // Avoid re-sending if invites already exist
  const [{ existingCount }] = await db
    .select({ existingCount: count() })
    .from(trainerInvitationsTable)
    .where(eq(trainerInvitationsTable.classId, cls.id));

  if (existingCount > 0) {
    log.debug({ classId: cls.id }, "Trainer invites already exist, skipping");
    return;
  }

  // 1. Try class_instructors join table (preferred, multi-instructor)
  let instructors = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(classInstructorsTable)
    .innerJoin(usersTable, eq(classInstructorsTable.userId, usersTable.id))
    .where(and(
      eq(classInstructorsTable.classId, cls.id),
      eq(usersTable.isActive, true),
    ));

  // 2. Fall back to legacy single instructorId on the class row
  if (instructors.length === 0) {
    const [clsRow] = await db
      .select({ instructorId: classesTable.instructorId })
      .from(classesTable)
      .where(eq(classesTable.id, cls.id));
    if (clsRow?.instructorId) {
      const [leg] = await db
        .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
        .from(usersTable)
        .where(and(eq(usersTable.id, clsRow.instructorId), eq(usersTable.isActive, true)));
      if (leg) instructors = [leg];
    }
  }

  // 3. No specific instructor assigned — invite all active instructors
  if (instructors.length === 0) {
    instructors = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(and(eq(usersTable.role, "instructor"), eq(usersTable.isActive, true)));
  }

  if (instructors.length === 0) {
    log.warn({ classId: cls.id }, "No instructors found — trainer invites not sent");
    return;
  }

  const base = apiBaseUrl();
  const sends: Promise<unknown>[] = [];

  for (const instructor of instructors) {
    const token = crypto.randomUUID();

    await db.insert(trainerInvitationsTable).values({
      classId: cls.id,
      userId: instructor.id,
      token,
      status: "pending",
    }).onConflictDoNothing();

    if (!instructor.email) continue; // skip instructors without an email address

    const acceptUrl  = `${base}/trainer-invite/${token}/accept`;
    const declineUrl = `${base}/trainer-invite/${token}/decline`;

    const emailContent = buildTrainerInviteEmail(instructor.name, cls, acceptUrl, declineUrl);
    sends.push(
      sendEmail({ to: instructor.email, ...emailContent }, log).catch(err =>
        log.error({ err, instructorId: instructor.id }, "Trainer invite email failed"),
      ),
    );
  }

  await Promise.allSettled(sends);
  log.info({ classId: cls.id, inviteCount: instructors.length }, "Trainer invitations sent");
}

/**
 * Record a trainer's accept/decline response and notify admin sub-role users.
 */
export async function recordTrainerResponse(
  token: string,
  decision: "accepted" | "declined",
  log: Logger,
): Promise<{ found: boolean; alreadyResponded: boolean }> {
  const [invite] = await db
    .select()
    .from(trainerInvitationsTable)
    .where(eq(trainerInvitationsTable.token, token));

  if (!invite) return { found: false, alreadyResponded: false };
  if (invite.status !== "pending") return { found: true, alreadyResponded: true };

  // Update status
  await db
    .update(trainerInvitationsTable)
    .set({ status: decision, respondedAt: new Date() })
    .where(eq(trainerInvitationsTable.token, token));

  // Fetch trainer + class in parallel
  const [trainerRows, classRows] = await Promise.all([
    db.select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, invite.userId)),
    db.select().from(classesTable).where(eq(classesTable.id, invite.classId)),
  ]);

  const trainer = trainerRows[0];
  const cls     = classRows[0];
  if (!trainer || !cls) return { found: true, alreadyResponded: false };

  // Notify admin sub-role users
  const admins = await db
    .select({ email: usersTable.email, name: usersTable.name })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.role, "administrator"),
        eq(usersTable.adminRole, "admin"),
      ),
    );

  await Promise.allSettled(
    admins
      .filter(a => !!a.email)
      .map(admin => {
        const emailContent = buildTrainerResponseEmail(admin.name, trainer.name, trainer.email ?? "", decision, cls);
        return sendEmail({ to: admin.email!, ...emailContent }, log).catch(err =>
          log.error({ err, to: admin.email }, "Trainer response admin notification failed"),
        );
      }),
  );

  log.info(
    { token, decision, trainerName: trainer.name, adminCount: admins.length },
    "Trainer response recorded and admins notified",
  );

  return { found: true, alreadyResponded: false };
}
