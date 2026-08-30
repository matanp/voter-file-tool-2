import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const pageContainerVariants = cva("mx-auto p-4", {
  variants: {
    width: {
      default: "max-w-6xl",
      wide: "max-w-screen-2xl",
    },
  },
  defaultVariants: {
    width: "default",
  },
});

export interface PageContainerProps
  extends VariantProps<typeof pageContainerVariants> {
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard page wrapper: full-bleed background with a centred, width-capped
 * content column. Use `width="wide"` for pages with side-by-side content that
 * would be cramped at the default cap.
 */
export function PageContainer({
  children,
  width,
  className,
}: PageContainerProps) {
  return (
    <div className="w-full min-h-screen bg-primary-foreground">
      <div className={cn(pageContainerVariants({ width }), className)}>
        {children}
      </div>
    </div>
  );
}
