"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-[var(--radius-xs)] border-[1.5px] border-[var(--paper-300)] bg-[var(--paper-0)] transition-[border-color,background-color,box-shadow,color] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)] outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 hover:border-[var(--paper-400)] focus-visible:border-[var(--signal-500)] focus-visible:ring-3 focus-visible:ring-[rgba(62,99,255,0.28)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--missed-600)] aria-invalid:ring-3 aria-invalid:ring-[rgba(216,58,63,0.2)] aria-invalid:aria-checked:border-[var(--signal-500)] data-[state=checked]:border-[var(--signal-500)] data-[state=checked]:bg-[var(--signal-500)] data-[state=checked]:text-white",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-transform duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)] data-[state=checked]:scale-100 [&>svg]:size-3.5"
      >
        <Check />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
