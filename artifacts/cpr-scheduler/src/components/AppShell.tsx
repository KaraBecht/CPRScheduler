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
} from "lucide-react";
import type { UserRole } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  testId: string;
};

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  administrator: [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
    { href: "/classes", label: "Classes", icon: CalendarDays, testId: "nav-classes" },
    { href: "/requests", label: "Requests", icon: Inbox, testId: "nav-requests" },
    { href: "/people", label: "People", icon: Users, testId: "nav-people" },
    { href: "/certificates", label: "Certificates", icon: Award, testId: "nav-certificates" },
  ],
  instructor: [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
    { href: "/classes", label: "All Classes", icon: CalendarDays, testId: "nav-classes" },
  ],
  student: [
    { href: "/", label: "My Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
    { href: "/classes", label: "Browse Classes", icon: CalendarDays, testId: "nav-classes" },
    { href: "/certificates", label: "My Certificates", icon: Award, testId: "nav-certificates" },
  ],
  requestor: [
    { href: "/", label: "My Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
    { href: "/requests", label: "My Requests", icon: Inbox, testId: "nav-requests" },
  ],
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const [location] = useLocation();
  const items = NAV_BY_ROLE[role];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="h-14 border-b border-primary/10 bg-card flex items-center px-4 sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2" data-testid="link-home">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-base tracking-tight">FOX Medical</div>
            <div className="text-[9px] text-primary/60 uppercase tracking-widest font-semibold">
              CPR Training Hub
            </div>
          </div>
        </Link>
        <div className="ml-auto">
          <RoleSwitcher />
        </div>
      </header>
      <div className="flex-1 flex">
        <aside className="w-56 border-r border-sidebar-border bg-sidebar hidden md:flex flex-col py-4 px-3 gap-1">
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
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <div className="mt-auto px-3 py-3 text-[11px] text-muted-foreground border-t border-border">
            <div className="flex items-center gap-1.5 mb-1">
              <GraduationCap className="h-3 w-3" />
              <span className="font-semibold uppercase tracking-wider">
                Saving lives
              </span>
            </div>
            One class at a time.
          </div>
        </aside>
        <main className="flex-1 min-w-0 px-6 py-6 max-w-[1400px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
