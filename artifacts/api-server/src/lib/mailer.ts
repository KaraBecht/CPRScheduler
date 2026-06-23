import { logger } from "./logger";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Send an email via SendGrid when SENDGRID_API_KEY is set, otherwise log the
 * full message so you can see exactly what would have been sent.
 */
export async function sendMail(msg: MailMessage): Promise<void> {
  const apiKey = process.env["SENDGRID_API_KEY"];
  const fromEmail = process.env["FROM_EMAIL"] ?? "noreply@foxmedical.com";

  if (!apiKey) {
    logger.info(
      {
        mailPlaceholder: true,
        to: msg.to,
        subject: msg.subject,
        body: msg.text,
      },
      "[MAIL PLACEHOLDER] No SENDGRID_API_KEY set — email not sent",
    );
    return;
  }

  const payload = {
    personalizations: [{ to: [{ email: msg.to }] }],
    from: { email: fromEmail },
    subject: msg.subject,
    content: [
      { type: "text/plain", value: msg.text },
      { type: "text/html", value: msg.html },
    ],
  };

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.error({ status: res.status, body, to: msg.to }, "SendGrid delivery failed");
    throw new Error(`SendGrid error ${res.status}`);
  }

  logger.info({ to: msg.to, subject: msg.subject }, "Email sent via SendGrid");
}
