/**
 * Shared calendar-link builder used by all class notification emails.
 * Produces a Google Calendar URL + a download link to the .ics endpoint.
 */

interface CalendarData {
  classId: number;
  title: string;
  certificationType: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:MM
  endTime?: string | null;
  location?: string | null;
}

function toIcsDt(date: string, time: string): string {
  // YYYYMMDDTHHMMSS  (floating / no timezone suffix)
  return date.replace(/-/g, "") + "T" + time.replace(":", "") + "00";
}

function addHours(hhmm: string, h: number): string {
  const [hh, mm] = hhmm.split(":").map(Number);
  const total = hh! * 60 + mm! + h * 60;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const CERT_LABELS: Record<string, string> = {
  cpr_aed: "CPR/AED",
  cpr_aed_first_aid: "CPR/AED + First Aid",
  first_aid: "First Aid",
  bls: "BLS (Basic Life Support)",
  stop_the_bleed: "Stop the Bleed",
  cpr_aed_first_aid_stop_the_bleed: "CPR + Stop the Bleed",
};

export interface CalendarLinks {
  googleUrl: string;
  icsUrl: string;
}

export function buildCalendarLinks(cls: CalendarData, appBaseUrl: string): CalendarLinks {
  const cert = CERT_LABELS[cls.certificationType] ?? cls.certificationType;
  const endTime = cls.endTime || addHours(cls.startTime, 4);
  const dtStart = toIcsDt(cls.date, cls.startTime);
  const dtEnd = toIcsDt(cls.date, endTime);
  const summary = `CPR Training — ${cls.title} (${cert})`;

  const gUrl = new URL("https://calendar.google.com/calendar/render");
  gUrl.searchParams.set("action", "TEMPLATE");
  gUrl.searchParams.set("text", summary);
  gUrl.searchParams.set("dates", `${dtStart}/${dtEnd}`);
  gUrl.searchParams.set("details", `${cert} training class`);
  if (cls.location) gUrl.searchParams.set("location", cls.location);

  return {
    googleUrl: gUrl.toString(),
    icsUrl: `${appBaseUrl}/api/public/classes/${cls.classId}/calendar.ics`,
  };
}

/** Returns the "Add to Calendar" HTML block to embed inside an email body. */
export function calendarHtml(links: CalendarLinks): string {
  return `
  <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e5e7eb">
    <p style="margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;font-weight:600">Add to Calendar</p>
    <table style="border-collapse:collapse"><tr>
      <td style="padding-right:8px">
        <a href="${links.googleUrl}" target="_blank" style="display:inline-block;padding:10px 18px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">&#128197; Google Calendar</a>
      </td>
      <td>
        <a href="${links.icsUrl}" style="display:inline-block;padding:10px 18px;background:#f3f4f6;color:#111827;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;border:1px solid #e5e7eb">&#8659; Download .ics</a>
      </td>
    </tr></table>
    <p style="margin:8px 0 0;font-size:11px;color:#9ca3af">.ics works with Apple Calendar, Outlook, and most other calendar apps.</p>
  </div>`.trim();
}

/** Plain-text equivalent to append to email body. */
export function calendarText(links: CalendarLinks): string {
  return [
    `ADD TO CALENDAR`,
    `  Google Calendar: ${links.googleUrl}`,
    `  Download .ics:  ${links.icsUrl}`,
  ].join("\n");
}
