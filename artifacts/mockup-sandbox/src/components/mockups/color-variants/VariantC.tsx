import { HeartPulse, LayoutDashboard, CalendarDays, Inbox, Users, Award, CalendarCheck, UserCheck, ClipboardList, BadgeCheck, Flame, Star } from "lucide-react";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard",    active: true },
  { icon: CalendarDays,    label: "Classes" },
  { icon: Inbox,           label: "Requests",     badge: 4 },
  { icon: Users,           label: "People" },
  { icon: Award,           label: "Certificates" },
];

const STATS = [
  { icon: CalendarCheck, label: "Upcoming",    value: 2,  sub: "classes", color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  { icon: UserCheck,     label: "Students",    value: 18, sub: "active",  color: "#22d3ee", bg: "rgba(34,211,238,0.12)" },
  { icon: ClipboardList, label: "Requests",    value: 4,  sub: "pending", color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
  { icon: BadgeCheck,    label: "Certificates",value: 31, sub: "issued",  color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
];

const CLASSES = [
  { title: "CPR / AED Basics",   cert: "CPR",       date: "Jun 3",  time: "9:00 AM", loc: "Seattle",  spots: 8,  cap: 10, accent: "#f97316" },
  { title: "Stop the Bleed",     cert: "First Aid", date: "Jun 10", time: "9:00 AM", loc: "Chicago",  spots: 5,  cap: 10, accent: "#22d3ee" },
  { title: "CPR Re-certification", cert: "CPR",     date: "Jun 22", time: "1:00 PM", loc: "Portland", spots: 3,  cap: 10, accent: "#f97316" },
];

export function VariantC() {
  return (
    <div className="min-h-screen flex font-sans" style={{ background: "#f8faff" }}>
      {/* Sidebar — deep navy */}
      <aside className="w-60 hidden md:flex flex-col py-5 px-3.5 gap-1 relative" style={{ background: "linear-gradient(180deg,#1e1b4b 0%,#312e81 100%)" }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-2 mb-5">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#f97316,#f59e0b)" }}>
            <HeartPulse className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-base tracking-tight text-white">FOX Medical</div>
            <div className="text-[9px] text-white/40 uppercase tracking-widest font-semibold">CPR Training Hub</div>
          </div>
        </div>

        {/* Nav */}
        {NAV.map(({ icon: Icon, label, active, badge }) => (
          <div key={label} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer transition-all ${ active ? "text-indigo-900 shadow-lg" : "text-white/60 hover:text-white/90 hover:bg-white/5" }`} style={active ? { background: "linear-gradient(135deg,#f97316,#f59e0b)" } : {}}>
            <Icon className="h-4 w-4" />
            {label}
            {badge && <span className="ml-auto text-[10px] font-bold bg-white/20 text-white rounded-full px-1.5 py-0.5">{badge}</span>}
          </div>
        ))}

        {/* Bottom */}
        <div className="mt-auto pt-4 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 cursor-pointer">
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#f97316,#f59e0b)" }}>SA</div>
            <div>
              <div className="text-white text-xs font-semibold leading-tight">Sharon Anctil</div>
              <div className="text-white/40 text-[10px]">Administrator</div>
            </div>
          </div>
          <div className="px-2 mt-3 text-[10px] text-white/20 uppercase tracking-wider font-semibold">Saving lives · one class at a time</div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-slate-200 bg-white/70 backdrop-blur">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Overview</span>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-lg text-white shadow hover:opacity-90 transition" style={{ background: "linear-gradient(135deg,#f97316,#f59e0b)" }}>
              <Flame className="h-3.5 w-3.5" /> Schedule class
            </button>
          </div>
        </header>

        <main className="flex-1 px-6 py-6 max-w-5xl">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {STATS.map(({ icon: Icon, label, value, sub, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 -translate-y-6 translate-x-6" style={{ background: color }} />
                <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <div className="text-4xl font-black tabular-nums" style={{ color }}>{value}</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5 capitalize">{sub} {label}</div>
              </div>
            ))}
          </div>

          {/* Classes */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-800 text-base">Upcoming Classes</h2>
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full text-amber-700" style={{ background: "rgba(251,191,36,0.15)" }}><Star className="h-2.5 w-2.5" /> 2 scheduled</span>
            </div>
            <span className="text-xs font-semibold cursor-pointer hover:underline" style={{ color: "#f97316" }}>View all →</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {CLASSES.map((c) => (
              <div key={c.title} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-white" style={{ background: c.accent }}>{c.cert}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{c.spots} spots left</span>
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-2.5">{c.title}</h3>
                <div className="space-y-1 text-xs text-slate-500 mb-3">
                  <div className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3" style={{ color: c.accent }} />{c.date} · {c.time}</div>
                  <div className="flex items-center gap-1.5"><span style={{ color: c.accent }}>📍</span>{c.loc}</div>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${((c.cap - c.spots) / c.cap) * 100}%`, background: c.accent }} />
                </div>
                <div className="text-[10px] text-slate-400 mt-1">{c.cap - c.spots}/{c.cap} enrolled</div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
