"use client"

import { Clock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { LineBreak, StrongText, Text, View } from "@/components/ui/layout"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Empty,
  InfoList,
  MetricGrid,
  AppShell,
  type Workspace,
} from "@/components/app/app-shell"

import { Skeleton } from "@/components/ui/skeleton"

export function SystemPageClient() {
  return (
    <AppShell page="system">
      {(context) => {
        if (!context) return <SystemSkeleton />
        return <SystemView workspace={context.workspace} />
      }}
    </AppShell>
  )
}

function SystemSkeleton() {
  return (
    <View className="grid gap-6">
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
            <Skeleton className="h-6 w-36" />
          </CardHeader>
          <CardContent className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <View key={i} className="grid grid-cols-[80px_1fr] gap-4">
                <Skeleton className="mt-1 h-3 w-16" />
                <View>
                  <Skeleton className="mb-2 h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                </View>
              </View>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <View className="grid gap-1">
              {[1, 2, 3, 4].map((i) => (
                <View key={i} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--paper-50)] px-3 py-2.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </View>
              ))}
            </View>
          </CardContent>
        </Card>
      </View>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-1 h-4 w-72 max-w-full" />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="h-3.5 w-16" /></TableHead>
                <TableHead><Skeleton className="h-3.5 w-16" /></TableHead>
                <TableHead><Skeleton className="h-3.5 w-20" /></TableHead>
                <TableHead><Skeleton className="h-3.5 w-16" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </View>
  )
}

function SystemView(props: { workspace: Workspace }) {
  const endpoints = [
    ["/api/v1/auth/otp/send", "POST", "OTP send"],
    ["/api/v1/auth/otp/verify", "POST", "OTP verify"],
    ["/api/v1/routines", "GET/POST", "Routine list/create"],
    ["/api/v1/occurrences/generate", "POST", "7-day window generation"],
    ["/api/v1/occurrences/[id]/complete", "POST", "Complete same-day occurrence"],
    ["/api/v1/occurrences/[id]/skip", "POST", "Skip same-day occurrence"],
    ["/api/v1/logs", "GET", "Historical logs"],
    ["/api/v1/analytics", "GET", "Log-derived metrics"],
    ["/api/v1/export", "GET", "Excel/CSV export"],
    ["/api/v1/sync/tombstones", "GET", "Mobile sync deletes"],
  ]

  return (
    <View className="grid gap-6">
      <MetricGrid
        metrics={[
          ["API version", "V1", "Shared by web and first-party mobile clients"],
          ["Occurrence window", "7 days", "Current local date through next 6 dates"],
          ["Tombstones", String(props.workspace.tombstones.length), "Soft-deleted resources for mobile cache sync"],
          ["Logs", String(props.workspace.logs.length), "Analytics source of truth"],
        ]}
      />
      <View className="grid gap-6 xl:grid-cols-2">
        <Card className="motion-card">
          <CardHeader>
            <CardTitle>Scheduled jobs</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {props.workspace.jobs.length ? props.workspace.jobs.map((job) => (
              <View key={job.id} className="grid grid-cols-[80px_1fr] gap-4 text-[var(--text-sm)]">
                <Text className="[font-family:var(--font-mono-stack)] text-[var(--ink-500)]">{job.at.slice(11, 16)} UTC</Text>
                <Text><StrongText>{job.label}</StrongText><LineBreak />{job.result}</Text>
              </View>
            )) : <Empty icon={Clock} text="Job state is recorded server-side as cron routes run." />}
          </CardContent>
        </Card>
        <Card className="motion-card">
          <CardHeader>
            <CardTitle>Security controls</CardTitle>
          </CardHeader>
          <CardContent>
            <InfoList rows={[["CSP", "Self-only production policy"], ["Rate limits", "OTP email/IP controls"], ["OTP storage", "Hashed TTL records"], ["Idempotency", "Mutating mobile calls"]]} />
          </CardContent>
        </Card>
      </View>
      <Card>
        <CardHeader>
          <CardTitle>Versioned API contract</CardTitle>
          <CardDescription>Protected routes accept a valid web session cookie or Authorization bearer session token.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {endpoints.map(([route, method, purpose]) => (
                <TableRow key={route}>
                  <TableCell variant="mono">{route}</TableCell>
                  <TableCell variant="mono">{method}</TableCell>
                  <TableCell>{purpose}</TableCell>
                  <TableCell><Badge variant="completed">Documented</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </View>
  )
}
