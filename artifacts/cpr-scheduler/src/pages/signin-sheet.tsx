import { useRoute } from "wouter";
import { useGetClass } from "@workspace/api-client-react";
import { formatCertificationType, formatDate, formatTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { HeartPulse, Printer, Download } from "lucide-react";

function downloadCsvTemplate(cls: {
  id: number;
  title: string;
  date: string;
  startTime: string;
  location: string;
  capacity: number;
}) {
  const rows = [
    `# PulsePoint CPR Sign-in Sheet`,
    `# ClassID: ${cls.id}`,
    `# Date: ${cls.date}`,
    `# StartTime: ${cls.startTime}`,
    `# Class: ${cls.title}`,
    `# Location: ${cls.location}`,
    `Name,Email,Phone`,
    ...Array.from({ length: cls.capacity }, () => ",,"),
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `signin-${cls.date}-${cls.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SigninSheet() {
  const [, params] = useRoute("/classes/:id/signin-sheet");
  const classId = Number(params?.id);
  const { data: cls } = useGetClass(classId);

  if (!cls) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Loading…
      </div>
    );
  }

  const rows = Array.from({ length: cls.capacity }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-white">
      {/* Toolbar — hidden when printing */}
      <div className="print:hidden bg-[#f4f4f5] border-b px-6 py-3 flex items-center gap-3">
        <a href="javascript:history.back()" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </a>
        <span className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => downloadCsvTemplate(cls)}>
          <Download className="h-4 w-4 mr-1.5" />
          Download CSV template
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1.5" />
          Print
        </Button>
      </div>

      {/* Sheet content */}
      <div className="max-w-4xl mx-auto px-8 py-10 print:px-6 print:py-6">

        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-[#007BA7] pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-[#007BA7] flex items-center justify-center flex-shrink-0">
              <HeartPulse className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight">FOX Medical</div>
              <div className="text-[10px] text-[#888] uppercase tracking-wider">CPR Training Hub</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#888] uppercase tracking-wider mb-0.5">Class ID</div>
            <div className="font-mono font-bold text-2xl text-[#007BA7]">#{cls.id}</div>
          </div>
        </div>

        {/* Class info */}
        <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
          <div>
            <span className="font-semibold">Class: </span>
            <span>{cls.title}</span>
          </div>
          <div>
            <span className="font-semibold">Certification: </span>
            <span>{formatCertificationType(cls.certificationType)}</span>
          </div>
          <div>
            <span className="font-semibold">Date: </span>
            <span>{formatDate(cls.date)}</span>
          </div>
          <div>
            <span className="font-semibold">Time: </span>
            <span>
              {formatTime(cls.startTime)}
              {cls.endTime ? ` – ${formatTime(cls.endTime)}` : ""}
            </span>
          </div>
          <div className="col-span-2">
            <span className="font-semibold">Location: </span>
            <span>{cls.location}</span>
          </div>
        </div>

        {/* Instruction line */}
        <p className="text-xs text-[#555] mb-4 italic">
          Please print legibly. By signing below you confirm your attendance in this CPR training session.
        </p>

        {/* Roster table */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#007BA7] text-white">
              <th className="w-10 py-2 px-3 text-left font-semibold border border-[#005f87]">#</th>
              <th className="py-2 px-3 text-left font-semibold border border-[#005f87]">Full Name (print)</th>
              <th className="py-2 px-3 text-left font-semibold border border-[#005f87]">Email</th>
              <th className="py-2 px-3 text-left font-semibold border border-[#005f87]">Phone</th>
              <th className="py-2 px-3 text-left font-semibold border border-[#005f87]">Signature</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((n) => (
              <tr key={n} className={n % 2 === 0 ? "bg-[#f9fafb]" : "bg-white"}>
                <td className="py-3 px-3 border border-[#ddd] text-center text-[#888] font-mono">{n}</td>
                <td className="py-3 px-3 border border-[#ddd]" style={{ minWidth: "180px" }}>&nbsp;</td>
                <td className="py-3 px-3 border border-[#ddd]" style={{ minWidth: "160px" }}>&nbsp;</td>
                <td className="py-3 px-3 border border-[#ddd]" style={{ minWidth: "120px" }}>&nbsp;</td>
                <td className="py-3 px-3 border border-[#ddd]" style={{ minWidth: "160px" }}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-[#ddd] flex justify-between text-[10px] text-[#aaa]">
          <span>FOX Medical CPR Training Hub · Confidential attendance record</span>
          <span>Class #{cls.id} · {cls.date}</span>
        </div>
      </div>
    </div>
  );
}
