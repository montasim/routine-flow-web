import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex min-h-8 w-fit shrink-0 items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-md)] border border-transparent px-3 py-1.5 [font-family:var(--font-mono-stack)] [font-size:var(--text-xs)] font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,opacity] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)] focus-visible:border-[var(--signal-500)] focus-visible:ring-[3px] focus-visible:ring-[rgba(62,99,255,0.28)] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-invalid:border-[var(--missed-600)] aria-invalid:ring-[rgba(216,58,63,0.2)] [&>svg]:pointer-events-none [&>svg]:size-3.5!",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--paper-100)] text-[var(--ink-500)] [a]:hover:bg-[var(--paper-200)]",
        signal:
          "bg-[var(--signal-50)] text-[var(--signal-600)] [a]:hover:bg-[var(--signal-50)]",
        completed:
          "bg-[var(--completed-100)] text-[var(--completed-600)] [a]:hover:bg-[var(--completed-100)]",
        pending:
          "bg-[var(--pending-100)] text-[var(--pending-600)] [a]:hover:bg-[var(--pending-100)]",
        missed:
          "bg-[var(--missed-100)] text-[var(--missed-600)] [a]:hover:bg-[var(--missed-100)]",
        skipped:
          "bg-[var(--skipped-100)] text-[var(--skipped-600)] [a]:hover:bg-[var(--skipped-100)]",
        time:
          "min-h-8 min-w-[58px] rounded-[var(--radius-sm)] bg-[var(--paper-100)] px-2 [font-size:var(--text-xs)] font-semibold text-[var(--ink-500)] tabular-nums",
        statusCompleted:
          "min-h-7 gap-1.5 bg-[var(--completed-100)] px-2 py-1 [font-size:var(--text-2xs)] font-semibold tracking-[0.08em] text-[var(--completed-600)] uppercase [a]:hover:bg-[var(--completed-100)]",
        statusPending:
          "min-h-7 gap-1.5 bg-[var(--pending-100)] px-2 py-1 [font-size:var(--text-2xs)] font-semibold tracking-[0.08em] text-[var(--pending-600)] uppercase [a]:hover:bg-[var(--pending-100)]",
        statusMissed:
          "min-h-7 gap-1.5 bg-[var(--missed-100)] px-2 py-1 [font-size:var(--text-2xs)] font-semibold tracking-[0.08em] text-[var(--missed-600)] uppercase [a]:hover:bg-[var(--missed-100)]",
        statusSkipped:
          "min-h-7 gap-1.5 bg-[var(--skipped-100)] px-2 py-1 [font-size:var(--text-2xs)] font-semibold tracking-[0.08em] text-[var(--skipped-600)] uppercase [a]:hover:bg-[var(--skipped-100)]",
        statusActive:
          "min-h-7 gap-1.5 bg-[var(--completed-100)] px-2 py-1 [font-size:var(--text-2xs)] font-semibold tracking-[0.08em] text-[var(--completed-600)] uppercase [a]:hover:bg-[var(--completed-100)]",
        statusInactive:
          "min-h-7 gap-1.5 bg-[var(--skipped-100)] px-2 py-1 [font-size:var(--text-2xs)] font-semibold tracking-[0.08em] text-[var(--skipped-600)] uppercase [a]:hover:bg-[var(--skipped-100)]",
        statusDeleted:
          "min-h-7 gap-1.5 bg-[var(--missed-100)] px-2 py-1 [font-size:var(--text-2xs)] font-semibold tracking-[0.08em] text-[var(--missed-600)] uppercase [a]:hover:bg-[var(--missed-100)]",
        secondary:
          "bg-[var(--paper-100)] text-[var(--ink-500)] [a]:hover:bg-[var(--paper-200)]",
        destructive:
          "bg-[var(--missed-100)] text-[var(--missed-600)] focus-visible:ring-[rgba(216,58,63,0.2)] [a]:hover:bg-[var(--missed-100)]",
        outline:
          "bg-[var(--paper-0)] text-[var(--ink-700)] [box-shadow:var(--ring-hairline)] [a]:hover:bg-[var(--paper-100)] [a]:hover:text-[var(--ink-900)]",
        ghost:
          "hover:bg-[var(--paper-100)] hover:text-[var(--ink-900)]",
        link: "text-[var(--signal-600)] underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
