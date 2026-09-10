import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-xs font-medium transition-all duration-150 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:transform-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-700/20 shadow-xs hover:shadow-emerald-600/20 active:bg-emerald-800",
        success:
          "bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-700/20 shadow-xs hover:shadow-emerald-600/20 active:bg-emerald-800",
        destructive:
          "bg-[#cf222e] text-white hover:bg-[#da3637] border border-[rgba(27,31,36,0.1)] shadow-xs hover:shadow-red-600/20 dark:bg-[#da3637] dark:hover:bg-[#f85149] dark:border-[rgba(240,246,252,0.1)]",
        outline:
          "bg-white text-[#24292f] border border-[#d0d7de] shadow-2xs hover:bg-[#f6f8fa] hover:border-slate-300 dark:bg-[#161b22] dark:text-[#c9d1d9] dark:border-[#30363d] dark:hover:bg-[#21262d]",
        secondary:
          "bg-[#f6f8fa] text-[#24292f] border border-[#d0d7de]/50 hover:bg-[#e8ebed] dark:bg-[#21262d] dark:text-[#c9d1d9] dark:hover:bg-[#30363d] dark:border-[#30363d]/50",
        ghost:
          "hover:bg-[#f3f4f6] text-slate-600 hover:text-[#24292f] hover:shadow-none dark:hover:bg-[#21262d] dark:text-slate-300 dark:hover:text-[#c9d1d9]",
        link: "text-emerald-600 dark:text-emerald-400 underline-offset-4 hover:underline hover:shadow-none",
      },
      size: {
        default: "h-8.5 px-3 py-1.5 text-xs rounded-lg",
        sm: "h-7.5 px-2.5 py-1 text-xs rounded-md",
        lg: "h-9.5 text-sm rounded-lg px-4",
        icon: "size-8 rounded-lg",
        "icon-sm": "size-7 rounded-md",
        "icon-lg": "size-9 rounded-lg",
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
