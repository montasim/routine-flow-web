"use client"

import * as React from "react"
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Text, View } from "@/components/ui/layout"
import {
  Empty,
  OccurrenceCard,
  AppShell,
  StatusBadge,
  addDaysClient,
  calendarDays,
  dotClass,
  sortOccurrence,
  todayLocal,
  weekdays,
  type ConfirmState,
  type Workspace,
} from "@/components/app/app-shell"
import { cn } from "@/lib/utils"

import { Skeleton } from "@/components/ui/skeleton"

export function CalendarPageClient() {
  return (
    <AppShell page="calendar">
      {(context) => {
        if (!context) return <CalendarSkeleton />
        return <CalendarPageContent workspace={context.workspace} reload={context.reload} confirm={context.confirm} />
      }}
    </AppShell>
  )
}

function CalendarSkeleton() {
  return (
    <View className="grid gap-4 md:gap-6">
      <View className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <View className="flex items-center gap-3">
          <Skeleton className="h-9 w-40" />
          <View className="flex gap-1">
            <Skeleton className="size-9 rounded-[var(--radius-md)]" />
            <Skeleton className="size-9 rounded-[var(--radius-md)]" />
          </View>
        </View>
        <View className="flex flex-wrap items-center gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-[var(--radius-md)]" />
          ))}
        </View>
      </View>
      <View className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <View className="grid min-w-[680px] grid-cols-7 overflow-hidden rounded-[var(--radius-lg)] border-l border-t border-[var(--paper-200)] bg-[var(--paper-0)]">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <View key={day} className="flex min-h-[42px] items-center border-b border-r border-[var(--paper-200)] bg-[var(--paper-100)] px-2.5">
                  <Skeleton className="h-3 w-8" />
                </View>
              ))}
              {Array.from({ length: 35 }).map((_, i) => (
                <View key={i} className="flex min-h-[120px] flex-col items-start justify-start border-b border-r border-[var(--paper-200)] p-2">
                  <Skeleton className="mb-2.5 h-4 w-5" />
                  <View className="flex flex-wrap gap-1">
                    {i % 3 !== 0 && <Skeleton className="size-[9px] rounded-full" />}
                    {i % 4 === 0 && <Skeleton className="size-[9px] rounded-full" />}
                    {i % 7 === 0 && <Skeleton className="size-[9px] rounded-full" />}
                  </View>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="mb-2 h-8 w-32" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <View key={i} className="rounded-[var(--radius-md)] border border-[var(--paper-200)] p-4">
                <View className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-[var(--radius-sm)]" />
                  <View className="grid gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </View>
                </View>
              </View>
            ))}
          </CardContent>
        </Card>
      </View>
    </View>
  )
}

function CalendarPageContent(props: { workspace: Workspace; reload: () => Promise<void>; confirm: (state: ConfirmState) => void }) {
  const [date, setDate] = React.useState("")
  const [status, setStatus] = React.useState("all")

  return <CalendarView workspace={props.workspace} date={date} setDate={setDate} status={status} setStatus={setStatus} reload={props.reload} confirm={props.confirm} />
}

function CalendarView(props: {
  workspace: Workspace
  date: string
  setDate: (date: string) => void
  status: string
  setStatus: (status: string) => void
  reload: () => Promise<void>
  confirm: (state: ConfirmState) => void
}) {
  const selected = props.date || todayLocal()
  const days = React.useMemo(() => calendarDays(selected), [selected])
  const selectedOccurrences = props.workspace.occurrences
    .filter((item) => item.date === selected && (props.status === "all" || item.status === props.status))
    .sort(sortOccurrence)
  const selectedLogs = props.workspace.logs.filter((item) => item.date === selected && (props.status === "all" || item.status === props.status))

  return (
    <View className="grid gap-6">
      <View className="flex flex-wrap items-center justify-between gap-3">
        <View className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => props.setDate(addDaysClient(selected, -30))}>
            <ChevronLeft className="size-4 text-[var(--ink-500)]" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 px-3 font-semibold text-[var(--signal-600)] hover:bg-[var(--signal-50)] hover:text-[var(--signal-600)]">
                {new Date(selected + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                <ChevronDown className="size-3.5 ml-1 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-44 max-h-[300px] overflow-y-auto">
              {Array.from({ length: 12 }, (_, i) => {
                const dateObj = new Date(selected + "T12:00:00")
                dateObj.setDate(1) // prevent month rollover
                dateObj.setMonth(dateObj.getMonth() - 5 + i)
                const monthStr = dateObj.toLocaleDateString("en-US", { month: "long", year: "numeric" })
                const isCurrent = i === 5
                return (
                  <DropdownMenuItem
                    key={i}
                    className={isCurrent ? "bg-[var(--paper-100)] font-medium" : ""}
                    onClick={() => props.setDate(dateObj.toISOString().slice(0, 10))}
                  >
                    {monthStr}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => props.setDate(addDaysClient(selected, 30))}>
            <ChevronRight className="size-4 text-[var(--ink-500)]" />
          </Button>
          <Button variant="outline" className="ml-2 h-8 px-3 text-[var(--ink-700)] font-medium" onClick={() => props.setDate(todayLocal())}>
            Today
          </Button>
        </View>
        <View className="flex flex-wrap gap-2">
          {["all", "Completed", "Pending", "Missed", "Skipped"].map((item) => {
            const isActive = props.status === item
            return (
              <Button
                key={item}
                variant="chip"
                size="chip"
                className={cn(
                  "border-0 shadow-none transition-opacity",
                  isActive ? "opacity-100 ring-1 ring-inset ring-current" : "opacity-50 hover:opacity-100",
                  item === "all" && "text-[var(--ink-700)] bg-[var(--paper-200)]",
                  item === "Completed" && "text-[var(--completed-700)] bg-[var(--completed-100)]",
                  item === "Pending" && "text-[var(--ink-500)] bg-[var(--paper-100)]",
                  item === "Missed" && "text-[var(--missed-700)] bg-[var(--missed-100)]",
                  item === "Skipped" && "text-[var(--skipped-600)] bg-[var(--skipped-100)]"
                )}
                onClick={() => props.setStatus(isActive ? "all" : item)}
              >
                {item === "all" ? "All" : item}
              </Button>
            )
          })}
        </View>
      </View>
      <View className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <View className="grid min-w-[680px] grid-cols-7 overflow-hidden rounded-[var(--radius-lg)] border-l border-t border-[var(--paper-200)] bg-[var(--paper-0)]">
              {weekdays.map((day) => (
                <View key={day} className="flex min-h-[42px] items-center border-b border-r border-[var(--paper-200)] bg-[var(--paper-100)] px-2.5 [font-family:var(--font-mono-stack)] text-[var(--text-2xs)] font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">
                  {day}
                </View>
              ))}
              {days.map((date) => {
                const statuses = [
                  ...props.workspace.occurrences.filter((item) => item.date === date).map((item) => item.status),
                  ...props.workspace.logs.filter((item) => item.date === date).map((item) => item.status),
                ].slice(0, 5)
                return (
                  <Button
                    key={date}
                    variant="calendarCell"
                    size="calendarCell"
                    data-outside={date.slice(0, 7) !== selected.slice(0, 7)}
                    data-selected={selected === date}
                    onClick={() => props.setDate(date)}
                  >
                    <Text className="mb-2.5 [font-family:var(--font-mono-stack)] text-[var(--text-xs)] font-semibold">{Number(date.slice(8, 10))}</Text>
                    <Text className="flex flex-wrap gap-1">
                      {statuses.map((status, index) => (
                        <Text key={`${date}-${status}-${index}`} className={cn("size-[9px] rounded-full", dotClass(status))} />
                      ))}
                    </Text>
                  </Button>
                )
              })}
            </View>
          </CardContent>
        </Card>
        <Card className="motion-card">
          <CardHeader>
            <CardTitle className="text-2xl tracking-tight">
              {new Date(selected + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </CardTitle>
            <CardDescription>Generated occurrences and finalized logs for the selected local date.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {selectedOccurrences.map((occurrence) => (
              <OccurrenceCard key={occurrence.id} workspace={props.workspace} occurrence={occurrence} reload={props.reload} confirm={props.confirm} />
            ))}
            {selectedLogs.map((log) => (
              <Card key={log.id} variant="outlined" size="sm" className="motion-card">
                <CardContent className="flex items-center justify-between gap-4 pt-(--card-spacing)">
                  <View>
                    <View className="font-semibold">{log.routineTitleAtLog}</View>
                    <View className="[font-family:var(--font-mono-stack)] text-[var(--text-xs)] text-[var(--ink-500)]">{log.scheduledTime}</View>
                  </View>
                  <StatusBadge status={log.status} delay={log.delayMinutes} />
                </CardContent>
              </Card>
            ))}
            {!selectedOccurrences.length && !selectedLogs.length && <Empty icon={CalendarDays} text="No occurrences or logs on this date." />}
          </CardContent>
        </Card>
      </View>
    </View>
  )
}
