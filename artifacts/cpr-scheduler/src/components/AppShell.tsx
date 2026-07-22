import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import {
  LayoutDashboard,
  CalendarDays,
  Inbox,
  Users,
  Award,
  GraduationCap,
  HeartPulse,
  MapPin,
} from "lucide-react";
import type { UserRole } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

// ── Medical palette constants ──────────────────────────────────────
const SURGICAL_BLUE = "#007BA7";
const TRUST_TEAL    = "#008080";
const AID_RED       = "#D62828";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  testId: string;
};

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  administrator: [
    { href: "/",             label: "Dashboard",    icon: LayoutDashboard, testId: "nav-dashboard"     },
    { href: "/classes",      label: "Classes",      icon: CalendarDays,    testId: "nav-classes"       },
    { href: "/requests",     label: "Requests",     icon: Inbox,           testId: "nav-requests"      },
    { href: "/people",       label: "People",       icon: Users,           testId: "nav-people"        },
    { href: "/certificates", label: "Certificates", icon: Award,           testId: "nav-certificates"  },
    { href: "/locations",    label: "Locations",    icon: MapPin,          testId: "nav-locations"     },
  ],
  instructor: [
    { href: "/",        label: "Dashboard",  icon: LayoutDashboard, testId: "nav-dashboard" },
    { href: "/classes", label: "All Classes", icon: CalendarDays,    testId: "nav-classes"   },
  ],
  student: [
    { href: "/",             label: "My Dashboard",    icon: LayoutDashboard, testId: "nav-dashboard"    },
    { href: "/classes",      label: "Browse Classes",  icon: CalendarDays,    testId: "nav-classes"      },
    { href: "/certificates", label: "My Certificates", icon: Award,           testId: "nav-certificates" },
  ],
  requestor: [
    { href: "/",         label: "My Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
    { href: "/requests", label: "My Requests",  icon: Inbox,           testId: "nav-requests"  },
  ],
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const [location] = useLocation();
  const items = NAV_BY_ROLE[role];

  const ROLE_INITIALS: Record<string, string> = {
    administrator: "AD",
    instructor:    "IN",
    student:       "ST",
    requestor:     "RQ",
  };
  const initials = ROLE_INITIALS[role] ?? "??";
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <div className="min-h-screen flex flex-col text-foreground" style={{ background: "hsl(200 22% 97%)" }}>
      {/* ── Top header bar ── */}
      <header className="h-14 border-b border-border bg-card flex items-center px-5 sticky top-0 z-30 shadow-sm">
        <Link href="/" className="flex items-center gap-2.5" data-testid="link-home">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ background: TRUST_TEAL }}
          >
            <HeartPulse className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-base tracking-tight text-foreground">FOX Medical</div>
            <div
              className="text-[9px] uppercase tracking-widest font-semibold"
              style={{ color: TRUST_TEAL }}
            >
              CPR Training Hub
            </div>
          </div>
        </Link>
        <div className="ml-auto">
          <RoleSwitcher />
        </div>
      </header>

      <div className="flex-1 flex">
        {/* ── Sidebar ── */}
        <aside
          className="w-56 hidden md:flex flex-col py-5 px-3 gap-1"
          style={{ background: "linear-gradient(180deg,#1a3a4a 0%,#0d2233 100%)" }}
        >
          {items.map((item) => {
            const active =
              item.href === "/"
                ? location === "/"
                : location.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={item.testId}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
                style={
                  active
                    ? { background: TRUST_TEAL, color: "#fff" }
                    : { color: "rgba(255,255,255,0.60)" }
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          {/* Bottom user section */}
          <div
            className="mt-auto pt-4 mx-0 px-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
          >
            <div className="flex items-center gap-2.5 py-2 rounded-xl">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: SURGICAL_BLUE }}
              >
                {initials}
              </div>
              <div className="leading-tight min-w-0">
                <div className="text-white text-xs font-semibold truncate">{roleLabel}</div>
                <div className="text-[10px]" style={{ color: "rgba(169,176,179,0.7)" }}>
                  FOX Medical
                </div>
              </div>
            </div>
            <div
              className="px-1 mt-2 text-[10px] uppercase tracking-wider font-semibold"
              style={{ color: "rgba(169,176,179,0.30)" }}
            >
              <GraduationCap className="h-3 w-3 inline mr-1" />
              Saving lives · one class at a time
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 px-6 py-6 max-w-[1400px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
