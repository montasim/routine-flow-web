"use client"

import * as React from "react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Download, Database, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Text, View } from "@/components/ui/layout"
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
  RoutineFlowShell,
  StatusBadge,
  Toolbar,
  downloadExport,
  signed,
  type Workspace,
} from "@/components/app/routineflow-shell"
import type { RoutineLog } from "@/lib/types"

import { Skeleton } from "@/components/ui/skeleton"

export function LogsPageClient() {
  return (
    <RoutineFlowShell page="logs">
      {(context) => {
        if (!context) return <LogsSkeleton />
        return <LogsPageContent workspace={context.workspace} />
      }}
    </RoutineFlowShell>
  )
}

function LogsSkeleton() {
  return (
    <View className="grid gap-6">
      <Toolbar>
        <View className="flex flex-wrap gap-3">
          <Skeleton className="h-10 w-[160px] rounded-[var(--radius-md)]" />
          <Skeleton className="h-10 w-[220px] rounded-[var(--radius-md)]" />
          <Skeleton className="h-10 w-[150px] rounded-[var(--radius-md)]" />
        </View>
        <Skeleton className="h-10 w-[180px] rounded-[var(--radius-md)]" />
      </Toolbar>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="h-3.5 w-12" /></TableHead>
                <TableHead><Skeleton className="h-3.5 w-24" /></TableHead>
                <TableHead><Skeleton className="h-3.5 w-16" /></TableHead>
                <TableHead><Skeleton className="h-3.5 w-12" /></TableHead>
                <TableHead><Skeleton className="h-3.5 w-12" /></TableHead>
                <TableHead><Skeleton className="h-3.5 w-10" /></TableHead>
                <TableHead><Skeleton className="h-3.5 w-10" /></TableHead>
                <TableHead><Skeleton className="h-3.5 w-10" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell>
                    <View className="flex items-center gap-1.5">
                      <Skeleton className="size-1.5 rounded-full" />
                      <Skeleton className="h-4 w-16" />
                    </View>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-[var(--radius-sm)]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </View>
  )
}

function LogsPageContent({ workspace }: { workspace: Workspace }) {
  const [filter, setFilter] = React.useState("all")
  const [routineFilter, setRoutineFilter] = React.useState("all")
  const [rangeFilter, setRangeFilter] = React.useState("30d")
  const [isExporting, setIsExporting] = React.useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await downloadExport("csv", rangeFilter, undefined, undefined, routineFilter === "all" ? undefined : routineFilter)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <LogsView
      workspace={workspace}
      filter={filter}
      setFilter={setFilter}
      routineFilter={routineFilter}
      setRoutineFilter={setRoutineFilter}
      rangeFilter={rangeFilter}
      setRangeFilter={setRangeFilter}
      isExporting={isExporting}
      handleExport={handleExport}
    />
  )
}

function LogsView(props: {
  workspace: Workspace
  filter: string
  setFilter: (value: string) => void
  routineFilter: string
  setRoutineFilter: (value: string) => void
  rangeFilter: string
  setRangeFilter: (value: string) => void
  isExporting: boolean
  handleExport: () => void
}) {
  const rows = React.useMemo(() => {
    const now = new Date()
    return props.workspace.logs.filter((log) => {
      if (props.filter !== "all" && log.status !== props.filter) return false
      if (props.routineFilter !== "all" && log.routineId !== props.routineFilter) return false
      if (props.rangeFilter !== "all") {
        const logDate = new Date(log.date)
        const diffTime = Math.abs(now.getTime() - logDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        if (props.rangeFilter === "7d" && diffDays > 7) return false
        if (props.rangeFilter === "30d" && diffDays > 30) return false
      }
      return true
    })
  }, [props.workspace.logs, props.filter, props.routineFilter, props.rangeFilter])
  const columns = React.useMemo<ColumnDef<RoutineLog>[]>(
    () => [
      {
        header: "Date",
        cell: ({ row }) => (
          <Text className="[font-family:var(--font-mono-stack)] tabular-nums">{row.original.date}</Text>
        ),
      },
      {
        header: "Routine snapshot",
        cell: ({ row }) => (
          <Text className="font-semibold text-[var(--ink-900)]">{row.original.routineTitleAtLog}</Text>
        ),
      },
      {
        header: "Category",
        cell: ({ row }) => row.original.routineCategoryNameAtLog,
      },
      {
        header: "Scheduled",
        cell: ({ row }) => (
          <Text className="[font-family:var(--font-mono-stack)] tabular-nums">{row.original.scheduledTime}</Text>
        ),
      },
      {
        header: "Completed",
        cell: ({ row }) => (
          <Text className="[font-family:var(--font-mono-stack)] tabular-nums">
            {row.original.completedAt ? row.original.completedAt.slice(11, 16) : "-"}
          </Text>
        ),
      },
      {
        header: "Delay",
        cell: ({ row }) => (
          <Text className="[font-family:var(--font-mono-stack)] tabular-nums">
            {typeof row.original.delayMinutes === "number" ? `${signed(row.original.delayMinutes)}m` : "-"}
          </Text>
        ),
      },
      {
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge status={row.original.status} delay={row.original.delayMinutes} />
        ),
      },
      {
        header: "Timezone",
        cell: ({ row }) => (
          <Text className="[font-family:var(--font-mono-stack)] tabular-nums">{row.original.timezoneAtLog}</Text>
        ),
      },
    ],
    []
  )
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <View className="grid gap-6">
      <Toolbar>
        <View className="flex flex-wrap gap-3">
          <Select value={props.filter} onValueChange={props.setFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Missed">Missed</SelectItem>
              <SelectItem value="Skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>
          <Select value={props.routineFilter} onValueChange={props.setRoutineFilter}>
            <SelectTrigger className="w-[220px]">
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
          <Select value={props.rangeFilter} onValueChange={props.setRangeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7d</SelectItem>
              <SelectItem value="30d">Last 30d</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </View>
        <Button variant="outline" className="gap-2" disabled={props.isExporting} onClick={props.handleExport}>
          {props.isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {props.isExporting ? "Exporting..." : "Export filtered logs"}
        </Button>
      </Toolbar>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-[400px] text-center hover:bg-transparent">
                    <View className="flex flex-col items-center justify-center py-8">
                      <View className="mb-4 flex size-16 items-center justify-center rounded-full bg-[var(--paper-100)]">
                        <Database className="size-7 text-[var(--ink-500)]" strokeWidth={1.5} />
                      </View>
                      <Text className="mb-2 text-[var(--text-lg)] font-semibold text-[var(--ink-900)]">No logs found</Text>
                      <Text className="max-w-[320px] text-[var(--text-sm)] text-[var(--ink-500)] leading-relaxed">
                        Adjust your filters or complete a routine to see your history.
                      </Text>
                    </View>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </View>
  )
}
