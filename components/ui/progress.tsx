"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative flex h-2 w-full items-center overflow-x-hidden rounded-[var(--radius-pill)] bg-[var(--paper-100)]",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        data-complete={value === 100}
        className="size-full flex-1 bg-[var(--signal-500)] transition-[transform,opacity,background-color] duration-[var(--motion-duration-default)] ease-[var(--motion-ease-standard)] data-[complete=false]:opacity-80"
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
