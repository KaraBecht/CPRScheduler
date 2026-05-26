import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const toneClasses = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    accent: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
  }[tone];
  return (
    <Card data-testid={testId}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              {label}
            </div>
            <div className="text-3xl font-bold mt-1 tabular-nums">{value}</div>
            {hint && (
              <div className="text-xs text-muted-foreground mt-1">{hint}</div>
            )}
          </div>
          <div
            className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center",
              toneClasses,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
