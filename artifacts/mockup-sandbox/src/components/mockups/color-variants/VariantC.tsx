import {
  HeartPulse, LayoutDashboard, CalendarDays, Inbox, Users, Award,
  CalendarCheck, UserCheck, ClipboardList, BadgeCheck, Plus, Star,
} from "lucide-react";

// ── Medical Palette ───────────────────────────────────────────────
const P = {
  surgicalBlue:  "#007BA7",
  healthGreen:   "#4CAF50",
  cleanWhite:    "#FFFFFF",
  coolGray:      "#A9B0B3",
  trustTeal:     "#008080",
  aidRed:        "#D62828",
};

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard",    active: true },
  { icon: CalendarDays,    label: "Classes" },
  { icon: Inbox,           label: "Requests",  badge: 4 },
  { icon: Users,           label: "People" },
  { icon: Award,           label: "Certificates" },
];

const STATS = [
  {
    icon: CalendarCheck, label: "Upcoming Classes", value: 2,  sub: "Next: Jun 3",
    bg: "#e6f4fa", iconBg: "#b3dced", iconColor: P.surgicalBlue, numColor: "#005678", labelColor: "#00698a",
  },
  {
    icon: UserCheck, label: "Active Students", value: 18, sub: "+3 this month",
    bg: "#eaf7ea", iconBg: "#b9e5bb", iconColor: P.healthGreen, numColor: "#2d7a2f", labelColor: "#388e3c",
  },
  {
    icon: ClipboardList, label: "Pending Requests", value: 4, sub: "Needs review",
    bg: "#fce8e8", iconBg: "#f5b8b8", iconColor: P.aidRed, numColor: "#8b1a1a", labelColor: "#c02020",
  },
  {
    icon: BadgeCheck, label: "Certificates", value: 31, sub: "Issued to date",
    bg: "#e0f2f2", iconBg: "#a3d9d9", iconColor: P.trustTeal, numColor: "#005555", labelColor: "#006666",
  },
];

const CLASSES = [
  { title: "CPR / AED Basics",     cert: "CPR",       date: "Jun 3",  time: "9:00 AM", loc: "Seattle",  spots: 8, cap: 10, accent: P.surgicalBlue },
  { title: "Stop the Bleed",       cert: "First Aid", date: "Jun 10", time: "9:00 AM", loc: "Chicago",  spots: 5, cap: 10, accent: P.healthGreen  },
  { title: "CPR Re-certification", cert: "CPR",       date: "Jun 22", time: "1:00 PM", loc: "Portland", spots: 3, cap: 10, accent: P.trustTeal    },
];

export function VariantC() {
  return (
    <div className="min-h-screen flex font-sans" style={{ background: "#f4f8fa" }}>

      {/* ── Sidebar ── */}
      <aside
        className="w-60 hidden md:flex flex-col py-5 px-3.5 gap-1"
        style={{ background: "linear-gradient(180deg,#1a3a4a 0%,#0d2233 100%)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{ background: P.trustTeal }}
          >
            <HeartPulse className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-base tracking-tight text-white">FOX Medical</div>
            <div className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: P.coolGray }}>CPR Training Hub</div>
          </div>
        </div>

        {NAV.map(({ icon: Icon, label, active, badge }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer transition-all"
            style={
              active
                ? { background: P.trustTeal, color: "#fff" }
                : { color: "rgba(255,255,255,0.55)" }
            }
          >
            <Icon className="h-4 w-4" />
            {label}
            {badge && (
              <span
                className="ml-auto text-[10px] font-bold rounded-full px-1.5 py-0.5"
                style={{ background: P.aidRed, color: "#fff" }}
              >
                {badge}
              </span>
            )}
          </div>
        ))}

        <div className="mt-auto pt-4 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl cursor-pointer hover:bg-white/5">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: P.surgicalBlue }}
            >
              SA
            </div>
            <div>
              <div className="text-white text-xs font-semibold leading-tight">Sharon Anctil</div>
              <div className="text-[10px]" style={{ color: P.coolGray }}>Administrator</div>
            </div>
          </div>
          <div className="px-2 mt-3 text-[10px] uppercase tracking-wider font-semibold" style={{ color: "rgba(169,176,179,0.35)" }}>
            Saving lives · one class at a time
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col">

        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-6 border-b bg-white" style={{ borderColor: "#dde8ec" }}>
          <div>
            <span className="text-xs uppercase tracking-widest font-semibold" style={{ color: P.coolGray }}>Overview</span>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">Dashboard</h1>
          </div>
          <button
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-1.5 rounded-lg text-white shadow hover:opacity-90 transition"
            style={{ background: P.surgicalBlue }}
          >
            <Plus className="h-3.5 w-3.5" /> Schedule class
          </button>
        </header>

        <main className="flex-1 px-6 py-6 max-w-5xl">

          {/* Stat cards — soft solid fills from medical palette */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {STATS.map(({ icon: Icon, label, value, sub, bg, iconBg, iconColor, numColor, labelColor }) => (
              <div
                key={label}
                className="rounded-2xl p-5 shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
                style={{ background: bg }}
              >
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: iconBg }}
                >
                  <Icon className="h-5 w-5" style={{ color: iconColor }} />
                </div>
                <div className="text-4xl font-black tabular-nums" style={{ color: numColor }}>{value}</div>
                <div className="text-xs font-semibold mt-1" style={{ color: labelColor }}>{label}</div>
                <div className="text-[11px] mt-0.5" style={{ color: labelColor, opacity: 0.65 }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Upcoming classes */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-800 text-base">Upcoming Classes</h2>
              <span
                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: "#eaf7ea", color: P.healthGreen }}
              >
                <Star className="h-2.5 w-2.5" /> 2 scheduled
              </span>
            </div>
            <span className="text-xs font-semibold cursor-pointer hover:underline" style={{ color: P.surgicalBlue }}>
              View all →
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {CLASSES.map((c) => (
              <div
                key={c.title}
                className="bg-white rounded-2xl shadow-sm border p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
                style={{ borderColor: "#dde8ec" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-white"
                    style={{ background: c.accent }}
                  >
                    {c.cert}
                  </span>
                  <span className="text-[10px] font-medium" style={{ color: P.coolGray }}>
                    {c.spots} spots left
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-2.5">{c.title}</h3>
                <div className="space-y-1 text-xs mb-3" style={{ color: P.coolGray }}>
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3 w-3" style={{ color: c.accent }} />
                    {c.date} · {c.time}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: c.accent }}>📍</span>{c.loc}
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#e8eef1" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${((c.cap - c.spots) / c.cap) * 100}%`, background: c.accent }}
                  />
                </div>
                <div className="text-[10px] mt-1" style={{ color: P.coolGray }}>
                  {c.cap - c.spots}/{c.cap} enrolled
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
