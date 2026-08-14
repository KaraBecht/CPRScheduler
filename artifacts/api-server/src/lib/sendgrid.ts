import type { Logger } from "pino";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { EMAILS_ENABLED } from "./emailConfig";

interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function sendEmailOnce(payload: EmailPayload, log: Logger): Promise<boolean> {
  // ReplitConnectors must not be cached — tokens expire
  const connectors = new ReplitConnectors();
  const res = await connectors.proxy("outlook", "/v1.0/me/sendMail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject: payload.subject,
        body: { contentType: "HTML", content: payload.html },
        toRecipients: [{ emailAddress: { address: payload.to } }],
      },
      saveToSentItems: true,
    }),
  });

  if (res.status === 202) {
    log.info({ to: payload.to }, "Email sent");
    return true;
  }
  if (res.status === 429) {
    return false; // caller will retry
  }
  const detail = await res.text().catch(() => "");
  log.error({ status: res.status, detail }, "Outlook sendMail error");
  return true; // non-retryable, stop trying
}

export async function sendEmail(payload: EmailPayload, log: Logger): Promise<void> {
  if (!payload.to) {
    log.warn("No recipient address provided — skipping email notification");
    return;
  }

  if (!EMAILS_ENABLED) {
    log.info({ to: payload.to, subject: payload.subject }, "[EMAIL DISABLED] Would have sent email");
    return;
  }

  try {
    // Retry once after 2 s on 429 (Outlook MailboxConcurrency throttle)
    const ok = await sendEmailOnce(payload, log);
    if (!ok) {
      log.warn({ to: payload.to }, "Outlook 429 — retrying after 2 s");
      await sleep(2000);
      await sendEmailOnce(payload, log);
    }
  } catch (err) {
    log.error({ err }, "Failed to send email via Outlook");
  }
}

export function buildRequestorConfirmationEmail(data: {
  requestorName: string;
  organizationName: string;
  certificationType: string;
  sessions: { date: string; startTime: string }[];
  attendeeCount: number;
}): Pick<EmailPayload, "subject" | "text" | "html"> {
  const certLabels: Record<string, string> = {
    cpr_aed: "CPR/AED",
    cpr_aed_first_aid: "CPR/AED + First Aid",
    first_aid: "First Aid",
    bls: "BLS (Basic Life Support)",
  };
  const cert = certLabels[data.certificationType] ?? data.certificationType;
  const sessionLines = data.sessions
    .map(s => `  • ${s.date} @ ${s.startTime}`)
    .join("\n");

  const subject = `We've received your CPR training request — ${data.organizationName}`;

  const text = [
    `Hi ${data.requestorName},`,
    ``,
    `Thank you for submitting your CPR training request. We have received it and our scheduling team will review it shortly.`,
    ``,
    `REQUEST DETAILS`,
    `  Organization:  ${data.organizationName}`,
    `  Certification: ${cert}`,
    `  Attendees:     ${data.attendeeCount}`,
    `  Requested dates:`,
    sessionLines,
    ``,
    `You will hear from us soon with next steps.`,
    ``,
    `— PulsePoint CPR Hub`,
    `  Questions? Contact svc_medical@fox.com`,
  ].join("\n");

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827">
  <div style="background:#1d4ed8;padding:20px 24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;color:#fff;font-size:18px">Training Request Received</h1>
    <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px">PulsePoint CPR Hub</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <p style="margin:0 0 16px">Hi <strong>${data.requestorName}</strong>,</p>
    <p style="margin:0 0 20px">Thank you for submitting your CPR training request. We have received it and our scheduling team will review it shortly.</p>

    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Request Details</h2>
    <table style="border-collapse:collapse;margin-bottom:20px">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Organization</td><td style="font-size:14px"><strong>${data.organizationName}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Certification</td><td style="font-size:14px"><strong>${cert}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Attendees</td><td style="font-size:14px"><strong>${data.attendeeCount}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px;vertical-align:top">Requested dates</td><td style="font-size:14px"><strong>${data.sessions.map(s => `${s.date} @ ${s.startTime}`).join("<br>")}</strong></td></tr>
    </table>

    <p style="margin:0 0 8px;color:#374151">You will hear from us soon with next steps.</p>
    <p style="margin:0;font-size:13px;color:#6b7280">Questions? Contact <a href="mailto:svc_medical@fox.com" style="color:#1d4ed8">svc_medical@fox.com</a></p>
  </div>
</div>`.trim();

  return { subject, text, html };
}

function appBaseUrl(): string {
  const domains = process.env["REPLIT_DOMAINS"];
  if (domains) {
    const first = domains.split(",")[0]?.trim();
    if (first) return `https://${first}`;
  }
  return "http://localhost";
}

