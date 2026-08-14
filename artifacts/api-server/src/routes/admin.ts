import { Router, type IRouter } from "express";
import { sendInstructorPreClassReminders, buildInstructorEmail } from "../lib/instructorPreClassReminder";
import { sendEmail } from "../lib/sendgrid";

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
 * Send a test instructor reminder email with sample data.
 * POST /api/admin/send-test-email
 * Body: { to: "email@example.com" }   (optional — defaults to svc_medical@fox.com)
 */
router.post("/admin/send-test-email", async (req, res) => {
  const to: string = req.body?.to ?? "svc_medical@fox.com";

  const base = process.env["REPLIT_DOMAINS"]
    ? `https://${process.env["REPLIT_DOMAINS"].split(",")[0]!.trim()}`
    : "http://localhost";

  // Build a realistic sample class to test the full email layout
  const sampleCls = {
    id: 0,
    title: "KPSS — Test Location",
    certificationType: "cpr_aed_first_aid",
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0]!,
    startTime: "09:00",
    endTime: "12:00",
    location: "123 Test St, Los Angeles, CA 90001",
    capacity: 20,
  } as Parameters<typeof buildInstructorEmail>[1];

  const signinUrl = `${base}/roster-signin/0`;
  const rosterUrl = `${base}/classes/0/roster`;

  const content = buildInstructorEmail("Instructor Name", sampleCls, signinUrl, rosterUrl);

  req.log.info({ to }, "Sending test instructor reminder email");
  try {
    await sendEmail({ to, ...content }, req.log);
    res.json({ ok: true, to, subject: content.subject });
  } catch (err) {
    req.log.error({ err }, "Test email failed");
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
