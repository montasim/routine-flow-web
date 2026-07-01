"use client"

import * as React from "react"
import { CalendarDays, Plus, RotateCw, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { View } from "@/components/ui/layout"
import {
  Empty,
  InfoList,
  MetricGrid,
  OccurrenceRow,
  AppShell,
  addDaysClient,
  api,
  routineTitle,
  signed,
  sortOccurrence,
  todayLocal,
  type ConfirmState,
  type Workspace,
} from "@/components/app/app-shell"

import { Skeleton } from "@/components/ui/skeleton"

export function DashboardPageClient() {
  return (
    <AppShell page="dashboard">
      {(context) => {
        if (!context) return <DashboardSkeleton />
        return <Dashboard workspace={context.workspace} reload={context.reload} openRoutine={() => context.openRoutine("new")} confirm={context.confirm} />
      }}
    </AppShell>
  )
}

function DashboardSkeleton() {
  return (
    <View className="grid gap-6">
      <View className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="flex h-full min-h-[142px] flex-col justify-between p-5">
              <Skeleton className="h-4 w-24" />
              <View>
                <Skeleton className="mb-2 h-8 w-16" />
                <Skeleton className="h-3 w-40" />
              </View>
            </CardContent>
          </Card>
        ))}
      </View>
      <View className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.65fr)]">
        <Card>
          <CardHeader className="!flex-col items-start justify-between gap-4 sm:!flex-row">
            <View>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-1 h-4 w-72 max-w-full" />
            </View>
            <Skeleton className="h-9 w-32 shrink-0" />
          </CardHeader>
          <CardContent className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <View key={i} className="flex flex-col items-start justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--paper-200)] p-4 sm:flex-row sm:items-center">
                <View className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-[var(--radius-sm)]" />
                  <View className="grid gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </View>
                </View>
                <Skeleton className="h-9 w-full sm:w-24" />
              </View>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="mt-1 h-4 w-56" />
          </CardHeader>
          <CardContent className="grid gap-4">
            <View className="grid gap-1">
              {[1, 2, 3, 4].map((i) => (
                <View key={i} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--paper-50)] px-3 py-2.5">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                </View>
              ))}
            </View>
            <Skeleton className="mt-1 h-10 w-full" />
          </CardContent>
        </Card>
      </View>
    </View>
  )
}

function Dashboard(props: { workspace: Workspace; reload: () => Promise<void>; openRoutine: () => void; confirm: (state: ConfirmState) => void }) {
  const [isRegenerating, setIsRegenerating] = React.useState(false)
  const today = todayLocal()
  const todays = props.workspace.occurrences.filter((item) => item.date === today).sort(sortOccurrence)
  const pending = todays.filter((item) => item.status === "Pending")
  const next = pending[0]
  const metrics = props.workspace.analytics.metrics

  return (
      <View className="grid gap-6">
      <MetricGrid
        metrics={[
          ["Completion rate", `${metrics.completionRate}%`, "From routine_logs in the current weekly window"],
          ["Pending today", String(pending.length), `${todays.length} generated occurrences for ${today}`],
          ["Avg delay", `${signed(metrics.averageDelayMinutes)} min`, "Completed logs only"],
          ["Next reminder", next ? next.scheduledTime : "Done", next ? routineTitle(props.workspace, next.routineId) : "No pending reminders"],
        ]}
      />
      <View className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,0.65fr)]">
        <Card className="motion-card">
          <CardHeader className="!flex-col items-start justify-between gap-4 sm:!flex-row">
            <View>
              <CardTitle className="[font-size:var(--text-xl)]">Today&apos;s occurrences</CardTitle>
              <CardDescription className="max-w-[560px]">Complete writes a log immediately. Skip requires confirmation and is final in V1.</CardDescription>
            </View>
            <Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={props.openRoutine}>
              <Plus className="size-4" />
              New routine
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4">
            {todays.length ? (
              todays.map((occurrence) => (
                <OccurrenceRow key={occurrence.id} workspace={props.workspace} occurrence={occurrence} reload={props.reload} confirm={props.confirm} />
              ))
            ) : (
              <Empty icon={CalendarDays} text="No occurrences generated for today." />
            )}
          </CardContent>
        </Card>
        <Card className="motion-card">
          <CardHeader>
            <CardTitle>Execution state</CardTitle>
            <CardDescription>Server-owned scheduling keeps a persisted 7-day window.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <InfoList
              rows={[
                ["Window", `${today} - ${addDaysClient(today, 6)}`],
                ["Generated occurrences", String(props.workspace.occurrences.length)],
                ["Pending reminders", String(props.workspace.occurrences.filter((item) => item.status === "Pending").length)],
                ["Last scheduled job", props.workspace.jobs[0]?.at ? `${props.workspace.jobs[0].at.slice(11, 16)} UTC` : "Not run yet"],
              ]}
            />
            <Button
              variant="primary"
              className="mt-1 !text-white [&_svg]:text-white"
              disabled={isRegenerating}
              onClick={async () => {
                setIsRegenerating(true)
                try {
                  await api("/api/v1/occurrences/generate", { method: "POST" })
                  toast.success("Rolling window regenerated.")
                  await props.reload()
                } finally {
                  setIsRegenerating(false)
                }
              }}
            >
              {isRegenerating ? <Loader2 className="size-4 animate-spin" /> : <RotateCw className="size-4" />}
              {isRegenerating ? "Regenerating..." : "Regenerate pending window"}
            </Button>
          </CardContent>
        </Card>
      </View>
    </View>
  )
}
