"use client"

import * as React from "react"
import { Download, FileDown, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Paragraph, StrongText, View } from "@/components/ui/layout"
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
import {
  Field,
  AppShell,
  downloadExport,
  todayLocal,
  addDaysClient,
  type Workspace,
} from "@/components/app/app-shell"

import { Skeleton } from "@/components/ui/skeleton"

export function ExportsPageClient() {
  return (
    <AppShell page="exports">
      {(context) => {
        if (!context) return <ExportsSkeleton />
        return <ExportsView workspace={context.workspace} />
      }}
    </AppShell>
  )
}

function ExportsSkeleton() {
  return (
    <View className="grid gap-6">
      <View className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-1 h-4 w-72" />
          </CardHeader>
          <CardContent className="grid gap-4">
            <View className="grid gap-4 md:grid-cols-2">
              <View className="grid gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
              </View>
              <View className="grid gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
              </View>
              <View className="grid gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
              </View>
              <View className="grid gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
              </View>
              <View className="grid gap-2 md:col-span-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
              </View>
            </View>
            <Skeleton className="mt-1 h-10 w-full rounded-[var(--radius-md)]" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
            <Skeleton className="mt-1 h-4 w-56" />
          </CardHeader>
          <CardContent>
            <View className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} className={i === 5 ? "col-span-2 md:col-span-1" : ""}>
                  <Card variant="outlined" size="sm" className="h-full">
                    <CardContent className="p-4">
                      <Skeleton className="mb-2.5 h-4 w-32" />
                      <Skeleton className="mb-1 h-3.5 w-full" />
                      <Skeleton className="h-3.5 w-3/4" />
                    </CardContent>
                  </Card>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>
      </View>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-36" />
        </CardHeader>
        <CardContent>
          <View className="rounded-[var(--radius-md)] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Skeleton className="h-3.5 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-3.5 w-12" /></TableHead>
                  <TableHead><Skeleton className="h-3.5 w-10" /></TableHead>
                  <TableHead><Skeleton className="h-3.5 w-16" /></TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell>
                      <View className="flex flex-wrap gap-1">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </View>
                    </TableCell>
                    <TableCell><Skeleton className="h-9 w-20 rounded-[var(--radius-md)]" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </View>
        </CardContent>
      </Card>
    </View>
  )
}

function ExportsView(props: { workspace: Workspace }) {
  const [format, setFormat] = React.useState("xlsx")
  const [range, setRange] = React.useState("30d")
  const [startDate, setStartDate] = React.useState(() => addDaysClient(todayLocal(), -30))
  const [endDate, setEndDate] = React.useState(todayLocal)
  const [routineFilter, setRoutineFilter] = React.useState("all")
  const [isExporting, setIsExporting] = React.useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await downloadExport(format, range, startDate, endDate, routineFilter)
    } finally {
      setIsExporting(false)
    }
  }

  const rangeLabels: Record<string, string> = { all: "All time", "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days", custom: `${startDate} - ${endDate}` }
  const rangeLabel = rangeLabels[range] || range
  const routineName = routineFilter === "all" ? "all routines" : props.workspace.routines.find((r) => r.id === routineFilter)?.title || "unknown routine"

  return (
    <View className="grid gap-6">
      <View className="grid gap-6 xl:grid-cols-2">
        <Card className="motion-card">
          <CardHeader>
            <CardTitle>Export configuration</CardTitle>
            <CardDescription>Downloads must match analytics and logs for the same filters.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <View className="grid gap-4 md:grid-cols-2">
              <Field label="Format">
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xlsx">XLSX</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Range">
                <Select value={range} onValueChange={setRange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["all", "7d", "30d", "90d", "custom"].map((item) => (
                      <SelectItem key={item} value={item}>
                        {item === "all" ? "All time" : item === "custom" ? "Custom" : `Last ${item}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Start date">
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={range !== "custom"} />
              </Field>
              <Field label="End date">
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={range !== "custom"} />
              </Field>
              <Field label="Routine" className="md:col-span-2">
                <Select value={routineFilter} onValueChange={setRoutineFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All routines</SelectItem>
                    {props.workspace.routines.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </View>
            <Button variant="primary" className="w-full mt-1" disabled={isExporting} onClick={handleExport}>
              {isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {isExporting ? `Exporting ${format.toUpperCase()}...` : `Export ${format.toUpperCase()}`}
            </Button>
          </CardContent>
        </Card>
        <Card className="motion-card">
          <CardHeader>
            <CardTitle>Export preview</CardTitle>
            <CardDescription>{rangeLabel} - {routineName}</CardDescription>
          </CardHeader>
          <CardContent>
            <View className="grid grid-cols-2 gap-3">
              {[
                ["Sheet 1 - Categories", `${props.workspace.categories.length} category records with color, description, and ordering metadata.`],
                ["Sheet 2 - Routines", `${props.workspace.routines.length} routine records, including inactive and soft-deleted metadata.`],
                ["Sheet 3 - Logs", `${props.workspace.logs.length} routine_logs rows with schedule, completion time, delay, status, and category snapshots.`],
                ["Sheet 4 - Summary", "Aggregated completion, missed, skipped, delay, and category metrics."],
                ["Sheet 5 - Deleted resources / tombstones", `${props.workspace.tombstones.length} mobile sync deletion records.`],
              ].map(([title, text]) => (
                <View key={title} className={title.startsWith("Sheet 5") ? "col-span-2 md:col-span-1" : ""}>
                  <Card variant="outlined" size="sm" className="motion-card h-full">
                    <CardContent className="p-4">
                      <StrongText className="mb-1 block text-sm font-semibold">{title}</StrongText>
                      <Paragraph className="m-0 text-sm leading-relaxed">{text}</Paragraph>
                    </CardContent>
                  </Card>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>
      </View>
      <Card>
        <CardHeader>
          <CardTitle>Recent exports</CardTitle>
        </CardHeader>
        <CardContent>
          <View className="rounded-[var(--radius-md)] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!props.workspace.exports?.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-[300px] text-center hover:bg-transparent">
                      <View className="flex flex-col items-center justify-center py-8">
                        <View className="mb-4 flex size-16 items-center justify-center rounded-full bg-[var(--paper-100)]">
                          <FileDown className="size-7 text-[var(--ink-500)]" strokeWidth={1.5} />
                        </View>
                        <StrongText className="mb-2 text-[var(--text-lg)] text-[var(--ink-900)]">No recent exports</StrongText>
                        <Paragraph className="max-w-[320px] text-[var(--text-sm)] text-[var(--ink-500)] leading-relaxed m-0">
                          Configure your filters above and generate an export to see it here.
                        </Paragraph>
                      </View>
                    </TableCell>
                  </TableRow>
                ) : (
                  props.workspace.exports.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell variant="mono">{exp.createdAt.slice(0, 10)}</TableCell>
                      <TableCell>{exp.label}</TableCell>
                      <TableCell>{exp.rows}</TableCell>
                      <TableCell variant="mono">{exp.file}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </View>
        </CardContent>
      </Card>
    </View>
  )
}
