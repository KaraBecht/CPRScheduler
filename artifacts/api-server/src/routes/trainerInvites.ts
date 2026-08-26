import { Router, type IRouter } from "express";
import { recordTrainerResponse } from "../lib/trainerNotifications";

const router: IRouter = Router();

function appBaseUrl(): string {
  const domains = process.env["REPLIT_DOMAINS"];
  if (domains) {
    const first = domains.split(",")[0]?.trim();
    if (first) return `https://${first}`;
  }
  return "http://localhost";
}

function responsePage(title: string, message: string, color: string, classId?: number): string {
  const icon = color === "#16a34a" ? "✅" : color === "#dc2626" ? "❌" : "ℹ️";
  const appLink = classId != null
    ? `<a href="${appBaseUrl()}/classes/${classId}" style="display:inline-block;margin-top:24px;padding:11px 28px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;color:#fff;background:#111827">Open Class in App →</a>`
    : `<a href="${appBaseUrl()}" style="display:inline-block;margin-top:24px;padding:11px 28px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;color:#fff;background:#111827">Open PulsePoint CPR Hub →</a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — PulsePoint CPR Hub</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:sans-serif;background:#f3f4f6;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
    .card{background:#fff;border-radius:12px;padding:40px 48px;max-width:480px;width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}
    .icon{font-size:56px;margin-bottom:20px}
    h1{font-size:22px;font-weight:700;color:#111827;margin-bottom:12px}
    p{font-size:15px;color:#6b7280;line-height:1.6}
    .badge{display:inline-block;margin-top:20px;padding:8px 20px;border-radius:999px;font-weight:600;font-size:14px;color:#fff;background:${color}}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="badge">${title}</div>
    <br>
    ${appLink}
  </div>
</body>
</html>`;
}

router.get("/trainer-invite/:token/accept", async (req, res) => {
  const { token } = req.params;
  const result = await recordTrainerResponse(token, "accepted", req.log);

  if (!result.found) {
    res.status(404).send(
      responsePage("Link Not Found", "This invitation link is invalid or has expired.", "#6b7280"),
    );
    return;
  }

  if (result.alreadyResponded) {
    res.send(
      responsePage("Already Responded", "You have already responded to this class invitation. Your response has been recorded.", "#6b7280", result.classId),
    );
    return;
  }

  res.send(
    responsePage("Class Accepted", "Thank you! Your acceptance has been recorded and our scheduling team has been notified. We will follow up with more details soon.", "#16a34a", result.classId),
  );
});

router.get("/trainer-invite/:token/decline", async (req, res) => {
  const { token } = req.params;
  const result = await recordTrainerResponse(token, "declined", req.log);

  if (!result.found) {
    res.status(404).send(
      responsePage("Link Not Found", "This invitation link is invalid or has expired.", "#6b7280"),
    );
    return;
  }

  if (result.alreadyResponded) {
    res.send(
      responsePage("Already Responded", "You have already responded to this class invitation. Your response has been recorded.", "#6b7280", result.classId),
    );
    return;
  }

  res.send(
    responsePage("Class Declined", "Thank you for letting us know. Your response has been recorded and we will find another instructor for this class.", "#dc2626", result.classId),
  );
});

export default router;
