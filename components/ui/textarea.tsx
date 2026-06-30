import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-[var(--radius-md)] border-[1.5px] border-[var(--paper-300)] bg-[var(--paper-0)] px-3 py-2 text-[var(--text-md)] text-[var(--ink-900)] transition-[border-color,box-shadow,background-color,color] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)] outline-none placeholder:text-[var(--ink-400)] hover:border-[var(--paper-400)] hover:[box-shadow:0_0_0_3px_rgba(22,24,29,0.035)] focus-visible:border-[var(--signal-500)] focus-visible:[box-shadow:var(--ring-focus)] focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-[var(--paper-100)] disabled:opacity-60 aria-invalid:border-[var(--missed-600)] aria-invalid:ring-3 aria-invalid:ring-[rgba(216,58,63,0.2)]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
