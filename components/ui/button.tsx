import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-transparent bg-clip-padding font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)] outline-none select-none focus-visible:ring-0 active:not-aria-[haspopup]:scale-[0.97] motion-reduce:transition-none motion-reduce:transform-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-[var(--missed-600)] aria-invalid:ring-3 aria-invalid:ring-[rgba(216,58,63,0.2)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--paper-0)] text-[var(--ink-900)] [box-shadow:var(--ring-hairline)] hover:-translate-y-px hover:bg-[var(--paper-100)] hover:[box-shadow:var(--shadow-button-ring)]",
        primary:
          "bg-[var(--action-primary-bg)] text-[var(--action-foreground)] [box-shadow:none] hover:-translate-y-px hover:bg-[var(--action-primary-hover-bg)] hover:[box-shadow:var(--shadow-button)]",
        success:
          "bg-[var(--action-success-bg)] text-[var(--action-foreground)] [box-shadow:none] hover:-translate-y-px hover:bg-[var(--action-success-hover-bg)] hover:[box-shadow:var(--shadow-button)]",
        warning:
          "bg-[var(--skipped-100)] text-[var(--skipped-600)] [box-shadow:none] hover:-translate-y-px hover:bg-[var(--skipped-200)] hover:[box-shadow:var(--shadow-button)]",
        danger:
          "bg-[var(--action-danger-bg)] text-[var(--action-foreground)] [box-shadow:none] hover:-translate-y-px hover:bg-[var(--action-danger-hover-bg)] hover:[box-shadow:var(--shadow-button)]",
        outline:
          "bg-[var(--paper-0)] text-[var(--ink-900)] [box-shadow:var(--ring-hairline)] hover:-translate-y-px hover:bg-[var(--paper-100)] hover:[box-shadow:var(--shadow-button-ring)] aria-expanded:bg-[var(--paper-100)] aria-expanded:text-[var(--ink-900)]",
        secondary:
          "bg-[var(--paper-100)] text-[var(--ink-500)] hover:-translate-y-px hover:bg-[var(--paper-200)] hover:[box-shadow:var(--shadow-button)] aria-expanded:bg-[var(--paper-100)] aria-expanded:text-[var(--ink-900)]",
        ghost:
          "bg-transparent text-[var(--ink-500)] hover:bg-[var(--paper-100)] hover:text-[var(--ink-900)] aria-expanded:bg-[var(--paper-100)] aria-expanded:text-[var(--ink-900)]",
        nav:
          "w-full justify-start bg-transparent text-[var(--ink-500)] [box-shadow:none] hover:translate-x-0.5 hover:bg-[var(--paper-100)] hover:text-[var(--ink-900)] data-[active=true]:bg-[var(--signal-50)] data-[active=true]:font-semibold data-[active=true]:text-[var(--signal-600)] data-[active=true]:hover:bg-[var(--signal-50)] data-[active=true]:hover:text-[var(--signal-600)]",
        avatar:
          "rounded-[var(--radius-pill)] bg-[var(--avatar-bg)] text-[var(--avatar-foreground)] [box-shadow:var(--ring-hairline)] hover:-translate-y-px hover:bg-[var(--avatar-hover-bg)] hover:[box-shadow:var(--shadow-button-ring)]",
        chip:
          "rounded-[var(--radius-md)] bg-[var(--paper-100)] [font-family:var(--font-mono-stack)] font-medium text-[var(--ink-500)] [box-shadow:none] hover:-translate-y-px hover:bg-[var(--paper-100)] hover:[box-shadow:inset_0_0_0_1px_currentColor,var(--shadow-button)] active:not-aria-[haspopup]:scale-[0.97] data-[active=true]:font-semibold data-[active=true]:[box-shadow:inset_0_0_0_1.5px_currentColor]",
        calendarCell:
          "rounded-none border-b border-r border-[var(--paper-200)] bg-[var(--paper-0)] text-left [box-shadow:none] hover:bg-[var(--paper-50)] hover:[box-shadow:inset_0_0_0_1px_var(--paper-300)] active:scale-100 data-[outside=true]:bg-[var(--paper-50)] data-[outside=true]:text-[var(--ink-300)] data-[outside=true]:hover:bg-[var(--paper-50)] data-[selected=true]:relative data-[selected=true]:z-10 data-[selected=true]:[box-shadow:inset_0_0_0_2px_var(--signal-500)]",
        destructive:
          "bg-[var(--action-danger-bg)] text-[var(--action-foreground)] [box-shadow:none] hover:-translate-y-px hover:bg-[var(--action-danger-hover-bg)] hover:[box-shadow:var(--shadow-button)] focus-visible:border-[var(--missed-600)] focus-visible:ring-[rgba(216,58,63,0.2)]",
        link: "text-[var(--signal-600)] underline-offset-4 hover:underline",
      },
      size: {
        default:
          "min-h-10 px-4 py-2 [font-size:var(--text-sm)] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "min-h-7 gap-1 rounded-[var(--radius-sm)] px-2 py-1 [font-size:var(--text-xs)] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "min-h-8 gap-1.5 rounded-[var(--radius-md)] px-2.5 py-1.5 [font-size:var(--text-xs)] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "min-h-[46px] gap-2 px-3.5 py-2.5 [font-size:var(--text-sm)] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-10 p-0",
        "icon-xs":
          "size-7 rounded-[var(--radius-sm)] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-[var(--radius-md)]",
        "icon-lg": "size-10",
        nav: "min-h-10 gap-3 px-3 py-2 [font-size:var(--text-sm)]",
        avatar: "size-10 p-0 [font-size:var(--text-md)]",
        chip: "min-h-8 gap-2 px-3 py-1.5 [font-size:var(--text-xs)]",
        calendarCell:
          "min-h-28 flex-col items-start justify-start p-2.5 [font-size:var(--text-sm)]",
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
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
