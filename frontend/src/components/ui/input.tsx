import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-slate-400 border-[#d0d7de] dark:border-[#30363d] bg-white dark:bg-[#161b22] text-[#24292f] dark:text-[#c9d1d9] h-8.5 w-full min-w-0 rounded-lg border px-3 py-1.5 text-xs shadow-2xs transition-all duration-150 ease-out outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-xs file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }

