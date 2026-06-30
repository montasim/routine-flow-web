import * as React from "react"

import { cn } from "@/lib/utils"

export function View(props: React.ComponentPropsWithoutRef<"div">) {
  return <div {...props} />
}

export function Text(props: React.ComponentPropsWithoutRef<"span">) {
  return <span {...props} />
}

export function AppMain(props: React.ComponentPropsWithoutRef<"main">) {
  return <main {...props} />
}

export function AppSection(props: React.ComponentPropsWithoutRef<"section">) {
  return <section {...props} />
}

export function AppAside(props: React.ComponentPropsWithoutRef<"aside">) {
  return <aside {...props} />
}

export function AppHeader(props: React.ComponentPropsWithoutRef<"header">) {
  return <header {...props} />
}

export function AppNav(props: React.ComponentPropsWithoutRef<"nav">) {
  return <nav {...props} />
}

export function Heading1({ className, ...props }: React.ComponentPropsWithoutRef<"h1">) {
  return (
    <h1
      className={cn(
        "[font-family:var(--font-display-stack)] [font-size:var(--text-2xl)] leading-[1.1] font-bold tracking-normal",
        className
      )}
      {...props}
    />
  )
}

export function Heading2({ className, ...props }: React.ComponentPropsWithoutRef<"h2">) {
  return (
    <h2
      className={cn(
        "[font-family:var(--font-display-stack)] [font-size:var(--text-2xl)] leading-tight font-bold tracking-normal",
        className
      )}
      {...props}
    />
  )
}

export function Paragraph({ className, ...props }: React.ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className={cn(
        "[font-size:var(--text-sm)] leading-[1.45] text-[var(--ink-500)]",
        className
      )}
      {...props}
    />
  )
}

export function StrongText({ className, ...props }: React.ComponentPropsWithoutRef<"strong">) {
  return <strong className={cn("font-semibold", className)} {...props} />
}

export function LineBreak() {
  return <br />
}
