"use client"

import * as React from "react"
import { toast } from "sonner"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { View } from "@/components/ui/layout"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  MetricGrid,
  AppShell,
  api,
  categoryName,
  recurrenceLabel,
  signed,
  titleCase,
  type Workspace,
} from "@/components/app/app-shell"

interface CompletionTickProps {
  x?: string | number
  y?: string | number
  payload?: {
    value?: string | number
  }
}

const analyticsSkeletonBars = [58, 82, 44, 76, 66, 92, 54]

import { Skeleton } from "@/components/ui/skeleton"

export function AnalyticsPageClient() {
  return (
    <AppShell page="analytics">
      {(context) => {
        if (!context) return <AnalyticsSkeleton />
        return <AnalyticsPageContent workspace={context.workspace} />
      }}
    </AppShell>
  )
}

function AnalyticsSkeleton() {
  return (
    <View className="grid gap-6">
      <View className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-10 w-[300px] rounded-[var(--radius-md)]" />
        <Skeleton className="h-10 w-[220px] rounded-[var(--radius-md)]" />
      </View>
      <View className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="flex h-full min-h-[142px] flex-col justify-between p-5">
              <Skeleton className="h-4 w-28" />
              <View>
                <Skeleton className="mb-2 h-8 w-16" />
                <Skeleton className="h-3 w-48" />
              </View>
            </CardContent>
          </Card>
        ))}
      </View>
      <View className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-1 h-4 w-64" />
          </CardHeader>
          <CardContent className="h-72 flex items-end gap-2 pt-8">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="w-full flex-1 rounded-t-[var(--radius-md)]" style={{ height: `${analyticsSkeletonBars[i]}%` }} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="mt-1 h-4 w-64" />
          </CardHeader>
          <CardContent>
            <View className="grid grid-cols-18 gap-1">
              {Array.from({ length: 90 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-[var(--radius-xs)]" />
              ))}
            </View>
          </CardContent>
        </Card>
      </View>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-1 h-4 w-72" />
        </CardHeader>
        <CardContent>
          <View className="rounded-[var(--radius-md)] border border-[var(--paper-200)]">
            <View className="flex h-10 items-center gap-4 border-b border-[var(--paper-200)] bg-[var(--paper-100)] px-4">
              <Skeleton className="h-4 w-24 flex-1" />
              <Skeleton className="h-4 w-20 flex-1" />
              <Skeleton className="h-4 w-16 flex-1" />
              <Skeleton className="h-4 w-16 flex-1" />
              <Skeleton className="h-4 w-20 flex-1" />
            </View>
            <View className="grid divide-y divide-[var(--paper-200)]">
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} className="flex h-16 items-center gap-4 px-4">
                  <View className="flex-1">
                    <Skeleton className="mb-1.5 h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </View>
                  <View className="flex flex-1 items-center gap-2">
                    <Skeleton className="size-2 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                  </View>
                  <Skeleton className="h-4 w-12 flex-1" />
                  <Skeleton className="h-4 w-12 flex-1" />
                  <Skeleton className="h-4 w-16 flex-1" />
                </View>
              ))}
            </View>
          </View>
        </CardContent>
      </Card>
    </View>
  )
}

function AnalyticsPageContent({ workspace }: { workspace: Workspace }) {
  const [period, setPeriod] = React.useState(workspace.analytics.period || "weekly")
  const [routineFilter, setRoutineFilter] = React.useState("all")
  const [analytics, setAnalytics] = React.useState(workspace.analytics)

  React.useEffect(() => {
    let cancelled = false

    async function refreshAnalytics() {
      try {
        const analyticsData = await api<Workspace["analytics"]>(`/api/v1/analytics?period=${period}`)
        if (!cancelled) setAnalytics(analyticsData)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to load analytics.")
      }
    }

    void refreshAnalytics()

    return () => {
      cancelled = true
    }
  }, [period])

  return <AnalyticsView workspace={workspace} analytics={analytics} period={period} setPeriod={setPeriod} routineFilter={routineFilter} setRoutineFilter={setRoutineFilter} />
}

function AnalyticsView(props: {
  workspace: Workspace
  analytics: Workspace["analytics"]
  period: string
  setPeriod: (period: string) => void
  routineFilter: string
  setRoutineFilter: (routine: string) => void
}) {
  const metrics = props.analytics.metrics
  const rows = props.workspace.routines
    .filter((routine) => !routine.isDeleted && (props.routineFilter === "all" || routine.id === props.routineFilter))
    .map((routine) => {
      const logs = props.workspace.logs.filter((log) => log.routineId === routine.id)
      const completedLogs = logs.filter((log) => log.status === "Completed")
      const missedLogs = logs.filter((log) => log.status === "Missed")
      const skippedLogs = logs.filter((log) => log.status === "Skipped")
      const completedDelays = completedLogs
        .map((log) => log.delayMinutes)
        .filter((delay): delay is number => typeof delay === "number")
      const avgDelay = completedDelays.length ? Math.round(completedDelays.reduce((acc, delay) => acc + delay, 0) / completedDelays.length) : 0
      return { 
        routine, 
        logs, 
        completedLogs,
        missedLogs,
        skippedLogs,
        avgDelay,
        completion: logs.length ? Math.round((completedLogs.length / logs.length) * 100) : 0 
      }
    })
    .sort((a, b) => b.completion - a.completion)

  return (
    <View className="grid gap-6">
      <View className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={props.period} onValueChange={props.setPeriod}>
          <TabsList>
            {["daily", "weekly", "monthly", "yearly"].map((period) => (
              <TabsTrigger key={period} value={period}>
                {titleCase(period)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Select value={props.routineFilter} onValueChange={props.setRoutineFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All routines</SelectItem>
            {props.workspace.routines.filter((routine) => !routine.isDeleted).map((routine) => (
              <SelectItem key={routine.id} value={routine.id}>
                {routine.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </View>
      <MetricGrid
        metrics={[
          ["Discipline score", String(metrics.disciplineScore), "Formula uses completion, consistency, and delay"],
          ["Completion", `${metrics.completionRate}%`, `${metrics.completed} completed of ${metrics.total} finalized logs`],
          ["Missed", String(metrics.missed), "Missed detection writes these logs"],
          ["Behavioral drift", `${signed(metrics.behavioralDrift)}%`, "Recent 30 days vs previous 30 days"],
        ]}
      />
      <View className="grid gap-6 xl:grid-cols-2">
        <Card className="motion-card">
          <CardHeader>
            <CardTitle>Completion trend</CardTitle>
            <CardDescription>Daily completion rate from log rows.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={props.analytics.series} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--signal-500)" />
                    <stop offset="100%" stopColor="var(--completed-400)" />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--paper-200)" strokeDasharray="4 4" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tickMargin={10}
                  tick={({ x = 0, y = 0, payload }: CompletionTickProps) => {
                    const tickX = Number(x)
                    const tickY = Number(y)
                    const value = String(payload?.value ?? "")
                    const date = new Date(value)
                    const point = props.analytics.series.find((s) => s.date === value)
                    return (
                      <g transform={`translate(${tickX},${tickY})`}>
                        <text x={0} y={0} dy={12} textAnchor="middle" fill="var(--ink-400)" fontSize={11}>
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </text>
                        <text x={0} y={0} dy={28} textAnchor="middle" fill="var(--ink-900)" fontSize={12} fontWeight={600}>
                          {point?.completionRate ?? 0}%
                        </text>
                      </g>
                    )
                  }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "var(--ink-400)", fontSize: 11 }} 
                  tickFormatter={(val) => `${val}%`} 
                  width={40} 
                  domain={[0, 100]} 
                />
                <Tooltip />
                <Bar dataKey="completionRate" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="motion-card">
          <CardHeader>
            <CardTitle>Year heatmap</CardTitle>
            <CardDescription>Lazy visual intensity sample from historical logs.</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="grid grid-cols-18 gap-1">
              {Array.from({ length: 90 }, (_, index) => (
                <View key={index} className={["aspect-square rounded-[var(--radius-xs)] transition-[transform,opacity] duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-standard)] hover:scale-110 hover:opacity-90 motion-reduce:transform-none", ["bg-[var(--paper-100)]", "bg-[var(--completed-200)]", "bg-[var(--completed-400)]", "bg-[var(--completed-600)]", "bg-[var(--completed-700)]"][index % 5]].join(" ")} />
              ))}
            </View>
          </CardContent>
        </Card>
      </View>
      <Card>
        <CardHeader>
          <CardTitle>Consistency by routine</CardTitle>
          <CardDescription>Routine names come from current routines; historical calculations use routine_logs snapshots.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-[var(--paper-100)]">
              <TableRow>
                <TableHead>Routine</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead>Logs</TableHead>
                <TableHead>Exceptions</TableHead>
                <TableHead>Avg Delay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const catName = categoryName(props.workspace, row.routine.categoryId)
                const catColors = (() => {
                  switch (catName) {
                    case "Fitness": return "text-[var(--completed-600)] bg-[var(--completed-600)]"
                    case "Health": return "text-[var(--signal-600)] bg-[var(--signal-600)]"
                    case "Mind": return "text-[var(--skipped-600)] bg-[var(--skipped-600)]"
                    case "Personal": return "text-[var(--missed-600)] bg-[var(--missed-600)]"
                    default: return "text-[var(--ink-800)] bg-[var(--ink-800)]"
                  }
                })()
                const textColor = catColors.split(' ')[0]
                const bgColor = catColors.split(' ')[1]
                return (
                <TableRow key={row.routine.id}>
                  <TableCell>
                    <View className="font-semibold text-[var(--ink-900)]">{row.routine.title}</View>
                    <View className="text-[var(--text-xs)] text-[var(--ink-500)] mt-0.5">{recurrenceLabel(row.routine).replace('·', '-')}</View>
                  </TableCell>
                  <TableCell>
                    <View className={cn("flex items-center gap-1.5 font-medium text-[var(--text-xs)]", textColor)}>
                      <View className={cn("size-1.5 rounded-full", bgColor)} />
                      {catName}
                    </View>
                  </TableCell>
                  <TableCell>
                    <View className="flex items-center gap-3">
                      <View className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--paper-200)]">
                        <View className={cn("h-full bg-gradient-to-r from-[var(--signal-500)] to-[var(--completed-400)]", completionWidthClass(row.completion))} />
                      </View>
                      <View className="[font-family:var(--font-mono-stack)] font-semibold text-[var(--text-sm)]">{row.completion}%</View>
                    </View>
                  </TableCell>
                  <TableCell>
                    <View className="[font-family:var(--font-mono-stack)] font-semibold text-[var(--ink-900)] text-[var(--text-sm)]">{row.completedLogs.length}/{row.logs.length}</View>
                    <View className="text-[var(--text-xs)] text-[var(--ink-500)] mt-0.5">{row.logs.length} logs</View>
                  </TableCell>
                  <TableCell>
                    <View className="[font-family:var(--font-mono-stack)] font-semibold text-[var(--ink-900)] text-[var(--text-sm)]">{row.missedLogs.length + row.skippedLogs.length}</View>
                    <View className="text-[var(--text-xs)] text-[var(--ink-500)] mt-0.5">{row.missedLogs.length} missed / {row.skippedLogs.length} skipped</View>
                  </TableCell>
                  <TableCell>
                    <View className="[font-family:var(--font-mono-stack)] font-semibold text-[var(--ink-900)] text-[var(--text-sm)]">{row.avgDelay > 0 ? `+${row.avgDelay}m` : `${row.avgDelay}m`}</View>
                    <View className="text-[var(--text-xs)] text-[var(--ink-500)] mt-0.5">completed avg</View>
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </View>
  )
}

function completionWidthClass(value: number) {
  if (value >= 95) return "w-full"
  if (value >= 90) return "w-[90%]"
  if (value >= 80) return "w-[80%]"
  if (value >= 70) return "w-[70%]"
  if (value >= 60) return "w-[60%]"
  if (value >= 50) return "w-1/2"
  if (value >= 40) return "w-[40%]"
  if (value >= 30) return "w-[30%]"
  if (value >= 20) return "w-1/5"
  if (value >= 10) return "w-[10%]"
  return "w-0"
}
