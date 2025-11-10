import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "selection:bg-accent selection:text-accent-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background min-h-[96px] w-full min-w-0 rounded-lg border border-border/60 bg-[var(--input-background,#FFFFFF)] px-4 py-3 text-sm text-foreground shadow-[0_1px_2px_rgba(31,31,31,0.06)] transition-[border-color,box-shadow,color] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
          className
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
