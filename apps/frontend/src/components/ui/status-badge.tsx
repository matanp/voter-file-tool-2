import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

/**
 * The app's one status vocabulary. Amber (`warning`) is pending or needs attention, red
 * (`danger`) is failed or destructive, emerald (`success`) is done, blue (`info`) is in
 * progress. Use `neutral` for anything that isn't a status, such as a privilege or a type.
 * Always pass a human label, never a raw enum.
 */
const statusBadgeVariants = cva(
  "inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        success: "bg-success-bg text-success-fg",
        warning: "bg-warning-bg text-warning-fg",
        danger: "bg-danger-bg text-danger-fg",
        info: "bg-info-bg text-info-fg",
        neutral: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export type StatusTone = NonNullable<
  VariantProps<typeof statusBadgeVariants>["tone"]
>;

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  /** Leading icon; mark it aria-hidden. */
  icon?: React.ReactNode;
  /** Trailing number, for count chips such as "2 pending". */
  count?: number;
}

function StatusBadge({
  tone,
  icon,
  count,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ tone }), className)} {...props}>
      {icon}
      {count !== undefined && <span className="tabular-nums">{count}</span>}
      {children}
    </span>
  );
}

export { StatusBadge, statusBadgeVariants };
