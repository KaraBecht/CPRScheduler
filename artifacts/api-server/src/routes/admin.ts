import { Router, type IRouter } from "express";
import { sendInstructorPreClassReminders } from "../lib/instructorPreClassReminder";

const router: IRouter = Router();

/**
 * Manual trigger for the 24-hour instructor pre-class reminder job.
 * Use during testing to fire the job immediately instead of waiting for the nightly run.
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

export default router;
