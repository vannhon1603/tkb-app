"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer border-slate-300 dark:border-slate-600 bg-white dark:bg-[#161b22] data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white dark:data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 hover:border-emerald-500 dark:hover:border-emerald-500 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/25 size-5 shrink-0 rounded-full border shadow-2xs transition-all outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer flex items-center justify-center active:scale-95",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-transform duration-150 animate-in zoom-in-50"
      >
        <CheckIcon className="size-3.5 stroke-[3]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }


