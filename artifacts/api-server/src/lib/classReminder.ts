import { db, classesTable, remindersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { formatCertificationType } from "./formatCertType";

type ClassRow = typeof classesTable.$inferSelect;

function appBaseUrl(): string {
  const domains = process.env["REPLIT_DOMAINS"];
  if (domains) {
    const first = domains.split(",")[0]?.trim();
    if (first) return `https://${first}`;
  }
  return "http://localhost";
}

function formatDateLong(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year!, month! - 1, day!)));
}

function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h! >= 12 ? "PM" : "AM";
  const hour = h! % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function buildEmailDraft(classRow: ClassRow): { subject: string; body: string } {
  const classDate = new Date(classRow.date + "T00:00:00Z");
  const now = new Date();
  const nowUtcMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const daysAway = Math.round(
    (classDate.getTime() - nowUtcMidnight.getTime()) / 86_400_000,
  );
  const daysLabel =
    daysAway <= 0
      ? "today"
      : daysAway === 1
        ? "1 day"
        : `${daysAway} days`;

  const formattedDate = formatDateLong(classRow.date);
  const timeRange = classRow.endTime
    ? `${formatTime12(classRow.startTime)} – ${formatTime12(classRow.endTime)}`
    : formatTime12(classRow.startTime);

  const certLabel = formatCertificationType(classRow.certificationType);
  const classesUrl = `${appBaseUrl()}/classes`;

  const subject = `Upcoming CPR Class — ${formattedDate} at ${classRow.location}`;

  const body = [
    `📋 CLASS REMINDER`,
    ``,
    `${classRow.title}`,
    `Certification: ${certLabel}`,
    `Location:      ${classRow.location}`,
    `Date:          ${formattedDate}`,
    `Time:          ${timeRange}`,
    ``,
    `─────────────────────────────────────────`,
    `This class is coming up in ${daysLabel}.`,
    `─────────────────────────────────────────`,
    ``,
    `PRE-CLASS CHECKLIST`,
    ``,
    `[ ] (Checklist items will be added once uploaded)`,
    ``,
    `To check off preparation items as they are completed, click the link below:`,
    ``,
    `→ View class & checklist: ${classesUrl}`,
    ``,
    `─────────────────────────────────────────`,
    `This is an automated reminder from PulsePoint CPR Scheduler.`,
  ].join("\n");

  return { subject, body };
}

/**
 * Creates or updates the 14-day reminder for a scheduled class.
 * Deletes any pending reminder if the class is cancelled or completed.
 */
export async function upsertClassReminder(classRow: ClassRow): Promise<void> {
  if (classRow.status !== "scheduled") {
    // Remove pending reminder if class is no longer active
    await db
      .delete(remindersTable)
      .where(eq(remindersTable.classId, classRow.id));
    return;
  }

  const classDate = new Date(classRow.date + "T00:00:00Z");
  const triggerMs = classDate.getTime() - 14 * 86_400_000;
  const triggerDate = new Date(triggerMs).toISOString().split("T")[0]!;

  const { subject, body } = buildEmailDraft(classRow);

  const [existing] = await db
    .select({ id: remindersTable.id })
    .from(remindersTable)
    .where(eq(remindersTable.classId, classRow.id));

  if (existing) {
    await db
      .update(remindersTable)
      .set({ triggerDate, emailSubject: subject, emailBody: body })
      .where(eq(remindersTable.classId, classRow.id));
  } else {
    await db.insert(remindersTable).values({
      classId: classRow.id,
      triggerDate,
      emailSubject: subject,
      emailBody: body,
    });
  }
}
