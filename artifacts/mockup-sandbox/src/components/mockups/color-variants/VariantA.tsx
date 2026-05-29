import { HeartPulse, LayoutDashboard, CalendarDays, Inbox, Users, Award, GraduationCap, CalendarCheck, UserCheck, ClipboardList, BadgeCheck } from "lucide-react";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: CalendarDays,    label: "Classes" },
  { icon: Inbox,           label: "Requests" },
  { icon: Users,           label: "People" },
  { icon: Award,           label: "Certificates" },
];

const STATS = [
  { icon: CalendarCheck, label: "Upcoming Classes", value: 2,   hint: "Next: Jun 3",    from: "#6d28d9", to: "#8b5cf6" },
  { icon: UserCheck,     label: "Active Students",  value: 18,  hint: "+3 this month",  from: "#7c3aed", to: "#a78bfa" },
  { icon: ClipboardList, label: "Pending Requests", value: 4,   hint: "Needs review",   from: "#5b21b6", to: "#7c3aed" },
  { icon: BadgeCheck,    label: "Certificates",     value: 31,  hint: "Issued to date", from: "#4c1d95", to: "#6d28d9" },
];

const CLASSES = [
  { title: "CPR / AED Basics",      cert: "CPR / AED / First Aid", date: "Jun 3, 2026",  time: "9:00 AM", loc: "Seattle",  spots: 8, cap: 10, status: "scheduled" },
  { title: "Stop the Bleed",        cert: "Stop the Bleed",        date: "Jun 10, 2026", time: "9:00 AM", loc: "Chicago",  spots: 5, cap: 10, status: "scheduled" },
  { title: "CPR Re-certification",  cert: "CPR / AED / First Aid", date: "May 12, 2026", time: "1:00 PM", loc: "Portland", spots: 0, cap: 10, status: "completed" },
];

export function VariantA() {
  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: "#f5f3ff" }}>
      {/* Header */}
      <header
        className="h-14 flex items-center px-5 sticky top-0 z-30 shadow-md"
        style={{ background: "linear-gradient(135deg,#4c1d95 0%,#6d28d9 60%,#7c3aed 100%)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.18)" }}>
            <HeartPulse className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-base tracking-tight text-white">FOX Medical</div>
            <div className="text-[9px] text-violet-200 uppercase tracking-widest font-semibold">CPR Training Hub</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="h-7 w-7 rounded-full flex items-center justify-center text-violet-900 text-xs font-bold" style={{ background: "rgba(255,255,255,0.25)" }}>SA</div>
          <span className="text-white/90 text-sm font-medium">Sharon Anctil</span>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className="w-56 hidden md:flex flex-col py-5 px-3 gap-1 shadow-xl"
          style={{ background: "linear-gradient(180deg,#4c1d95 0%,#5b21b6 45%,#3730a3 100%)" }}
        >
          {NAV.map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                active
                  ? "bg-white text-violet-800 shadow-lg shadow-violet-900/30"
                  : "text-violet-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </div>
          ))}
          <div className="mt-auto px-3 py-3 text-[11px] text-violet-300/50 border-t border-white/10">
            <div className="flex items-center gap-1.5 mb-1">
              <GraduationCap className="h-3 w-3" />
              <span className="font-semibold uppercase tracking-wider">Saving lives</span>
            </div>
            One class at a time.
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 px-6 py-6 max-w-5xl">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#3b0764" }}>Dashboard</h1>
              <p className="text-sm mt-0.5" style={{ color: "#7c3aed" }}>Welcome back — here's your training overview.</p>
            </div>
            <button
              className="text-sm font-semibold text-white px-4 py-2 rounded-lg shadow-md hover:opacity-90 transition"
              style={{ background: "linear-gradient(135deg,#6d28d9,#8b5cf6)" }}
            >
              + Schedule class
            </button>
          </div>

          {/* Stat cards — violet gradient fills */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {STATS.map(({ icon: Icon, label, value, hint, from, to }) => (
              <div
                key={label}
                className="rounded-xl p-4 text-white shadow-lg relative overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all"
                style={{ background: `linear-gradient(135deg,${from} 0%,${to} 100%)` }}
              >
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/10 -translate-y-4 translate-x-4" />
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: "rgba(255,255,255,0.18)" }}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="text-3xl font-bold tabular-nums">{value}</div>
                <div className="text-[11px] uppercase tracking-widest font-medium mt-1 text-violet-200">{label}</div>
                {hint && <div className="text-[11px] mt-1 text-violet-300/70">{hint}</div>}
              </div>
            ))}
          </div>

          {/* Class cards */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-base" style={{ color: "#4c1d95" }}>Upcoming Classes</h2>
            <span className="text-xs font-medium cursor-pointer hover:underline" style={{ color: "#7c3aed" }}>View all →</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {CLASSES.map((c) => (
              <div
                key={c.title}
                className="bg-white rounded-xl shadow-sm border cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
                style={{ borderColor: "#ede9fe" }}
              >
                <div
                  className="h-1 w-full rounded-t-xl"
                  style={{ background: "linear-gradient(90deg,#6d28d9,#8b5cf6)" }}
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                      style={{ background: "#ede9fe", color: "#6d28d9" }}
                    >
                      {c.cert}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        c.status === "scheduled"
                          ? "text-violet-700"
                          : "text-slate-400"
                      }`}
                      style={c.status === "scheduled" ? { background: "#ede9fe" } : { background: "#f1f5f9" }}
                    >
                      {c.status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm mb-2">{c.title}</h3>
                  <div className="space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3" style={{ color: "#7c3aed" }} />{c.date}</div>
                    <div className="flex items-center gap-1.5"><span style={{ color: "#7c3aed" }}>⏰</span>{c.time}</div>
                    <div className="flex items-center gap-1.5"><span style={{ color: "#7c3aed" }}>📍</span>{c.loc}</div>
                  </div>
                  <div className="mt-3 pt-2 border-t text-xs" style={{ borderColor: "#ede9fe", color: "#a78bfa" }}>
                    {c.spots}/{c.cap} open · {c.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
