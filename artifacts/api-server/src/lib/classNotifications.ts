/**
 * Unified class confirmation / 7-day-reminder notification system.
 *
 * Recipients per notification:
 *   • Requestor        — always, if an email address is available
 *   • admin sub-role   — Sharon & Kara (all users with adminRole = 'admin')
 *   • coordinator      — Carmen (adminRole = 'coordinator')
 *   • EHS              — filtered by business unit extracted from the location's
 *                        notes field ("Business Unit: FOX Television Stations").
 *                        Matched against each EHS user's `organization` value
 *                        (case-insensitive substring). Falls back to all EHS
 *                        users if no location / business unit is found.
 */

import { and, eq, ilike } from "drizzle-orm";
import type { Logger } from "pino";
import { db, locationsTable, usersTable } from "@workspace/db";
import { sendEmail } from "./sendgrid";
import { formatCertificationType } from "./formatCertType";
import { buildCalendarLinks, calendarHtml, calendarText } from "./calendarLinks";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClassInfo {
  id: number;
  title: string;
  location: string;
  certificationType: string;
  date: string;
  startTime: string;
  endTime?: string | null;
}

function appBaseUrl(): string {
  const domains = process.env["REPLIT_DOMAINS"];
  if (domains) {
    const first = domains.split(",")[0]?.trim();
    if (first) return `https://${first}`;
  }
  return "http://localhost";
}

export interface RequestorInfo {
  name: string;
  email: string | null;
  phone?: string | null;
  organizationName: string;
}

export type NotificationVariant = "confirmation" | "reminder";

// ---------------------------------------------------------------------------
// Business-unit helpers
// ---------------------------------------------------------------------------

function extractBusinessUnit(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const m = notes.match(/Business Unit:\s*(.+)/i);
  return m?.[1]?.trim() ?? null;
}

async function getLocationNotes(locationName: string): Promise<string | null> {
  const [loc] = await db
    .select({ notes: locationsTable.notes })
    .from(locationsTable)
    .where(ilike(locationsTable.name, locationName))
    .limit(1);
  return loc?.notes ?? null;
}

// ---------------------------------------------------------------------------
// Recipient resolution
// ---------------------------------------------------------------------------

interface Recipient {
  name: string;
  email: string;
}

async function getStaffRecipients(classLocation: string, classBusinessUnit?: string | null): Promise<{
  admins: Recipient[];
  coordinators: Recipient[];
  ehsUsers: Recipient[];
  businessUnit: string | null;
}> {
  const [allAdminUsers, notes] = await Promise.all([
    db
      .select({ name: usersTable.name, email: usersTable.email, adminRole: usersTable.adminRole, organization: usersTable.organization })
      .from(usersTable)
      .where(eq(usersTable.role, "administrator")),
    getLocationNotes(classLocation),
  ]);

  // Prefer the class's own business unit field; fall back to what's in the location notes
  const businessUnit = classBusinessUnit ?? extractBusinessUnit(notes);

  const admins     = allAdminUsers.filter(u => u.adminRole === "admin");
  const coordinators = allAdminUsers.filter(u => u.adminRole === "coordinator");
  const allEhs     = allAdminUsers.filter(u => u.adminRole === "ehs");

  // Match EHS users whose organization is contained in the business unit string
  // (or vice-versa). Falls back to all EHS users when no business unit is set.
  let ehsUsers = allEhs;
  if (businessUnit) {
    const buLower = businessUnit.toLowerCase();
    const matched = allEhs.filter(u => {
      if (!u.organization) return false;
      const orgLower = u.organization.toLowerCase();
      return buLower.includes(orgLower) || orgLower.includes(buLower);
    });
    if (matched.length > 0) ehsUsers = matched;
  }

  const toRecipient = (u: { name: string; email: string }): Recipient => ({ name: u.name, email: u.email });

  return {
    admins: admins.map(toRecipient),
    coordinators: coordinators.map(toRecipient),
    ehsUsers: ehsUsers.map(toRecipient),
    businessUnit,
  };
}

// ---------------------------------------------------------------------------
// Email builders
// ---------------------------------------------------------------------------

function row(label: string, value: string): string {
  return `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;white-space:nowrap;font-size:14px">${label}</td><td style="padding:4px 0;font-size:14px"><strong>${value}</strong></td></tr>`;
}

