import { HeartPulse } from "lucide-react";

const SAMPLE = {
  title: "Community CPR Training — Spring Session",
  certLabel: "CPR / AED / First Aid",
  date: "2024-12-15",
  location: "Fox Medical Clinic, 300 Main St, Suite 200",
  renewalBy: "2026-02-15",
};

export default function EmailPreviewRenewal() {
  return (
    <div className="min-h-screen bg-[#f4f4f5] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
          <HeartPulse className="h-4 w-4 text-primary" />
          <span className="font-medium text-foreground">Renewal reminder email preview</span>
          <span className="ml-auto italic">Sent to all administrators 18 months after class completion</span>
        </div>

        {/* Email shell */}
        <div className="rounded-lg border border-border bg-white shadow-sm overflow-hidden font-sans text-[14px] text-[#111]">

          {/* Fake email header bar */}
          <div className="bg-[#f9f9f9] border-b border-[#e4e4e7] px-6 py-3 text-[12px] text-[#555] space-y-1">
            <div><span className="font-semibold w-16 inline-block">From:</span> FOX Medical CPR Training Hub &lt;noreply@foxmedical.com&gt;</div>
            <div><span className="font-semibold w-16 inline-block">To:</span> sharon.anctil@foxmedical.com</div>
            <div><span className="font-semibold w-16 inline-block">Subject:</span> CPR Renewal Planning: "{SAMPLE.title}" is due for renewal</div>
          </div>

          {/* Email body */}
          <div className="px-8 py-8 space-y-6">

            {/* Logo / brand header */}
            <div className="flex items-center gap-3 border-b border-[#e4e4e7] pb-6">
              <div className="h-10 w-10 rounded-lg bg-[#007BA7] flex items-center justify-center flex-shrink-0">
                <HeartPulse className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-[16px] tracking-tight">FOX Medical</div>
                <div className="text-[10px] text-[#888] uppercase tracking-wider">CPR Training Hub</div>
              </div>
            </div>

            <p className="text-[15px] font-semibold text-[#007BA7]">
              Renewal Planning Reminder
            </p>

            <p>Hi,</p>

            <p>
              This is an automated renewal planning reminder. The following class was
              completed <strong>18 months ago</strong> — it may be time to schedule a
              renewal session for participants whose certifications are expiring.
            </p>

            {/* Class details table */}
            <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse" }}
              className="rounded-lg overflow-hidden border border-[#e4e4e7] text-[13px]">
              <tbody>
                {[
                  ["Class", SAMPLE.title],
                  ["Certification", SAMPLE.certLabel],
                  ["Completed", new Date(SAMPLE.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "long", day: "numeric" })],
                  ["Location", SAMPLE.location],
                  ["Renewal deadline", new Date(SAMPLE.renewalBy + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })],
                ].map(([label, value], i) => (
                  <tr key={label} style={{ background: i % 2 === 0 ? "#fafafa" : "#fff" }}>
                    <td className="px-4 py-3 text-[#666] font-medium w-40 border-b border-[#e4e4e7]">{label}</td>
                    <td className="px-4 py-3 border-b border-[#e4e4e7]">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* CTA banner */}
            <div className="rounded-lg bg-[#007BA7]/8 border border-[#007BA7]/20 px-5 py-4 flex items-start gap-3">
              <div className="mt-0.5 h-4 w-4 rounded-full bg-[#007BA7] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[10px] font-bold">!</span>
              </div>
              <p className="text-[13px] text-[#005a7d]">
                Participants should renew their certification by{" "}
                <strong>{new Date(SAMPLE.renewalBy + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</strong>.
                Log in to the scheduler to create a renewal class or reach out to past participants.
              </p>
            </div>

            <p className="text-[#555]">
              This reminder is sent automatically 18 months after a completed class. No
              action is required if a renewal has already been scheduled.
            </p>

            <p>
              Best regards,<br />
              <span className="font-medium">FOX Medical CPR Training Hub</span>
            </p>

            {/* Footer */}
            <div className="border-t border-[#e4e4e7] pt-4 text-[11px] text-[#999] space-y-1">
              <p>You received this message because you are an administrator in the CPR Training Hub.</p>
              <p>FOX Medical · CPR Training Hub · Automated notification</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
