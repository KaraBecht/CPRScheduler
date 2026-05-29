import { HeartPulse, LayoutDashboard, CalendarDays, Inbox, Users, Award, GraduationCap, CalendarCheck, UserCheck, ClipboardList, BadgeCheck } from "lucide-react";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: CalendarDays,    label: "Classes" },
  { icon: Inbox,           label: "Requests" },
  { icon: Users,           label: "People" },
  { icon: Award,           label: "Certificates" },
];

const STATS = [
  { icon: CalendarCheck, label: "Upcoming Classes", value: 2,   hint: "Next: Jun 3",    from: "#0d9488", to: "#0891b2" },
  { icon: UserCheck,     label: "Active Students",  value: 18,  hint: "+3 this month",  from: "#059669", to: "#10b981" },
  { icon: ClipboardList, label: "Pending Requests", value: 4,   hint: "Needs review",   from: "#d97706", to: "#f59e0b" },
  { icon: BadgeCheck,    label: "Certificates",     value: 31,  hint: "Issued to date", from: "#9333ea", to: "#d946ef" },
];

const CLASSES = [
  { title: "CPR / AED Basics",       cert: "CPR / AED / First Aid", date: "Jun 3, 2026",  time: "9:00 AM", loc: "Seattle",  spots: 8,  cap: 10, status: "scheduled" },
  { title: "Stop the Bleed",         cert: "Stop the Bleed",        date: "Jun 10, 2026", time: "9:00 AM", loc: "Chicago",  spots: 5,  cap: 10, status: "scheduled" },
  { title: "CPR Re-certification",   cert: "CPR / AED / First Aid", date: "May 12, 2026", time: "1:00 PM", loc: "Portland", spots: 0,  cap: 10, status: "completed" },
];

export function VariantA() {
  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: "#f0fdfa" }}>
      {/* Header */}
      <header className="h-14 flex items-center px-5 sticky top-0 z-30 shadow-sm" style={{ background: "linear-gradient(135deg,#0d9488 0%,#0891b2 100%)" }}>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
            <HeartPulse className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-base tracking-tight text-white">FOX Medical</div>
            <div className="text-[9px] text-white/60 uppercase tracking-widest font-semibold">CPR Training Hub</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">SA</div>
          <span className="text-white/90 text-sm font-medium">Sharon Anctil</span>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-56 hidden md:flex flex-col py-5 px-3 gap-1 shadow-lg" style={{ background: "linear-gradient(180deg,#0d9488 0%,#0e7490 60%,#1e3a5f 100%)" }}>
          {NAV.map(({ icon: Icon, label, active }) => (
            <div key={label} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all cursor-pointer ${ active ? "bg-white text-teal-700 shadow-md" : "text-white/80 hover:bg-white/10 hover:text-white" }`}>
              <Icon className="h-4 w-4" />
              {label}
            </div>
          ))}
          <div className="mt-auto px-3 py-3 text-[11px] text-white/40 border-t border-white/10">
            <div className="flex items-center gap-1.5 mb-1">
              <GraduationCap className="h-3 w-3" />
              <span className="font-semibold uppercase tracking-wider">Saving lives</span>
            </div>
            One class at a time.
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 px-6 py-6 max-w-5xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">Welcome back — here's your training overview.</p>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {STATS.map(({ icon: Icon, label, value, hint, from, to }) => (
              <div key={label} className="rounded-xl p-4 text-white shadow-md relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" style={{ background: `linear-gradient(135deg,${from} 0%,${to} 100%)` }}>
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/10 -translate-y-4 translate-x-4" />
                <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center mb-3">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="text-3xl font-bold tabular-nums">{value}</div>
                <div className="text-[11px] uppercase tracking-widest font-medium mt-1 text-white/80">{label}</div>
                {hint && <div className="text-[11px] mt-1 text-white/60">{hint}</div>}
              </div>
            ))}
          </div>

          {/* Classes */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 text-base">Upcoming Classes</h2>
            <span className="text-xs text-teal-600 font-medium cursor-pointer hover:underline">View all →</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {CLASSES.map((c) => (
              <div key={c.title} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 cursor-pointer hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: "#ccfbf1", color: "#0d9488" }}>{c.cert}</span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${ c.status === "scheduled" ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500" }`}>{c.status}</span>
                </div>
                <h3 className="font-semibold text-slate-800 text-sm mb-2">{c.title}</h3>
                <div className="space-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3" />{c.date}</div>
                  <div className="flex items-center gap-1.5"><span className="h-3 w-3 text-center">⏰</span>{c.time}</div>
                  <div className="flex items-center gap-1.5"><span className="h-3 w-3 text-center">📍</span>{c.loc}</div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-400">{c.spots}/{c.cap} open</div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
