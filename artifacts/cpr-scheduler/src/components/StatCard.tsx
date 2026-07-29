import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Medical palette soft-fill tones
const TONE_CONFIG = {
  primary: {
    bg:        "#e6f4fa",
    iconBg:    "#b3dced",
    iconColor: "#007BA7",
    numColor:  "#005678",
    lblColor:  "#00698a",
  },
  success: {
    bg:        "#eaf7ea",
    iconBg:    "#b9e5bb",
    iconColor: "#4CAF50",
    numColor:  "#2d7a2f",
    lblColor:  "#388e3c",
  },
  warning: {
    bg:        "#fce8e8",
    iconBg:    "#f5b8b8",
    iconColor: "#D62828",
    numColor:  "#8b1a1a",
    lblColor:  "#c02020",
  },
  accent: {
    bg:        "#e0f2f2",
    iconBg:    "#a3d9d9",
    iconColor: "#008080",
    numColor:  "#005555",
    lblColor:  "#006666",
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
