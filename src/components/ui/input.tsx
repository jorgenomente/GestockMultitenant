import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-accent selection:text-accent-foreground flex h-10 w-full min-w-0 rounded-lg border border-border/60 bg-[var(--input-background,#FFFFFF)] px-4 py-2 text-sm text-foreground shadow-[0_1px_2px_rgba(31,31,31,0.06)] transition-[border-color,box-shadow,color] outline-none file:inline-flex file:h-7 file:rounded-md file:border-0 file:bg-muted/40 file:px-3 file:text-xs file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/25",
        className
      )}
      {...props}
    />
  )
}

export { Input }
