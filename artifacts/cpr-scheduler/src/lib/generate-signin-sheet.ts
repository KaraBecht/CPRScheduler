type ClassInfo = {
  id: number;
  title: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  capacity: number;
  certificationType: string;
  instructorName?: string | null;
  instructors?: { id: number; name: string }[];
};

type RosterEntry = {
  position: number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

function certLabel(ct: string): string {
  if (ct === "cpr_aed_first_aid") return "CPR / AED / First Aid";
  if (ct === "stop_the_bleed") return "Stop the Bleed";
  if (ct === "cpr_aed_first_aid_stop_the_bleed") return "CPR / AED / First Aid + Stop the Bleed";
  return ct;
}

function fmtDate(d: string): string {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  } catch { return d; }
}

function fmtTime(t: string | null | undefined): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function generateSigninSheetHtml(cls: ClassInfo, roster: RosterEntry[]): string {
  const instructorLine = cls.instructors && cls.instructors.length > 0
    ? cls.instructors.map((i) => i.name).join(", ")
    : (cls.instructorName ?? "");

  const timeStr = cls.startTime
    ? fmtTime(cls.startTime) + (cls.endTime ? ` – ${fmtTime(cls.endTime)}` : "")
    : "";

  const byPos = new Map(roster.map((r) => [r.position, r]));
  const rows = Array.from({ length: cls.capacity }, (_, i) => {
    const r = byPos.get(i);
    return {
      num: String(i + 1).padStart(2, "0"),
      name: r?.name?.trim() ?? "",
      email: r?.email?.trim() ?? "",
      phone: r?.phone?.trim() ?? "",
    };
  });

  const tableRows = rows.map((r) => `
    <tr>
      <td class="num">${r.num}</td>
      <td><div class="cell-inner" contenteditable="true">${r.name}</div></td>
      <td><div class="cell-inner" contenteditable="true">${r.email}</div></td>
      <td><div class="cell-inner" contenteditable="true">${r.phone}</div></td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Sign-In Sheet — ${cls.title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, sans-serif;
    font-size: 13px;
    color: #1a1a1a;
    background: #fff;
    padding: 24px 28px;
  }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    border-bottom: 3px solid #007BA7;
    padding-bottom: 14px;
    margin-bottom: 16px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .brand-icon {
    width: 40px; height: 40px;
    background: #008080;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
  }
  .brand-icon svg { width: 22px; height: 22px; fill: none; stroke: white; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .brand-text { line-height: 1.2; }
  .brand-name { font-size: 16px; font-weight: 700; }
  .brand-sub { font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; color: #008080; font-weight: 600; }
  .class-num { font-family: monospace; font-size: 24px; font-weight: 700; color: #007BA7; }

  /* ── Class info ── */
  .class-info { margin-bottom: 14px; }
  .class-title { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
  .class-meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; color: #555; }
  .class-meta span { display: flex; align-items: center; gap: 5px; }
  .class-meta svg { width: 13px; height: 13px; flex-shrink: 0; fill: none; stroke: #007BA7; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .cert-badge {
    display: inline-block;
    background: #e6f4f8;
    color: #007BA7;
    border: 1px solid #b3d9e8;
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 6px;
  }

  /* ── Toolbar ── */
  .toolbar {
    display: flex;
    gap: 8px;
    margin-bottom: 14px;
  }
  .toolbar button {
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    border-radius: 5px;
    cursor: pointer;
    border: 1px solid #ccc;
    background: #f5f5f5;
    color: #222;
  }
  .toolbar button.primary {
    background: #007BA7;
    color: white;
    border-color: #007BA7;
  }
  .toolbar button.outlook {
    background: #0078D4;
    color: white;
    border-color: #0078D4;
  }
  .toolbar button:hover { opacity: 0.85; }
  .toolbar .hint { font-size: 11px; color: #888; align-self: center; margin-left: 4px; }

  /* ── Attach notice overlay ── */
  #attach-notice {
    display: none;
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #1a1a1a;
    color: #fff;
    border-radius: 10px;
    padding: 14px 22px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.28);
    z-index: 9999;
    font-size: 13px;
    line-height: 1.5;
    max-width: 460px;
    text-align: center;
  }
  #attach-notice strong { color: #60cdff; }
  #attach-notice .dismiss {
    display: block;
    margin-top: 8px;
    font-size: 11px;
    color: #aaa;
    cursor: pointer;
    text-decoration: underline;
  }

  /* ── Table ── */
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  col.col-num  { width: 44px; }
  col.col-name { width: 32%; }
  col.col-email{ width: 34%; }
  col.col-phone{ width: 22%; }

  thead th {
    background: #f0f8fb;
    border: 1px solid #c8dde6;
    padding: 7px 8px;
    text-align: left;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #555;
    font-weight: 700;
  }
  thead th.num { text-align: center; }

  tbody tr:nth-child(even) { background: #f9fdff; }
  tbody tr:hover { background: #eaf5fb; }

  tbody td {
    border: 1px solid #dde8ec;
    padding: 0;
    height: 30px;
    vertical-align: middle;
  }
  tbody td.num {
    text-align: center;
    font-family: monospace;
    font-size: 11px;
    color: #888;
    background: #f5f9fb;
  }

  .cell-inner {
    display: block;
    width: 100%;
    height: 100%;
    padding: 4px 8px;
    outline: none;
    line-height: 22px;
    min-height: 30px;
  }
  .cell-inner:focus {
    background: #e8f4ff;
    box-shadow: inset 0 0 0 2px #007BA7;
  }

  /* ── Footer ── */
  .footer {
    margin-top: 18px;
    border-top: 1px solid #ddd;
    padding-top: 10px;
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #888;
  }
  .footer-sig {
    display: flex;
    gap: 40px;
    font-size: 12px;
    color: #333;
  }
  .sig-line { border-bottom: 1px solid #aaa; width: 180px; margin-top: 18px; }
  .sig-label { margin-top: 4px; font-size: 10px; color: #888; }

  /* ── Print ── */
  @media print {
    body { padding: 12px 16px; }
    .toolbar { display: none !important; }
    .cell-inner:focus { background: transparent; box-shadow: none; }
    tbody tr:hover { background: inherit; }
    thead th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tbody tr:nth-child(even) { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .cert-badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .brand-icon { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>

<!-- Header -->
<div class="header">
  <div class="brand">
    <div class="brand-icon">
      <svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3 6 12H2"/></svg>
    </div>
    <div class="brand-text">
      <div class="brand-name">FOX Medical</div>
      <div class="brand-sub">CPR Training Hub</div>
    </div>
  </div>
  <div class="class-num">#${cls.id}</div>
</div>

<!-- Class info -->
<div class="class-info">
  <div class="cert-badge">${certLabel(cls.certificationType)}</div>
  <div class="class-title">${cls.title} — Attendance Sign-In Sheet</div>
  <div class="class-meta">
    ${cls.date ? `<span>
      <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      ${fmtDate(cls.date)}${timeStr ? " · " + timeStr : ""}
    </span>` : ""}
    ${cls.location && cls.location !== "TBD" ? `<span>
      <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      ${cls.location}
    </span>` : ""}
    ${instructorLine ? `<span>
      <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      ${instructorLine}
    </span>` : ""}
    <span>
      <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      ${cls.capacity} seats
    </span>
    <span style="color:#888;">Printed: ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
  </div>
</div>

<!-- Toolbar (hidden when printing) -->
<div class="toolbar" id="toolbar">
  <button class="primary" onclick="window.print()">🖨 Print / Save as PDF</button>
  <button class="outlook" onclick="emailSheet()">✉ Email via Outlook</button>
  <button onclick="clearAll()">Clear all</button>
  <span class="hint">Click any cell to type · Tab moves between cells</span>
</div>

<!-- Table -->
<table>
  <colgroup>
    <col class="col-num" />
    <col class="col-name" />
    <col class="col-email" />
    <col class="col-phone" />
  </colgroup>
  <thead>
    <tr>
      <th class="num">#</th>
      <th>Full Name</th>
      <th>Email</th>
      <th>Phone</th>
    </tr>
  </thead>
  <tbody id="tbody">
    ${tableRows}
  </tbody>
</table>

<!-- Signature footer -->
<div class="footer-sig" style="margin-top:24px;">
  <div>
    <div class="sig-line"></div>
    <div class="sig-label">Instructor Signature</div>
  </div>
  <div>
    <div class="sig-line"></div>
    <div class="sig-label">Date</div>
  </div>
</div>

<div class="footer">
  <span>FOX Medical · CPR Training Hub · Class #${cls.id}</span>
  <span>${cls.capacity} seats · ${certLabel(cls.certificationType)}</span>
</div>

<!-- Attach notice (shown after clicking Email) -->
<div id="attach-notice">
  📎 <strong>File saved to your Downloads folder.</strong><br>
  In Outlook, click <strong>Attach File</strong> and select the file, or drag it from Downloads into the email.
  <span class="dismiss" onclick="document.getElementById('attach-notice').style.display='none'">Dismiss</span>
</div>

<script>
  function clearAll() {
    if (!confirm('Clear all entered data?')) return;
    document.querySelectorAll('.cell-inner').forEach(function(el) { el.textContent = ''; });
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function emailSheet() {
    // ── Step 1: capture current cell values and save updated file ──
    var trs = document.querySelectorAll('#tbody tr');
    var lines = [];
    var newTbody = '';

    trs.forEach(function(row) {
      var numEl = row.querySelector('td.num');
      var cells = row.querySelectorAll('.cell-inner');
      var num   = numEl ? numEl.textContent.trim() : '';
      var name  = cells[0] ? cells[0].textContent.trim() : '';
      var email = cells[1] ? cells[1].textContent.trim() : '';
      var phone = cells[2] ? cells[2].textContent.trim() : '';

      if (name) {
        lines.push(num + '. ' + name +
          (email ? '  |  ' + email : '') +
          (phone ? '  |  ' + phone : ''));
      }

      newTbody += '<tr>' +
        '<td class="num">' + escHtml(num) + '</td>' +
        '<td><div class="cell-inner" contenteditable="true">' + escHtml(name) + '</div></td>' +
        '<td><div class="cell-inner" contenteditable="true">' + escHtml(email) + '</div></td>' +
        '<td><div class="cell-inner" contenteditable="true">' + escHtml(phone) + '</div></td>' +
        '</tr>';
    });

    // Serialize the current DOM then swap tbody to include typed values
    var html = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
    // Replace the old tbody block with the freshly built one
    var tbodyStart = html.indexOf('<tbody id="tbody">');
    var tbodyEnd   = html.indexOf('</tbody>', tbodyStart) + '</tbody>'.length;
    if (tbodyStart !== -1 && tbodyEnd !== -1) {
      html = html.slice(0, tbodyStart) +
             '<tbody id="tbody">\\n    ' + newTbody + '\\n  </tbody>' +
             html.slice(tbodyEnd);
    }

    var blob = new Blob([html], { type: 'text/html' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href   = url;
    a.download = document.title.replace(/\s*\u2014\s*/, '-').replace(/\s+/g, '-').toLowerCase() + '-filled.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // ── Step 2: open Outlook via mailto: ──
    var subject = encodeURIComponent('Sign-In Sheet: ${cls.title} \u2014 ${fmtDate(cls.date)}');
    var attendeeBlock = lines.length > 0 ? lines.join('\\n') : '(no entries yet)';
    var body = encodeURIComponent(
      'FOX Medical \u2014 CPR Training Hub\\n' +
      '================================\\n' +
      'Class:       ${cls.title}\\n' +
      'Date:        ${fmtDate(cls.date)}' +
      '${timeStr ? "\\nTime:        " + timeStr : ""}' +
      '${cls.location && cls.location !== "TBD" ? "\\nLocation:    " + cls.location : ""}' +
      '${instructorLine ? "\\nInstructor:  " + instructorLine : ""}' +
      '\\nCert type:   ${certLabel(cls.certificationType)}' +
      '\\nCapacity:    ${cls.capacity} seats\\n' +
      '\\nATTENDANCE ROSTER\\n' +
      '-----------------\\n' +
      attendeeBlock
    );

    setTimeout(function() {
      window.location.href = 'mailto:?subject=' + subject + '&body=' + body;
    }, 400);

    // ── Step 3: show attach reminder ──
    var notice = document.getElementById('attach-notice');
    if (notice) {
      notice.style.display = 'block';
      setTimeout(function() { notice.style.display = 'none'; }, 18000);
    }
  }

  // Tab key moves to next editable cell
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Tab') return;
    var cells = Array.from(document.querySelectorAll('.cell-inner'));
    var idx = cells.indexOf(document.activeElement);
    if (idx === -1) return;
    e.preventDefault();
    var next = cells[e.shiftKey ? idx - 1 : idx + 1];
    if (next) next.focus();
  });
</script>
</body>
</html>`;
}

export function downloadSigninSheet(cls: ClassInfo, roster: RosterEntry[]): void {
  const html = generateSigninSheetHtml(cls, roster);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeTitle = cls.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  a.download = `signin-sheet-${safeTitle}-${cls.date}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
