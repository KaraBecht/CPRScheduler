import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE_CONFIG = {
  primary:  { icon: "bg-primary/10 text-primary",           border: "#0d9488" },
  success:  { icon: "bg-emerald-500/10 text-emerald-600",   border: "#059669" },
  warning:  { icon: "bg-amber-500/10 text-amber-500",       border: "#f59e0b" },
  accent:   { icon: "bg-fuchsia-500/10 text-fuchsia-500",   border: "#d946ef" },
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  testId,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "accent";
  testId?: string;
}) {
  const { icon: iconClass, border } = TONE_CONFIG[tone];
  return (
    <Card
      data-testid={testId}
      className="shadow-sm overflow-hidden"
      style={{ borderTop: `4px solid ${border}` }}
    >
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">
              {label}
            </div>
            <div className="text-3xl font-bold mt-1.5 tabular-nums">{value}</div>
            {hint && (
              <div className="text-xs text-muted-foreground mt-1">{hint}</div>
            )}
          </div>
          <div
            className={cn(
              "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
              iconClass,
            )}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