export function buildRequestEmail(data: {
  recipientName: string;
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
  const schedulerUrl = `${appBaseUrl()}/requests`;
  const certLabel: Record<string, string> = {
    cpr_aed_first_aid: "CPR / AED / First Aid",
    stop_the_bleed: "Stop the Bleed",
  };
  const cert = certLabel[data.certificationType] ?? data.certificationType;
  const sessionLines = data.sessions
    .map((s) => `  • ${s.date} @ ${s.startTime}`)
    .join("\n");

  const text = [
    `Hi ${data.recipientName},`,
    "",
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
    "",
    `Open the scheduler to review and approve: ${schedulerUrl}`,
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
    <p style="margin:0 0 20px;font-style:italic;border-left:3px solid #e5e7eb;padding-left:12px;color:#374151">${data.notes}</p>`
        : ""
    }

    <a href="${schedulerUrl}" style="display:inline-block;padding:12px 24px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">Review &amp; Approve Request →</a>
  </div>
</div>`;

  return {
    subject: `New training request — ${data.locationName} (${cert})`,
    text,
    html,
  };
}

export function buildSigninNotificationEmail(data: {
  name: string;
  email?: string | null;
  phone?: string | null;
  classTitle: string;
  classDate: string;
  startTime?: string | null;
  location?: string | null;
  certificationType: string;
  capacity: number;
  totalSignedIn: number;
}): Pick<EmailPayload, "subject" | "text" | "html"> {
  const certLabel: Record<string, string> = {
    cpr_aed_first_aid: "CPR / AED / First Aid",
    stop_the_bleed: "Stop the Bleed",
    cpr_aed_first_aid_stop_the_bleed: "CPR + Stop the Bleed",
  };
  const cert = certLabel[data.certificationType] ?? data.certificationType;
  const spotsLeft = data.capacity - data.totalSignedIn;

  const text = [
    `New student sign-in — ${data.classTitle}`,
    ``,
    `STUDENT`,
    `  Name:  ${data.name}`,
    data.email  ? `  Email: ${data.email}` : null,
    data.phone  ? `  Phone: ${data.phone}` : null,
    ``,
    `CLASS`,
    `  Title:       ${data.classTitle}`,
    `  Date:        ${data.classDate}${data.startTime ? " @ " + data.startTime : ""}`,
    data.location ? `  Location:    ${data.location}` : null,
    `  Cert type:   ${cert}`,
    `  Signed in:   ${data.totalSignedIn} / ${data.capacity} (${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} remaining)`,
    ``,
    `— FOX Medical CPR Training Hub`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;white-space:nowrap;font-size:14px">${label}</td><td style="padding:4px 0;font-size:14px"><strong>${value}</strong></td></tr>`;

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827">
  <div style="background:#007BA7;padding:20px 24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;color:#fff;font-size:18px">New Student Sign-In</h1>
    <p style="margin:4px 0 0;color:#cce9f3;font-size:13px">${data.classTitle} &mdash; ${data.classDate}</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">

    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Student</h2>
    <table style="border-collapse:collapse;margin-bottom:20px">
      ${row("Name", data.name)}
      ${data.email ? row("Email", `<a href="mailto:${data.email}" style="color:#007BA7">${data.email}</a>`) : ""}
      ${data.phone ? row("Phone", data.phone) : ""}
    </table>

    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Class</h2>
    <table style="border-collapse:collapse;margin-bottom:20px">
      ${row("Title", data.classTitle)}
      ${row("Date", data.classDate + (data.startTime ? " @ " + data.startTime : ""))}
      ${data.location && data.location !== "TBD" ? row("Location", data.location) : ""}
      ${row("Certification", cert)}
    </table>

    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:12px 16px;margin-bottom:4px">
      <span style="font-size:14px;color:#0369a1">
        <strong>${data.totalSignedIn} / ${data.capacity}</strong> signed in &nbsp;&bull;&nbsp;
        <strong>${spotsLeft}</strong> spot${spotsLeft === 1 ? "" : "s"} remaining
      </span>
    </div>

    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af">— FOX Medical CPR Training Hub</p>
  </div>
</div>`;

  return {
    subject: `New sign-in: ${data.name} — ${data.classTitle} (${data.classDate})`,
    text,
    html,
  };
}

export function buildScheduledEmail(data: {
  requestorName: string;
  organizationName: string;
  certificationType: string;
  sessions: { date: string; startTime: string }[];
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
    `Hi ${data.requestorName},`,
    "",
    "Great news — your CPR training request has been approved and your class(es) have been scheduled!",
    "",
    "SCHEDULED CLASS DETAILS",
    `  Organization:  ${data.organizationName}`,
    `  Certification: ${cert}`,
    "",
    "SCHEDULED DATE(S) & TIME(S)",
    sessionLines,
    "",
    "Our team will follow up shortly with the instructor and location details.",
    "",
    "Thank you for choosing PulsePoint CPR Hub.",
  ].join("\n");

  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;white-space:nowrap">${label}</td><td style="padding:4px 0"><strong>${value}</strong></td></tr>`;

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827">
  <div style="background:#1d4ed8;padding:20px 24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;color:#fff;font-size:18px">Your CPR Class Is Scheduled!</h1>
    <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px">PulsePoint CPR Hub</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <p style="margin:0 0 20px">Hi <strong>${data.requestorName}</strong>,</p>
    <p style="margin:0 0 20px">Great news — your CPR training request has been approved and your class(es) have been scheduled!</p>

    <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Scheduled Class Details</h2>
    <table style="border-collapse:collapse;margin-bottom:20px">
      ${row("Organization", data.organizationName)}
      ${row("Certification", cert)}
    </table>

    <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Scheduled Date(s) &amp; Time(s)</h2>
    <ul style="margin:0 0 20px;padding-left:18px">
      ${data.sessions.map((s) => `<li style="margin-bottom:4px">${s.date} &nbsp;@&nbsp; ${s.startTime}</li>`).join("")}
    </ul>

    <p style="margin:0 0 8px;color:#374151">Our team will follow up shortly with the instructor and location details.</p>
    <p style="margin:0;color:#374151">Thank you for choosing <strong>PulsePoint CPR Hub</strong>.</p>
  </div>
</div>`;

  return {
    subject: `Your CPR class is scheduled — ${data.organizationName} (${cert})`,
    text,
    html,
  };
}

export function buildInstructorRosterEmail(data: {
  instructorName: string;
  classTitle: string;
  classDate: string;
  startTime?: string | null;
  location?: string | null;
  certificationType: string;
  attendees: { position: number; name: string; email?: string; phone?: string; result?: string | null }[];
}): Pick<EmailPayload, "subject" | "text" | "html"> {
  const certLabels: Record<string, string> = {
    cpr_aed: "CPR/AED",
    cpr_aed_first_aid: "CPR/AED + First Aid",
    first_aid: "First Aid",
    bls: "BLS (Basic Life Support)",
    stop_the_bleed: "Stop the Bleed",
    cpr_aed_first_aid_stop_the_bleed: "CPR + Stop the Bleed",
  };
  const cert = certLabels[data.certificationType] ?? data.certificationType;
  const filled = data.attendees.filter(a => a.name?.trim());
  const passed  = filled.filter(a => a.result === "pass").length;
  const failed  = filled.filter(a => a.result === "fail").length;
  const noShow  = filled.filter(a => a.result === "no_show").length;
  const pending = filled.filter(a => !a.result).length;

  const resultLabel = (r?: string | null) => {
    if (r === "pass") return "✓ Pass";
    if (r === "fail") return "✗ Fail";
    if (r === "no_show") return "– No Show";
    return "";
  };

  const subject = `Class complete — ${data.classTitle} roster (${data.classDate})`;

  const text = [
    `Hi ${data.instructorName},`,
    ``,
    `Your class has been marked complete. Here is the full roster:`,
    ``,
    `CLASS`,
    `  Title:       ${data.classTitle}`,
    `  Date:        ${data.classDate}${data.startTime ? " @ " + data.startTime : ""}`,
    data.location ? `  Location:    ${data.location}` : null,
    `  Cert type:   ${cert}`,
    ``,
    `ROSTER (${filled.length} attendee${filled.length === 1 ? "" : "s"})`,
    ...filled.map((a, i) => [
      `  ${i + 1}. ${a.name}${a.result ? " — " + resultLabel(a.result) : ""}`,
      a.email ? `     Email: ${a.email}` : null,
      a.phone ? `     Phone: ${a.phone}` : null,
    ].filter(Boolean).join("\n")),
    ``,
    `SUMMARY`,
    `  Total:   ${filled.length}`,
    passed  ? `  Passed:  ${passed}` : null,
    failed  ? `  Failed:  ${failed}` : null,
    noShow  ? `  No-show: ${noShow}` : null,
    pending ? `  Pending: ${pending}` : null,
    ``,
    `— PulsePoint CPR Hub`,
  ].filter(l => l !== null).join("\n");

  const resultBadge = (r?: string | null) => {
    if (r === "pass")    return `<span style="color:#16a34a;font-weight:600">✓ Pass</span>`;
    if (r === "fail")    return `<span style="color:#dc2626;font-weight:600">✗ Fail</span>`;
    if (r === "no_show") return `<span style="color:#9ca3af;font-weight:600">– No Show</span>`;
    return `<span style="color:#9ca3af">—</span>`;
  };

  const html = `
<div style="font-family:sans-serif;max-width:640px;margin:0 auto;color:#111827">
  <div style="background:#1d4ed8;padding:20px 24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;color:#fff;font-size:18px">Class Complete — Full Roster</h1>
    <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px">${data.classTitle} &mdash; ${data.classDate}</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <p style="margin:0 0 20px">Hi <strong>${data.instructorName}</strong>, your class has been marked complete. Here is the full roster:</p>

    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Class Details</h2>
    <table style="border-collapse:collapse;margin-bottom:20px">
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Title</td><td style="font-size:14px"><strong>${data.classTitle}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Date</td><td style="font-size:14px"><strong>${data.classDate}${data.startTime ? " @ " + data.startTime : ""}</strong></td></tr>
      ${data.location ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Location</td><td style="font-size:14px"><strong>${data.location}</strong></td></tr>` : ""}
      <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-size:14px">Certification</td><td style="font-size:14px"><strong>${cert}</strong></td></tr>
    </table>

    <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">
      Roster <span style="font-weight:400;text-transform:none">(${filled.length} attendee${filled.length === 1 ? "" : "s"})</span>
    </h2>
    ${filled.length === 0
      ? `<p style="color:#6b7280;font-size:14px;font-style:italic">No attendees recorded.</p>`
      : `<table style="border-collapse:collapse;width:100%;margin-bottom:20px">
      <thead>
        <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb">
          <th style="text-align:left;padding:8px 12px 8px 0;font-size:13px;color:#6b7280;font-weight:600">#</th>
          <th style="text-align:left;padding:8px 12px;font-size:13px;color:#6b7280;font-weight:600">Name</th>
          <th style="text-align:left;padding:8px 12px;font-size:13px;color:#6b7280;font-weight:600">Contact</th>
          <th style="text-align:left;padding:8px 0 8px 12px;font-size:13px;color:#6b7280;font-weight:600">Result</th>
        </tr>
      </thead>
      <tbody>
        ${filled.map((a, i) => `
        <tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:10px 12px 10px 0;font-size:14px;color:#6b7280">${i + 1}</td>
          <td style="padding:10px 12px;font-size:14px;font-weight:500">${a.name}</td>
          <td style="padding:10px 12px;font-size:13px;color:#6b7280">${[a.email, a.phone].filter(Boolean).join("<br>") || "—"}</td>
          <td style="padding:10px 0 10px 12px;font-size:14px">${resultBadge(a.result)}</td>
        </tr>`).join("")}
      </tbody>
    </table>`}

    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:12px 16px;font-size:14px;color:#0369a1">
      <strong>Total: ${filled.length}</strong>
      ${passed  ? `&nbsp;&bull;&nbsp;<span style="color:#16a34a">${passed} passed</span>` : ""}
      ${failed  ? `&nbsp;&bull;&nbsp;<span style="color:#dc2626">${failed} failed</span>` : ""}
      ${noShow  ? `&nbsp;&bull;&nbsp;<span style="color:#9ca3af">${noShow} no-show</span>` : ""}
      ${pending ? `&nbsp;&bull;&nbsp;${pending} pending` : ""}
    </div>

    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af">— PulsePoint CPR Hub</p>
  </div>
</div>`.trim();

  return { subject, text, html };
}

export function buildAdminScheduledEmail(data: {
  requestorName: string;
  requestorEmail: string;
  organizationName: string;
  certificationType: string;
  sessions: { date: string; startTime: string }[];
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
    `A training request from ${data.requestorName} has been approved and classes have been scheduled.`,
    "",
    "REQUESTOR",
    `  Name:         ${data.requestorName}`,
    `  Email:        ${data.requestorEmail}`,
    `  Organization: ${data.organizationName}`,
    "",
    "CLASS DETAILS",
    `  Certification: ${cert}`,
    "",
    "SCHEDULED DATE(S) & TIME(S)",
    sessionLines,
  ].join("\n");

  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;white-space:nowrap">${label}</td><td style="padding:4px 0"><strong>${value}</strong></td></tr>`;

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111827">
  <div style="background:#1d4ed8;padding:20px 24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;color:#fff;font-size:18px">Training Request Approved &amp; Scheduled</h1>
    <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px">PulsePoint CPR Hub — Admin Notification</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <p style="margin:0 0 20px">A training request has been approved and the following classes have been scheduled.</p>

    <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Requestor</h2>
    <table style="border-collapse:collapse;margin-bottom:20px">
      ${row("Name", data.requestorName)}
      ${row("Email", `<a href="mailto:${data.requestorEmail}">${data.requestorEmail}</a>`)}
      ${row("Organization", data.organizationName)}
    </table>

    <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Class Details</h2>
    <table style="border-collapse:collapse;margin-bottom:20px">
      ${row("Certification", cert)}
    </table>

    <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 8px">Scheduled Date(s) &amp; Time(s)</h2>
    <ul style="margin:0;padding-left:18px">
      ${data.sessions.map((s) => `<li style="margin-bottom:4px">${s.date} &nbsp;@&nbsp; ${s.startTime}</li>`).join("")}
    </ul>
  </div>
</div>`;

  return {
    subject: `[Admin] Class scheduled — ${data.organizationName} (${cert})`,
    text,
    html,
  };
}
