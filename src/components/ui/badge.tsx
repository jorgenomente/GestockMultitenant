import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wide w-fit whitespace-nowrap shrink-0 gap-1 [&>svg]:pointer-events-none [&>svg]:size-3 focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/25 aria-invalid:border-destructive transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-accent/40 bg-accent/25 text-accent-foreground",
        secondary:
          "border-secondary/45 bg-secondary/25 text-secondary-foreground",
        destructive:
          "border-destructive/35 bg-destructive/15 text-destructive",
        outline:
          "border-border/70 text-foreground",
        muted:
          "border-muted/40 bg-muted/25 text-muted-foreground",
        ghost:
          "border-transparent bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
