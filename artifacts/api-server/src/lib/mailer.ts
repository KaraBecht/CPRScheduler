import { logger } from "./logger";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { EMAILS_ENABLED } from "./emailConfig";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Send an email via Microsoft Outlook (Replit connector).
 * Sends from the connected Outlook account; tokens are refreshed automatically.
 */
export async function sendMail(msg: MailMessage): Promise<void> {
  if (!EMAILS_ENABLED) {
    logger.info({ to: msg.to, subject: msg.subject }, "[EMAIL DISABLED] Would have sent email");
    return;
  }

  // ReplitConnectors must not be cached — tokens expire
  const connectors = new ReplitConnectors();

  const res = await connectors.proxy("outlook", "/v1.0/me/sendMail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject: msg.subject,
        body: { contentType: "HTML", content: msg.html },
        toRecipients: [{ emailAddress: { address: msg.to } }],
      },
      saveToSentItems: true,
    }),
  });

  if (res.status === 202) {
    logger.info({ to: msg.to, subject: msg.subject }, "Email sent");
  } else {
    const body = await res.text().catch(() => "");
    logger.error({ status: res.status, body, to: msg.to }, "Outlook sendMail failed");
    throw new Error(`Outlook sendMail error ${res.status}`);
  }
}
