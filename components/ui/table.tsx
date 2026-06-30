"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto rounded-[var(--radius-lg)] bg-[var(--paper-0)] [box-shadow:var(--ring-hairline)]"
    >
      <table
        data-slot="table"
        className={cn("w-full min-w-[760px] caption-bottom border-collapse text-[var(--text-sm)]", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b [&_tr]:border-[var(--paper-200)]", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-[var(--paper-200)] bg-[var(--paper-100)] font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-[var(--paper-200)] transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)] hover:bg-[var(--paper-50)] has-aria-expanded:bg-[var(--paper-50)] data-[state=selected]:bg-[var(--paper-100)]",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-auto px-4 py-3 text-left align-middle [font-family:var(--font-mono-stack)] text-[var(--text-2xs)] font-semibold tracking-[0.08em] whitespace-nowrap text-[var(--ink-500)] uppercase [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

const tableCellVariants = cva(
  "px-4 py-3 align-middle whitespace-nowrap text-[var(--text-sm)] [&:has([role=checkbox])]:pr-0",
  {
    variants: {
      variant: {
        default: "",
        mono: "[font-family:var(--font-mono-stack)] tabular-nums",
        strong: "font-semibold text-[var(--ink-900)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TableCell({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"td"> & VariantProps<typeof tableCellVariants>) {
  return (
    <td
      data-slot="table-cell"
      data-variant={variant}
      className={cn(tableCellVariants({ variant }), className)}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-[var(--text-sm)] text-[var(--ink-500)]", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  tableCellVariants,
}
