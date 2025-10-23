import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold tracking-tight transition-[transform,box-shadow,background-color,color] duration-150 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] aria-invalid:ring-destructive/25 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow-card)] hover:bg-primary/90 hover:shadow-[var(--shadow-elevated)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[var(--shadow-card)] hover:bg-destructive/90 hover:shadow-[var(--shadow-elevated)] focus-visible:ring-destructive/35",
        outline:
          "border border-border/70 bg-card text-foreground shadow-[var(--shadow-card)] hover:bg-muted/40 hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[var(--shadow-card)] hover:bg-secondary/85",
        ghost:
          "bg-transparent text-primary/80 shadow-none hover:bg-muted/30 hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 rounded-lg px-5 py-2 has-[>svg]:px-4",
        sm: "h-9 rounded-lg gap-1.5 px-3.5 has-[>svg]:px-3",
        lg: "h-11 rounded-xl px-6 has-[>svg]:px-5 text-[0.9375rem]",
        icon: "size-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
