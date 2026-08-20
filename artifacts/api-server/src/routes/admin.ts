import { Router, type IRouter } from "express";
import { gte } from "drizzle-orm";
import { sendInstructorPreClassReminders, buildInstructorEmail, buildRosterAttachmentForClass } from "../lib/instructorPreClassReminder";
import { buildStaffEmail } from "../lib/classNotifications";
import { sendEmail } from "../lib/sendgrid";
import { db, classesTable } from "@workspace/db";

const router: IRouter = Router();

/**
 * Manual trigger for the 24-hour instructor pre-class reminder job.
 * POST /api/admin/trigger-pre-class-reminders
 */
router.post("/admin/trigger-pre-class-reminders", async (req, res) => {
  req.log.info("Manual trigger: instructor pre-class reminders");
  try {
    await sendInstructorPreClassReminders();
    res.json({ ok: true, message: "Pre-class reminder job completed" });
  } catch (err) {
    req.log.error({ err }, "Manual trigger: pre-class reminder job failed");
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * Send a test instructor reminder email using a real upcoming class.
 * POST /api/admin/send-test-email
 * Body: { to: "email@example.com" }   (optional — defaults to svc_medical@fox.com)
 */
router.post("/admin/send-test-email", async (req, res) => {
  const to: string = req.body?.to ?? "svc_medical@fox.com";

  const base = process.env["REPLIT_DOMAINS"]
    ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]!.trim()}`
    : "http://localhost";

  // Use a real upcoming class so the calendar ICS link actually works
  const today = new Date().toISOString().split("T")[0]!;
  const rows = await db
    .select()
    .from(classesTable)
    .where(gte(classesTable.date, today))
    .orderBy(classesTable.date)
    .limit(1);

  let cls = rows[0];

  // Fall back to a synthetic class if there are no upcoming classes
  if (!cls) {
    cls = {
      id: 0,
      title: "KPSS — Test Location",
      certificationType: "cpr_aed_first_aid",
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]!,
      startTime: "09:00",
      endTime: "12:00",
      location: "123 Test St, Los Angeles, CA 90001",
      capacity: 20,
    } as typeof classesTable.$inferSelect;
  }

  const signinUrl  = `${base}/roster-signin/${cls.id}`;
  const rosterUrl  = `${base}/classes/${cls.id}/signin-sheet`;

  const content = buildInstructorEmail("Instructor Name", cls, signinUrl, rosterUrl);
  const attachment = buildRosterAttachmentForClass(cls);

  req.log.info({ to, classId: cls.id }, "Sending test instructor reminder email");
  try {
    await sendEmail({ to, ...content, attachments: attachment ? [attachment] : [] }, req.log);
    res.json({ ok: true, to, subject: content.subject, classId: cls.id });
  } catch (err) {
    req.log.error({ err }, "Test email failed");
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * Send a test admin confirmation email using a real upcoming class.
 * POST /api/admin/send-test-admin-email
 * Body: { to: "email@example.com" }   (optional — defaults to svc_medical@fox.com)
 */
router.post("/admin/send-test-admin-email", async (req, res) => {
  const to: string = req.body?.to ?? "svc_medical@fox.com";

  const today = new Date().toISOString().split("T")[0]!;
  const rows = await db
    .select()
    .from(classesTable)
    .where(gte(classesTable.date, today))
    .orderBy(classesTable.date)
    .limit(1);

  let cls = rows[0];

  if (!cls) {
    cls = {
      id: 0,
      title: "KPSS — Test Location",
      certificationType: "cpr_aed_first_aid",
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]!,
      startTime: "09:00",
      endTime: "12:00",
      location: "123 Test St, Los Angeles, CA 90001",
      capacity: 20,
    } as typeof classesTable.$inferSelect;
  }

  const clsInfo = {
    id: cls.id,
    title: cls.title,
    location: cls.location ?? "",
    certificationType: cls.certificationType,
    date: cls.date,
    startTime: cls.startTime,
    endTime: cls.endTime ?? null,
  };

  const content = buildStaffEmail(clsInfo, null, "confirmation", null, "Admin Name", "admin");

  req.log.info({ to, classId: cls.id }, "Sending test admin confirmation email");
  try {
    await sendEmail({ to, ...content }, req.log);
    res.json({ ok: true, to, subject: content.subject, classId: cls.id });
  } catch (err) {
    req.log.error({ err }, "Test admin email failed");
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