function buildRequestorEmail(
  cls: ClassInfo,
  requestor: RequestorInfo,
  variant: NotificationVariant,
): { subject: string; text: string; html: string } {
  const cert = formatCertificationType(cls.certificationType);
  const isReminder = variant === "reminder";

  const subject = isReminder
    ? `Reminder: Your CPR class is one week away — ${requestor.organizationName}`
    : `Your CPR class is confirmed — ${requestor.organizationName} (${cert})`;

  const intro = isReminder
    ? `This is a reminder that your CPR training class is coming up in one week.`
    : `Great news — your CPR training request has been approved and your class has been confirmed!`;

  const reminderNote = `Please note: classes are 3.5–4 hours long. We recommend bringing water and wearing non-restrictive clothing that allows for practice of CPR skills.`;

  const cal = buildCalendarLinks({ classId: cls.id, title: cls.title, certificationType: cls.certificationType, date: cls.date, startTime: cls.startTime, endTime: cls.endTime, location: cls.location }, appBaseUrl());

  const text = [
    `Hi ${requestor.name},`,
    ``,
    intro,
    ``,
    `CLASS DETAILS`,
    `  Organization:  ${requestor.organizationName}`,
    `  Certification: ${cert}`,
    `  Date:          ${cls.date} @ ${cls.startTime}`,
    cls.title    ? `  Location:      ${cls.title}` : null,
    cls.location ? `  Address:       ${cls.location}` : null,
    ``,
    isReminder ? reminderNote : `Our team will follow up shortly with the instructor and location details if not yet confirmed.`,
    ``,
    `Thank you for choosing PulsePoint CPR Hub.`,
    ``,
    calendarText(cal),
  ].filter(l => l !== null).join("\n");

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827">
  <div style="background:#1d4ed8;padding:20px 24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;color:#fff;font-size:18px">${isReminder ? "One-Week Class Reminder" : "Your CPR Class Is Confirmed!"}</h1>
    <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px">PulsePoint CPR Hub</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <p style="margin:0 0 16px">Hi <strong>${requestor.name}</strong>,</p>
    <p style="margin:0 0 20px">${intro}</p>

    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Class Details</h2>
    <table style="border-collapse:collapse;margin-bottom:20px">
      ${row("Organization", requestor.organizationName)}
      ${row("Certification", cert)}
      ${row("Date", `${cls.date} @ ${cls.startTime}`)}
      ${cls.title    ? row("Location", cls.title) : ""}
      ${cls.location ? row("Address",  cls.location) : ""}
    </table>

    ${isReminder
      ? `<div style="background:#eff6ff;border-left:4px solid #1d4ed8;padding:12px 16px;border-radius:0 4px 4px 0;margin-bottom:20px">
      <p style="margin:0;color:#1e40af;font-size:14px"><strong>Please note:</strong> Classes are 3.5–4 hours long. We recommend bringing water and wearing non-restrictive clothing that allows for practice of CPR skills.</p>
    </div>`
      : `<p style="margin:0 0 8px;color:#374151">Our team will follow up shortly with the instructor and location details if not yet confirmed.</p>`}
    <p style="margin:0 0 0;color:#374151">Thank you for choosing <strong>PulsePoint CPR Hub</strong>.</p>
    ${calendarHtml(cal)}
  </div>
</div>`.trim();

  return { subject, text, html };
}

function buildStaffEmail(
  cls: ClassInfo,
  requestor: RequestorInfo | null,
  variant: NotificationVariant,
  businessUnit: string | null,
  recipientName: string,
  role: "admin" | "coordinator" | "ehs" = "admin",
): { subject: string; text: string; html: string } {
  const cert = formatCertificationType(cls.certificationType);
  const isReminder = variant === "reminder";
  const isCoordinator = role === "coordinator";
  const orgLabel = requestor?.organizationName ?? cls.title;

  const subject = isReminder
    ? `[Reminder] One week until class — ${orgLabel} (${cert})`
    : `[Admin] Class confirmed — ${orgLabel} (${cert})`;

  const cal = buildCalendarLinks({ classId: cls.id, title: cls.title, certificationType: cls.certificationType, date: cls.date, startTime: cls.startTime, endTime: cls.endTime, location: cls.location }, appBaseUrl());

  const text = [
    `Hi ${recipientName},`,
    ``,
    isReminder
      ? `A CPR training class is scheduled for next week.`
      : `A training request has been approved and a class has been confirmed.`,
    ``,
    requestor ? `REQUESTOR` : null,
    requestor ? `  Name:         ${requestor.name}` : null,
    requestor?.email ? `  Email:        ${requestor.email}` : null,
    requestor?.phone ? `  Phone:        ${requestor.phone}` : null,
    requestor ? `  Organization: ${requestor.organizationName}` : null,
    requestor ? `` : null,
    `CLASS`,
    `  Certification: ${cert}`,
    `  Date:          ${cls.date} @ ${cls.startTime}`,
    cls.title    ? `  Location:      ${cls.title}` : null,
    cls.location ? `  Address:       ${cls.location}` : null,
    businessUnit ? `  Business Unit: ${businessUnit}` : null,
    ``,
    isCoordinator && !isReminder ? `ACTION REQUIRED — ACCOMMODATIONS` : null,
    isCoordinator && !isReminder ? `Please arrange hotel/travel accommodations for the assigned instructor.` : null,
    isCoordinator && !isReminder ? `Confirm bookings are in place and share the details with the instructor before the class date.` : null,
    isCoordinator && !isReminder ? `` : null,
    calendarText(cal),
  ].filter(l => l !== null).join("\n");

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827">
  <div style="background:#1d4ed8;padding:20px 24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;color:#fff;font-size:18px">${isReminder ? "One-Week Class Reminder" : "Class Confirmed"}</h1>
    <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px">PulsePoint CPR Hub — Staff Notification</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <p style="margin:0 0 16px">Hi <strong>${recipientName}</strong>,</p>
    <p style="margin:0 0 20px">${isReminder ? "A CPR training class is scheduled for next week." : "A training request has been approved and a class has been confirmed."}</p>

    ${requestor ? `
    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Requestor</h2>
    <table style="border-collapse:collapse;margin-bottom:20px">
      ${row("Name", requestor.name)}
      ${requestor.email ? row("Email", `<a href="mailto:${requestor.email}" style="color:#1d4ed8">${requestor.email}</a>`) : ""}
      ${requestor.phone ? row("Phone", requestor.phone) : ""}
      ${row("Organization", requestor.organizationName)}
    </table>` : ""}

    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Class</h2>
    <table style="border-collapse:collapse;margin-bottom:4px">
      ${row("Certification", cert)}
      ${row("Date", `${cls.date} @ ${cls.startTime}`)}
      ${cls.title    ? row("Location", cls.title) : ""}
      ${cls.location ? row("Address",  cls.location) : ""}
      ${businessUnit ? row("Business Unit", businessUnit) : ""}
    </table>

    ${isCoordinator && !isReminder ? `
    <div style="margin-top:24px;padding:16px 20px;background:#fefce8;border:1px solid #fde047;border-radius:8px">
      <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#854d0e;margin:0 0 8px">⚠ Action Required — Accommodations</h2>
      <p style="margin:0;font-size:14px;color:#713f12">
        Please arrange hotel and/or travel accommodations for the assigned instructor.
        Confirm bookings are in place and share the details with the instructor before the class date.
      </p>
    </div>` : ""}

    ${calendarHtml(cal)}
  </div>
</div>`.trim();

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// Main send function
// ---------------------------------------------------------------------------

export async function sendClassNotifications(
  cls: ClassInfo,
  requestor: RequestorInfo | null,
  variant: NotificationVariant,
  log: Logger,
  classBusinessUnit?: string | null,
): Promise<void> {
  const { admins, coordinators, ehsUsers, businessUnit } =
    await getStaffRecipients(cls.location, classBusinessUnit);

  const staffRecipients = [...admins, ...coordinators, ...ehsUsers];

  // Requestor
  if (requestor?.email) {
    const content = buildRequestorEmail(cls, requestor, variant);
    await sendEmail({ to: requestor.email, ...content }, log).catch(err =>
      log.error({ err, to: requestor!.email }, "Class notification to requestor failed"),
    );
  }

  // Staff (admin + coordinator + EHS) — personalized per recipient, sent sequentially
  const coordinatorEmails = new Set(coordinators.map(c => c.email).filter(Boolean));
  const ehsEmails = new Set(ehsUsers.map(e => e.email).filter(Boolean));
  for (const staff of staffRecipients) {
    if (!staff.email) continue;
    const role = coordinatorEmails.has(staff.email) ? "coordinator"
      : ehsEmails.has(staff.email) ? "ehs"
      : "admin";
    const staffEmail = buildStaffEmail(cls, requestor, variant, businessUnit, staff.name, role);
    await sendEmail({ to: staff.email, ...staffEmail }, log).catch(err =>
      log.error({ err, to: staff.email }, "Class notification to staff failed"),
    );
  }

  log.info(
    {
      variant,
      classId: cls.id,
      businessUnit,
      requestorEmailed: !!requestor?.email,
      adminCount: admins.length,
      coordinatorCount: coordinators.length,
      ehsCount: ehsUsers.length,
    },
    "Class notifications sent",
  );
}
