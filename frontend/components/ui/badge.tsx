import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",

        // Dark theme variants
        yes: "border-transparent bg-trading-yes text-white shadow-sm shadow-trading-yes/20",
        no: "border-transparent bg-trading-no text-white shadow-sm shadow-trading-no/20",
        pending: "border-transparent bg-trading-neutral text-white",
        success: "border-transparent bg-status-success text-white",
        warning: "border-transparent bg-status-warning text-white",
        error: "border-transparent bg-status-error text-white",
        info: "border-transparent bg-status-info text-white",
        dark: "border-border-default bg-surface-elevated text-text-primary",
        darkOutline: "border-border-interactive bg-transparent text-text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
