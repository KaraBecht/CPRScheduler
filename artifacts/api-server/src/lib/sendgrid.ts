import type { Logger } from "pino";

interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail(payload: EmailPayload, log: Logger): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.NOTIFY_FROM_EMAIL ?? "noreply@pulsepoint.app";

  if (!apiKey || !process.env.NOTIFY_EMAIL) {
    log.warn("SENDGRID_API_KEY or NOTIFY_EMAIL not set — skipping email notification");
    return;
  }

  const body = {
    personalizations: [{ to: [{ email: process.env.NOTIFY_EMAIL }] }],
    from: { email: from, name: "PulsePoint CPR Hub" },
    subject: payload.subject,
    content: [
      { type: "text/plain", value: payload.text },
      { type: "text/html", value: payload.html },
    ],
  };

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      log.error({ status: res.status, detail }, "SendGrid error");
    } else {
      log.info("Training request notification email sent");
    }
  } catch (err) {
    log.error({ err }, "Failed to send email via SendGrid");
  }
}

export function buildRequestEmail(data: {
  requestorName: string;
  requestorEmail: string;
  requestorPhone?: string | null;
  locationName: string;
  address?: string | null;
  certificationType: string;
  numberOfClasses: number;
  attendeeCount: number;
  sessions: { date: string; startTime: string }[];
  notes?: string | null;
}): Pick<EmailPayload, "subject" | "text" | "html"> {
  const certLabel: Record<string, string> = {
    cpr_aed_first_aid: "CPR / AED / First Aid",
    stop_the_bleed: "Stop the Bleed",
  };
  const cert = certLabel[data.certificationType] ?? data.certificationType;
  const sessionLines = data.sessions
    .map((s) => `  • ${s.date} @ ${s.startTime}`)
    .join("\n");

  const text = [
    "A new CPR training request has been submitted via PulsePoint.",
    "",
    "CONTACT",
    `  Name:   ${data.requestorName}`,
    `  Email:  ${data.requestorEmail}`,
    data.requestorPhone ? `  Phone:  ${data.requestorPhone}` : null,
    "",
    "LOCATION",
    `  Name:    ${data.locationName}`,
    data.address ? `  Address: ${data.address}` : null,
    "",
    "CLASS DETAILS",
    `  Certification:   ${cert}`,
    `  Classes:         ${data.numberOfClasses}`,
    `  Attendees/class: ${data.attendeeCount}`,
    "",
    "SUGGESTED DATES & TIMES",
    sessionLines,
    data.notes ? `\nNOTES\n  ${data.notes}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;white-space:nowrap">${label}</td><td style="padding:4px 0"><strong>${value}</strong></td></tr>`;

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827">
  <div style="background:#1d4ed8;padding:20px 24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;color:#fff;font-size:18px">New CPR Training Request</h1>
    <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px">Submitted via PulsePoint</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Contact</h2>
    <table style="border-collapse:collapse;margin-bottom:20px">
      ${row("Name", data.requestorName)}
      ${row("Email", `<a href="mailto:${data.requestorEmail}">${data.requestorEmail}</a>`)}
      ${data.requestorPhone ? row("Phone", data.requestorPhone) : ""}
    </table>

    <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Location</h2>
    <table style="border-collapse:collapse;margin-bottom:20px">
      ${row("Name", data.locationName)}
      ${data.address ? row("Address", data.address) : ""}
    </table>

    <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Class Details</h2>
    <table style="border-collapse:collapse;margin-bottom:20px">
      ${row("Certification", cert)}
      ${row("Classes", String(data.numberOfClasses))}
      ${row("Attendees / class", String(data.attendeeCount))}
    </table>

    <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Suggested Dates & Times</h2>
    <ul style="margin:0 0 20px;padding-left:18px">
      ${data.sessions.map((s) => `<li style="margin-bottom:4px">${s.date} &nbsp;@&nbsp; ${s.startTime}</li>`).join("")}
    </ul>

    ${
      data.notes
        ? `<h2 style="font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Notes</h2>
    <p style="margin:0;font-style:italic;border-left:3px solid #e5e7eb;padding-left:12px;color:#374151">${data.notes}</p>`
        : ""
    }
  </div>
</div>`;

  return {
    subject: `New training request — ${data.locationName} (${cert})`,
    text,
    html,
  };
}
