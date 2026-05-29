import { HeartPulse, LayoutDashboard, CalendarDays, Inbox, Users, Award, GraduationCap, CalendarCheck, UserCheck, ClipboardList, BadgeCheck, Bell, ChevronDown } from "lucide-react";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true, dot: "bg-emerald-400" },
  { icon: CalendarDays,    label: "Classes",   dot: "bg-sky-400" },
  { icon: Inbox,           label: "Requests",  dot: "bg-amber-400", badge: 4 },
  { icon: Users,           label: "People",    dot: "bg-violet-400" },
  { icon: Award,           label: "Certificates", dot: "bg-rose-400" },
];

const STATS = [
  { icon: CalendarCheck, label: "Upcoming Classes", value: 2,  hint: "Next: Jun 3",    bg: "bg-sky-50",     border: "border-sky-200",    icon_bg: "bg-sky-100",    icon_color: "text-sky-600",    num: "text-sky-700" },
  { icon: UserCheck,     label: "Active Students",  value: 18, hint: "+3 this month",  bg: "bg-emerald-50", border: "border-emerald-200", icon_bg: "bg-emerald-100", icon_color: "text-emerald-600", num: "text-emerald-700" },
  { icon: ClipboardList, label: "Pending Requests", value: 4,  hint: "Needs review",   bg: "bg-amber-50",   border: "border-amber-200",   icon_bg: "bg-amber-100",   icon_color: "text-amber-600",   num: "text-amber-700" },
  { icon: BadgeCheck,    label: "Certificates",     value: 31, hint: "Issued to date", bg: "bg-violet-50",  border: "border-violet-200",  icon_bg: "bg-violet-100",  icon_color: "text-violet-600",  num: "text-violet-700" },
];

const CLASSES = [
  { title: "CPR / AED Basics",     cert: "CPR / AED", date: "Jun 3",  time: "9:00 AM", loc: "Seattle",  spots: 8, cap: 10, tag: "bg-sky-100 text-sky-700", bar: "bg-sky-500" },
  { title: "Stop the Bleed",       cert: "First Aid", date: "Jun 10", time: "9:00 AM", loc: "Chicago",  spots: 5, cap: 10, tag: "bg-rose-100 text-rose-700", bar: "bg-rose-500" },
  { title: "CPR Re-cert",          cert: "CPR / AED", date: "Jun 22", time: "1:00 PM", loc: "Portland", spots: 3, cap: 10, tag: "bg-sky-100 text-sky-700", bar: "bg-sky-500" },
];

export function VariantB() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50">
      {/* Header — vivid gradient bar */}
      <header className="h-14 flex items-center px-5 sticky top-0 z-30" style={{ background: "linear-gradient(90deg,#0f766e 0%,#0369a1 50%,#7c3aed 100%)" }}>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center">
            <HeartPulse className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-base tracking-tight text-white">FOX Medical</div>
            <div className="text-[9px] text-white/60 uppercase tracking-widest font-semibold">CPR Training Hub</div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <Bell className="h-5 w-5 text-white/80" />
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-amber-400 rounded-full text-[8px] flex items-center justify-center text-slate-900 font-bold">4</span>
          </div>
          <div className="flex items-center gap-1.5 cursor-pointer">
            <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">SA</div>
            <span className="text-white/90 text-sm font-medium">Sharon</span>
            <ChevronDown className="h-3.5 w-3.5 text-white/60" />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar — white with colored dots */}
        <aside className="w-56 hidden md:flex flex-col py-5 px-3 gap-1 bg-white border-r border-slate-100 shadow-sm">
          {NAV.map(({ icon: Icon, label, active, dot, badge }) => (
            <div key={label} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all cursor-pointer relative ${ active ? "bg-gradient-to-r from-teal-50 to-sky-50 text-teal-700 border border-teal-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800" }`}>
              <span className={`h-2 w-2 rounded-full ${dot} ${active ? "opacity-100" : "opacity-40"}`} />
              <Icon className="h-4 w-4" />
              {label}
              {badge && <span className="ml-auto text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">{badge}</span>}
            </div>
          ))}
          <div className="mt-auto px-3 py-3 text-[11px] text-slate-400 border-t border-slate-100">
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
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
              <p className="text-sm text-slate-500 mt-0.5">Thursday, May 29, 2026</p>
            </div>
            <button className="text-sm font-semibold text-white px-4 py-2 rounded-lg shadow-sm hover:opacity-90 transition" style={{ background: "linear-gradient(135deg,#0d9488,#0369a1)" }}>
              + Schedule class
            </button>
          </div>

          {/* Stat cards — vivid colored fills */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {STATS.map(({ icon: Icon, label, value, hint, bg, border, icon_bg, icon_color, num }) => (
              <div key={label} className={`rounded-xl p-4 border ${bg} ${border} cursor-pointer hover:shadow-md transition-shadow`}>
                <div className={`h-9 w-9 rounded-lg ${icon_bg} ${icon_color} flex items-center justify-center mb-3`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className={`text-3xl font-bold tabular-nums ${num}`}>{value}</div>
                <div className="text-[11px] text-slate-500 uppercase tracking-widest font-medium mt-1">{label}</div>
                {hint && <div className="text-[11px] mt-1 text-slate-400">{hint}</div>}
              </div>
            ))}
          </div>

          {/* Classes with colored side stripe */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 text-base">Upcoming Classes</h2>
            <span className="text-xs text-teal-600 font-medium cursor-pointer hover:underline">View all →</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {CLASSES.map((c) => (
              <div key={c.title} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow flex">
                <div className={`w-1 ${c.bar} shrink-0`} />
                <div className="p-4 flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${c.tag}`}>{c.cert}</span>
                    <span className="text-[10px] font-semibold text-slate-400">{c.spots} open</span>
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm mb-2">{c.title}</h3>
                  <div className="space-y-0.5 text-xs text-slate-500">
                    <div>{c.date} · {c.time}</div>
                    <div>📍 {c.loc}</div>
                  </div>
                  <div className="mt-3">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${c.bar} rounded-full`} style={{ width: `${((c.cap - c.spots) / c.cap) * 100}%` }} />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">{c.cap - c.spots}/{c.cap} enrolled</div>
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
