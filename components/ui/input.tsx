import * as React from "react"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  variant = "default",
  ...props
}: React.ComponentProps<"input"> & {
  variant?: "default" | "mono"
}) {
  return (
    <input
      type={type}
      data-slot="input"
      data-variant={variant}
      className={cn(
        "min-h-10 w-full min-w-0 rounded-[var(--radius-md)] border-[1.5px] border-[var(--paper-300)] bg-[var(--paper-0)] px-3 py-2 text-[var(--text-md)] text-[var(--ink-900)] transition-[border-color,box-shadow,background-color,color] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)] outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--ink-900)] placeholder:text-[var(--ink-400)] hover:border-[var(--paper-400)] hover:[box-shadow:0_0_0_3px_rgba(22,24,29,0.035)] focus-visible:border-[var(--signal-500)] focus-visible:[box-shadow:var(--ring-focus)] focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--paper-100)] disabled:opacity-60 aria-invalid:border-[var(--missed-600)] aria-invalid:ring-3 aria-invalid:ring-[rgba(216,58,63,0.2)]",
        variant === "mono" && "[font-family:var(--font-mono-stack)] tabular-nums",
        className
      )}
      {...props}
    />
  )
}

export { Input }
