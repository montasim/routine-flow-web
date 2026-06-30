"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      {...props}
      toastOptions={{
        classNames: {
          toast:
            "rounded-[var(--radius-lg)] border-0 bg-[var(--paper-0)] text-[var(--ink-900)] shadow-[var(--shadow-pop)]",
          title:
            "[font-family:var(--font-display-stack)] text-[var(--text-sm)] font-semibold text-[var(--ink-900)]",
          description: "text-[var(--text-sm)] text-[var(--ink-500)]",
          actionButton:
            "rounded-[var(--radius-md)] bg-[var(--signal-500)] px-3 py-2 text-[var(--text-xs)] font-semibold text-white",
          cancelButton:
            "rounded-[var(--radius-md)] bg-[var(--paper-100)] px-3 py-2 text-[var(--text-xs)] font-semibold text-[var(--ink-700)]",
        },
        ...props.toastOptions,
      }}
    />
  )
}

export { Toaster }
