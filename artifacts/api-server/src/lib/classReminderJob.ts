/**
 * Daily job: finds confirmed/scheduled classes exactly 7 days from today
 * and sends the reminder variant of the class notification to all recipients.
 */

import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { db, classesTable, requestsTable } from "@workspace/db";
import { logger } from "./logger";
import { sendClassNotifications, type ClassInfo, type RequestorInfo } from "./classNotifications";

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

export async function sendSevenDayReminders(): Promise<void> {
  const target = new Date();
  target.setUTCDate(target.getUTCDate() + 7);
  const targetDate = isoDate(target);

  const classes = await db
    .select()
    .from(classesTable)
    .where(
      and(
        eq(classesTable.date, targetDate),
        inArray(classesTable.status, ["confirmed", "scheduled"]),
        isNull(classesTable.sevenDayReminderSentAt),
      ),
    );

  if (classes.length === 0) {
    logger.debug({ targetDate }, "7-day reminder: no classes on target date");
    return;
  }

  // Look up linked requests for requestor info (classId → request row)
  const classIds = classes.map(c => c.id);
  const linkedRequests = await db
    .select()
    .from(requestsTable)
    .where(inArray(requestsTable.classId, classIds));

  const requestByClassId = new Map(linkedRequests.map(r => [r.classId, r]));

  logger.info({ targetDate, count: classes.length }, "7-day reminder: sending emails");

  for (const cls of classes) {
    // Claim the class in the database before sending. This makes the job
    // idempotent across restarts and multiple server instances. A stale claim
    // is released after an hour so a process crash does not suppress the next
    // day's retry.
    const staleClaimBefore = new Date(Date.now() - 60 * 60 * 1000);
    const [claimed] = await db
      .update(classesTable)
      .set({ sevenDayReminderClaimedAt: new Date() })
      .where(
        and(
          eq(classesTable.id, cls.id),
          isNull(classesTable.sevenDayReminderSentAt),
          or(
            isNull(classesTable.sevenDayReminderClaimedAt),
            lt(classesTable.sevenDayReminderClaimedAt, staleClaimBefore),
          ),
        ),
      )
      .returning({ id: classesTable.id });

    if (!claimed) {
      logger.debug({ classId: cls.id }, "7-day reminder: already claimed or sent, skipping");
      continue;
    }

    const clsInfo: ClassInfo = {
      id: cls.id,
      title: cls.title,
      location: cls.location,
      certificationType: cls.certificationType,
      date: cls.date,
      startTime: cls.startTime,
    };

    // Warn when a class has a location but no business unit — EHS routing will
    // fall back to notifying ALL EHS users instead of the correct contact.
    if (cls.location && !cls.businessUnit) {
      logger.warn(
        { classId: cls.id, location: cls.location },
        "7-day reminder: class has a location but no businessUnit — EHS will fall back to all EHS users",
      );
    } else {
      logger.debug(
        { classId: cls.id, businessUnit: cls.businessUnit },
        "7-day reminder: businessUnit resolved for EHS routing",
      );
    }

    const req = requestByClassId.get(cls.id);
    const requestorInfo: RequestorInfo | null = req
      ? {
          name: req.organizationName, // use org name as recipient name when no personal name stored
          email: req.contactEmail,
          phone: req.contactPhone ?? null,
          organizationName: req.organizationName,
        }
      : null;

    try {
      await sendClassNotifications(clsInfo, requestorInfo, "reminder", logger, cls.businessUnit);
      await db
        .update(classesTable)
        .set({
          sevenDayReminderSentAt: new Date(),
          sevenDayReminderClaimedAt: null,
        })
        .where(eq(classesTable.id, cls.id));
    } catch (err) {
      await db
        .update(classesTable)
        .set({ sevenDayReminderClaimedAt: null })
        .where(eq(classesTable.id, cls.id));
      logger.error({ err, classId: cls.id }, "7-day reminder send failed");
    }
  }
}

/** Schedule the 7-day reminder check to run once every 24 hours. */
export function scheduleSevenDayReminders(): void {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // Run first check after 1 hour to avoid firing immediately on every restart
  setTimeout(() => {
    sendSevenDayReminders().catch(err =>
      logger.error({ err }, "7-day reminder initial check failed"),
    );
    setInterval(() => {
      sendSevenDayReminders().catch(err =>
        logger.error({ err }, "7-day reminder daily check failed"),
      );
    }, MS_PER_DAY);
  }, 60 * 60 * 1000);

  logger.info("7-day class reminder job scheduled (daily, first check in 1 hour)");
}
