import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 tracking-wide whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-border-strong bg-surface text-ink-soft",
        draft: "border-ink/15 bg-ink/5 text-ink-soft",
        published: "border-success/30 bg-success/15 text-success font-semibold",
        archived: "border-error/30 bg-error/10 text-error font-semibold",
        active: "border-success/30 bg-success-dim text-success-ink",
        inactive: "border-ink/15 bg-ink/5 text-ink-faint",
        accent: "border-accent/40 bg-accent-dim text-accent-ink",
        outline: "border-ink/20 bg-transparent text-ink-soft",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };