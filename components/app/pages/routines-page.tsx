"use client"

import * as React from "react"
import { Pen, Plus, Power, Search, Trash } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { View, Text } from "@/components/ui/layout"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AppShell,
  StatusBadge,
  Toolbar,
  api,
  categoryName,
  recurrenceLabel,
  reminderLabel,
  type ConfirmState,
  type Workspace,
} from "@/components/app/app-shell"
import type { Routine } from "@/lib/types"
import { cn } from "@/lib/utils"

import { Skeleton } from "@/components/ui/skeleton"

export function RoutinesPageClient() {
  return (
    <AppShell page="routines">
      {(context) => {
        if (!context) return <RoutinesSkeleton />
        return <RoutinesPageContent workspace={context.workspace} reload={context.reload} confirm={context.confirm} openRoutine={context.openRoutine} />
      }}
    </AppShell>
  )
}

function RoutinesSkeleton() {
  return (
    <View className="grid gap-6">
      <Toolbar>
        <View className="flex w-full min-w-0 flex-wrap items-center gap-3 sm:flex-1">
          <Skeleton className="h-10 w-full rounded-[var(--radius-md)] sm:w-[260px] sm:flex-none" />
          <Skeleton className="h-10 w-[140px] rounded-[var(--radius-md)]" />
        </View>
        <Skeleton className="h-10 w-full rounded-[var(--radius-md)] sm:w-[130px]" />
      </Toolbar>
      <View className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-4">
              <View className="flex items-start justify-between gap-3">
                <View className="flex flex-col gap-2 w-full">
                  <Skeleton className="h-6 w-3/4" />
                  <View className="flex items-center gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </View>
                </View>
              </View>
            </CardHeader>
            <CardContent className="grid gap-4">
              <View className="grid grid-cols-2 rounded-[var(--radius-md)] border border-[var(--paper-200)] bg-[var(--paper-0)] overflow-hidden">
                <View className="p-3 border-r border-b border-[var(--paper-200)]">
                  <Skeleton className="mb-1.5 h-3 w-16" />
                  <Skeleton className="h-5 w-12" />
                </View>
                <View className="p-3 border-b border-[var(--paper-200)]">
                  <Skeleton className="mb-1.5 h-3 w-16" />
                  <Skeleton className="h-5 w-24" />
                </View>
                <View className="p-3 col-span-2">
                  <Skeleton className="mb-1.5 h-3 w-24" />
                  <Skeleton className="h-5 w-48" />
                </View>
              </View>
              <View className="flex items-center gap-2">
                <Skeleton className="h-9 flex-1 rounded-[var(--radius-md)]" />
                <Skeleton className="h-9 flex-1 rounded-[var(--radius-md)]" />
                <Skeleton className="size-9 shrink-0 rounded-[var(--radius-md)]" />
              </View>
            </CardContent>
          </Card>
        ))}
      </View>
    </View>
  )
}

function RoutinesPageContent(props: {
  workspace: Workspace
  openRoutine: (routine: Routine | "new") => void
  confirm: (state: ConfirmState) => void
  reload: () => Promise<void>
}) {
  const [search, setSearch] = React.useState("")
  const [filter, setFilter] = React.useState("Active")

  return <RoutinesView workspace={props.workspace} search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} openRoutine={props.openRoutine} confirm={props.confirm} reload={props.reload} />
}

function RoutinesView(props: {
  workspace: Workspace
  search: string
  setSearch: (value: string) => void
  filter: string
  setFilter: (value: string) => void
  openRoutine: (routine: Routine | "new") => void
  confirm: (state: ConfirmState) => void
  reload: () => Promise<void>
}) {
  const [deletingIds, setDeletingIds] = React.useState<string[]>([])

  const rows = props.workspace.routines
    .filter((routine) => `${routine.title} ${categoryName(props.workspace, routine.categoryId)}`.toLowerCase().includes(props.search.toLowerCase()))
    .filter((routine) => {
      if (props.filter === "Active") return routine.isActive && !routine.isDeleted
      if (props.filter === "Inactive") return !routine.isActive && !routine.isDeleted
      if (props.filter === "Deleted") return routine.isDeleted
      return true
    })
    .sort((a, b) => Number(a.isDeleted) - Number(b.isDeleted) || a.scheduledTime.localeCompare(b.scheduledTime))

  return (
    <View className="grid gap-6">
      <Toolbar>
        <View className="flex w-full min-w-0 flex-wrap items-center gap-3 sm:flex-1">
          <View className="relative min-w-[220px] flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ink-500)]" />
            <Input className="w-full pl-9 sm:w-[260px]" placeholder="Search routines" value={props.search} onChange={(event) => props.setSearch(event.target.value)} />
          </View>
          <Select value={props.filter} onValueChange={props.setFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All routines</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Deleted">Deleted</SelectItem>
            </SelectContent>
          </Select>
        </View>
        <Button variant="primary" className="w-full justify-center sm:w-auto" onClick={() => props.openRoutine("new")}>
          <Plus className="size-4" />
          New routine
        </Button>
      </Toolbar>
      {rows.length === 0 ? (
        <View className="motion-reveal flex min-h-[400px] flex-col items-center justify-center rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--paper-200)] bg-transparent p-8 text-center">
          <View className="mb-4 flex size-16 items-center justify-center rounded-full bg-[var(--paper-100)]">
            <Search className="size-7 text-[var(--ink-500)]" strokeWidth={1.5} />
          </View>
          <Text className="mb-2 text-[var(--text-lg)] font-semibold text-[var(--ink-900)]">No routines found</Text>
          <Text className="mb-6 max-w-[320px] text-[var(--text-sm)] text-[var(--ink-500)] leading-relaxed">
            Get started by creating a new routine or adjust your search filters to find what you&apos;re looking for.
          </Text>
          <Button variant="primary" onClick={() => props.openRoutine("new")}>
            <Plus className="size-4" />
            New routine
          </Button>
        </View>
      ) : (
        <View className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((routine) => (
            <Card key={routine.id} className={cn("motion-card group relative", routine.isDeleted && "opacity-60", deletingIds.includes(routine.id) && "opacity-50 pointer-events-none")}>
              <CardHeader className="pb-4">
                <View className="flex items-start justify-between gap-3">
                  <View className="flex flex-col gap-2">
                    <CardTitle>{routine.title}</CardTitle>
                    <View className="flex items-center gap-2">
                      {(() => {
                        const catName = categoryName(props.workspace, routine.categoryId)
                        const catColors = (() => {
                          switch (catName) {
                            case "Fitness": return "text-[var(--completed-600)] bg-[var(--completed-600)]"
                            case "Health": return "text-[var(--signal-600)] bg-[var(--signal-600)]"
                            case "Mind": return "text-[var(--skipped-600)] bg-[var(--skipped-600)]"
                            case "Personal": return "text-[var(--missed-600)] bg-[var(--missed-600)]"
                            default: return "text-[var(--ink-700)] bg-[var(--ink-700)]"
                          }
                        })()
                        const textColor = catColors.split(' ')[0]
                        const bgColor = catColors.split(' ')[1]
                        return (
                          <View className={cn("flex items-center gap-1.5 text-[var(--text-xs)] font-medium", textColor)}>
                            <View className={cn("size-1.5 rounded-full", bgColor)} />
                            {catName}
                          </View>
                        )
                      })()}
                      <StatusBadge status={routine.isDeleted ? "Deleted" : routine.isActive ? "Active" : "Inactive"} />
                    </View>
                  </View>
                </View>
              </CardHeader>
              <CardContent className="grid gap-4">
                <View className="grid grid-cols-2 rounded-[var(--radius-md)] border border-[var(--paper-200)] bg-[var(--paper-0)] overflow-hidden">
                  <View className="p-3 border-r border-b border-[var(--paper-200)]">
                    <Text className="text-[var(--text-2xs)] font-semibold uppercase tracking-wider text-[var(--ink-400)] mb-1.5 block">Schedule</Text>
                    <Text className="font-semibold text-[var(--ink-900)] text-[var(--text-sm)]">{routine.scheduledTime}</Text>
                  </View>
                  <View className="p-3 border-b border-[var(--paper-200)]">
                    <Text className="text-[var(--text-2xs)] font-semibold uppercase tracking-wider text-[var(--ink-400)] mb-1.5 block">Reminder</Text>
                    <Text className="font-semibold text-[var(--ink-900)] text-[var(--text-sm)]">{reminderLabel(routine.reminderOverride ?? props.workspace.settings.defaultReminderMinutes)}</Text>
                  </View>
                  <View className="p-3 border-r border-[var(--paper-200)]">
                    <Text className="text-[var(--text-2xs)] font-semibold uppercase tracking-wider text-[var(--ink-400)] mb-1.5 block">Recurrence</Text>
                    <Text className="font-semibold text-[var(--ink-900)] text-[var(--text-sm)]">{recurrenceLabel(routine).replace('·', '-')}</Text>
                  </View>
                  <View className="p-3">
                    <Text className="text-[var(--text-2xs)] font-semibold uppercase tracking-wider text-[var(--ink-400)] mb-1.5 block">Logs</Text>
                    <Text className="font-semibold text-[var(--ink-900)] text-[var(--text-sm)]">{props.workspace.logs.filter((log) => log.routineId === routine.id).length === 1 ? '1 row' : `${props.workspace.logs.filter((log) => log.routineId === routine.id).length} rows`}</Text>
                  </View>
                </View>
                
                <View className="flex items-center justify-between gap-2 border-t border-[var(--paper-200)] pt-4">
                  <Text className="text-[var(--text-xs)] text-[var(--ink-500)]">
                    {pendingOccurrenceCopy(props.workspace, routine)}
                  </Text>
                  {!routine.isDeleted && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 text-[var(--ink-700)] hover:bg-[var(--paper-100)]"
                      onClick={() =>
                        props.confirm({
                          title: routine.isActive ? "Deactivate routine?" : "Activate routine?",
                          body: routine.isActive ? "Pending future occurrences are regenerated after deactivation." : "Activation generates matching occurrences in the current 7-day window.",
                          label: routine.isActive ? "Deactivate" : "Activate",
                          action: async () => {
                            await api(`/api/v1/routines/${routine.id}`, {
                              method: "PATCH",
                              body: { isActive: !routine.isActive },
                            })
                            toast.success("Routine updated.")
                            await props.reload()
                          },
                        })
                      }
                    >
                      <Power className="size-3.5 mr-1.5" />
                      {routine.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  )}
                </View>

                {!routine.isDeleted && (
                  <View className="motion-card-actions absolute top-4 right-4 flex gap-1.5">
                    <Button variant="outline" size="icon" className="size-8 bg-[var(--paper-0)] shadow-sm hover:bg-[var(--paper-100)]" onClick={() => props.openRoutine(routine)}>
                      <Pen className="size-3.5 text-[var(--ink-700)]" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8 bg-[var(--paper-0)] shadow-sm hover:bg-[var(--paper-100)]"
                      onClick={() =>
                        props.confirm({
                          title: "Soft-delete routine?",
                          body: "Historical routine_logs remain unchanged and a tombstone is created for mobile sync.",
                          label: "Delete routine",
                          tone: "danger",
                          action: async () => {
                            setDeletingIds((prev) => [...prev, routine.id])
                            try {
                              await api(`/api/v1/routines/${routine.id}`, { method: "DELETE" })
                              toast.success("Routine soft-deleted.")
                              await props.reload()
                            } finally {
                              setDeletingIds((prev) => prev.filter((id) => id !== routine.id))
                            }
                          },
                        })
                      }
                    >
                      <Trash className="size-3.5 text-[var(--ink-700)]" />
                    </Button>
                  </View>
                )}
              </CardContent>
            </Card>
          ))}
        </View>
      )}
    </View>
  )
}

function pendingOccurrenceCopy(workspace: Workspace, routine: Routine) {
  const pendingCount = workspace.occurrences.filter(
    (occurrence) => occurrence.routineId === routine.id && occurrence.status === "Pending"
  ).length

  return `${pendingCount} pending occurrence${pendingCount === 1 ? "" : "s"} in generated window`
}
