import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Medical palette soft-fill tones
const TONE_CONFIG = {
  primary: {
    bg:        "#ede9fe",
    iconBg:    "#c4b5fd",
    iconColor: "#7c3aed",
    numColor:  "#4c1d95",
    lblColor:  "#6d28d9",
  },
  success: {
    bg:        "#d1fae5",
    iconBg:    "#6ee7b7",
    iconColor: "#059669",
    numColor:  "#064e3b",
    lblColor:  "#047857",
  },
  warning: {
    bg:        "#fce8e8",
    iconBg:    "#f5b8b8",
    iconColor: "#D62828",
    numColor:  "#8b1a1a",
    lblColor:  "#c02020",
  },
  accent: {
    bg:        "#fef3c7",
    iconBg:    "#fde68a",
    iconColor: "#d97706",
    numColor:  "#92400e",
    lblColor:  "#b45309",
  },
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  href,
  testId,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "accent";
  href?: string;
  testId?: string;
}) {
  const { bg, iconBg, iconColor, numColor, lblColor } = TONE_CONFIG[tone];

  const card = (
    <div
      data-testid={testId}
      className={cn(
        "rounded-2xl p-5 transition-all h-full",
        href && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
      )}
      style={{ background: bg, boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.06)" }}
    >
      <div
        className="h-10 w-10 rounded-xl flex items-center justify-center mb-3"
        style={{ background: iconBg }}
      >
        <Icon className="h-5 w-5" style={{ color: iconColor }} />
      </div>
      <div className="text-4xl font-black tabular-nums" style={{ color: numColor }}>
        {value}
      </div>
      <div className="text-xs font-semibold mt-1" style={{ color: lblColor }}>
        {label}
      </div>
      {hint && (
        <div className="text-[11px] mt-0.5" style={{ color: lblColor, opacity: 0.65 }}>
          {hint}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="block h-full">{card}</Link>;
  }
  return card;
}
