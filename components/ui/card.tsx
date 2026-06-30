import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "group/card flex flex-col overflow-hidden bg-[var(--paper-0)] [font-size:var(--text-sm)] text-[var(--ink-900)] transition-[background-color,border-color,box-shadow,transform,opacity] duration-[var(--motion-duration-default)] ease-[var(--motion-ease-standard)] motion-reduce:transition-none",
  {
    variants: {
      variant: {
        default: "rounded-[var(--radius-lg)] [box-shadow:var(--ring-hairline)]",
        outlined:
          "rounded-[var(--radius-md)] border border-[var(--paper-200)] [box-shadow:none]",
        dark:
          "rounded-[var(--radius-lg)] border-0 bg-[var(--ink-900)] text-white [box-shadow:none]",
        darkInset:
          "rounded-[var(--radius-md)] border border-white/15 bg-white/5 text-white [box-shadow:none]",
      },
      size: {
        default: "[--card-spacing:var(--space-6)]",
        sm: "[--card-spacing:var(--space-4)]",
        metric: "min-h-[132px] [--card-spacing:var(--space-5)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Card({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      data-size={size}
      className={cn(cardVariants({ variant, size }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header flex flex-col px-(--card-spacing) pt-(--card-spacing) pb-4",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "[font-family:var(--font-display-stack)] [font-size:var(--text-xl)] leading-tight font-semibold tracking-normal group-data-[size=sm]/card:[font-size:var(--text-lg)]",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-description" className={cn("mt-1 [font-size:var(--text-sm)] leading-[1.45] text-[var(--ink-500)]", className)} {...props} />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing) pb-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-[var(--radius-lg)] border-t border-[var(--paper-200)] bg-[var(--paper-100)] p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
}
