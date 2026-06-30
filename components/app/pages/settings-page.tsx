"use client"

import * as React from "react"
import { Bell, Globe, LogOut, RotateCw, Save, Pen, Loader2, Check } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { View } from "@/components/ui/layout"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Field,
  InfoList,
  InfoSwitch,
  RoutineFlowShell,
  api,
  reminderLabel,
  reminders,
  type ConfirmState,
  type Workspace,
} from "@/components/app/routineflow-shell"

import { Skeleton } from "@/components/ui/skeleton"

export function SettingsPageClient() {
  return (
    <RoutineFlowShell page="settings">
      {(context) => {
        if (!context) return <SettingsSkeleton />
        return <SettingsView workspace={context.workspace} reload={context.reload} confirm={context.confirm} logout={context.logout} />
      }}
    </RoutineFlowShell>
  )
}

function SettingsSkeleton() {
  return (
    <View className="grid gap-6">
      <View className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="size-8 rounded-[var(--radius-sm)]" />
          </CardHeader>
          <CardContent className="grid gap-4">
            <View className="grid gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
            </View>
            <View className="grid gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
            </View>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="size-8 rounded-[var(--radius-sm)]" />
          </CardHeader>
          <CardContent className="grid gap-4">
            <View className="grid gap-4 md:grid-cols-2">
              <View className="grid gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
              </View>
              <View className="grid gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
              </View>
            </View>
          </CardContent>
        </Card>
      </View>
      <View className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-1 h-4 w-72 max-w-full" />
          </CardHeader>
          <CardContent>
            <View className="flex items-center justify-between py-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-6 w-11 rounded-full" />
            </View>
            <Separator className="my-4" />
            <View className="flex items-center justify-between py-1">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-6 w-11 rounded-full" />
            </View>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-20" />
            <Skeleton className="mt-1 h-4 w-64 max-w-full" />
          </CardHeader>
          <CardContent className="grid gap-4">
            <View className="grid gap-1">
              {[1, 2].map((i) => (
                <View key={i} className="flex items-center justify-between rounded-[var(--radius-sm)] bg-[var(--paper-50)] px-3 py-2.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </View>
              ))}
            </View>
            <View className="mt-2 flex gap-2">
              <Skeleton className="h-10 w-40 rounded-[var(--radius-md)]" />
              <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
            </View>
          </CardContent>
        </Card>
      </View>
    </View>
  )
}

function SettingsView(props: { workspace: Workspace; reload: () => Promise<void>; confirm: (state: ConfirmState) => void; logout: () => Promise<void> }) {
  const [name, setName] = React.useState(props.workspace.user.name)
  const [timezone, setTimezone] = React.useState(props.workspace.settings.timezone)
  const [reminder, setReminder] = React.useState(String(props.workspace.settings.defaultReminderMinutes))
  const [isEditingProfile, setIsEditingProfile] = React.useState(false)
  const [isEditingTimezone, setIsEditingTimezone] = React.useState(false)
  const notifications = props.workspace.settings.notificationPreferences

  const timezones = React.useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone")
    } catch {
      return [Intl.DateTimeFormat().resolvedOptions().timeZone]
    }
  }, [])

  const [savingKey, setSavingKey] = React.useState<string | null>(null)
  const [refreshing, setRefreshing] = React.useState(false)
  const [loggingOut, setLoggingOut] = React.useState(false)

  async function saveSettings(payload: unknown, key: string) {
    if (savingKey) return
    setSavingKey(key)
    try {
      await api("/api/v1/settings", { method: "PATCH", body: payload })
      toast.success("Settings saved.")
      await props.reload()
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <View className="grid gap-6">
      <View className="grid gap-6 xl:grid-cols-2">
        <Card className="motion-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Profile</CardTitle>
            {!isEditingProfile && (
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setIsEditingProfile(true)}>
                <Pen className="size-4 text-[var(--ink-500)]" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Name">
              <Input value={name} onChange={(event) => setName(event.target.value)} disabled={!isEditingProfile} />
            </Field>
            <Field label="Email">
              <Input value={props.workspace.user.email} disabled />
            </Field>
            {isEditingProfile && (
              <Button variant="primary" className="w-fit" disabled={!!savingKey} onClick={() => {
                toast.info("Profile display name is local to auth provider in this build.")
                setIsEditingProfile(false)
              }}>
                <Check className="size-4" />
                Save profile
              </Button>
            )}
          </CardContent>
        </Card>
        <Card className="motion-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Timezone and reminders</CardTitle>
            {!isEditingTimezone && (
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setIsEditingTimezone(true)}>
                <Pen className="size-4 text-[var(--ink-500)]" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="grid gap-4">
            <View className="grid gap-4 md:grid-cols-2">
              <Field label="Timezone">
                <Select value={timezone} onValueChange={setTimezone} disabled={!isEditingTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => {
                      let offset = ""
                      try {
                        const parts = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date())
                        offset = parts.find(p => p.type === 'timeZoneName')?.value || ""
                      } catch {}
                      return (
                        <SelectItem key={tz} value={tz}>
                          <View className="flex w-full items-center justify-between gap-8">
                            <span>{tz}</span>
                            <span className="text-[var(--ink-400)]">{offset}</span>
                          </View>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Default reminder">
                <Select value={reminder} onValueChange={setReminder} disabled={!isEditingTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reminders.map((value) => (
                      <SelectItem key={value} value={value}>
                        {reminderLabel(Number(value))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </View>
            {isEditingTimezone && (
              <View className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  disabled={!!savingKey}
                  onClick={() =>
                    props.confirm({
                      title: "Update timezone?",
                      body: "Pending occurrences and notification schedules will be regenerated. Historical logs keep timezoneAtLog snapshots.",
                      label: "Update timezone",
                      action: () => {
                        saveSettings({ timezone }, "timezone")
                        setIsEditingTimezone(false)
                      },
                    })
                  }
                >
                  {savingKey === 'timezone' ? <Loader2 className="size-4 animate-spin" /> : <Globe className="size-4" />}
                  {savingKey === 'timezone' ? "Saving..." : "Save timezone"}
                </Button>
                <Button variant="outline" className="gap-2" disabled={!!savingKey} onClick={() => {
                  saveSettings({ defaultReminderMinutes: Number(reminder) }, "reminder")
                  setIsEditingTimezone(false)
                }}>
                  {savingKey === 'reminder' ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />}
                  {savingKey === 'reminder' ? "Saving..." : "Save reminder"}
                </Button>
              </View>
            )}
          </CardContent>
        </Card>
      </View>
      <View className="grid gap-6 xl:grid-cols-2">
        <Card className="motion-card">
          <CardHeader>
            <CardTitle>Notification permission</CardTitle>
            <CardDescription>Browser reminders are best-effort and reflect the Web Notifications API permission state.</CardDescription>
          </CardHeader>
          <CardContent>
            <InfoSwitch
              label="Browser notifications"
              checked={notifications.browserNotificationsEnabled}
              disabled={!!savingKey}
              loading={savingKey === 'browserNotifications'}
              onCheckedChange={(checked) => saveSettings({ notificationPreferences: { browserNotificationsEnabled: checked } }, "browserNotifications")}
            />
            <Separator className="my-4" />
            <InfoSwitch
              label="Disable overnight notifications"
              checked={notifications.overnightNotificationsDisabled}
              disabled={!!savingKey}
              loading={savingKey === 'overnightNotifications'}
              onCheckedChange={(checked) => saveSettings({ notificationPreferences: { overnightNotificationsDisabled: checked } }, "overnightNotifications")}
            />
          </CardContent>
        </Card>
        <Card className="motion-card">
          <CardHeader>
            <CardTitle>Session</CardTitle>
            <CardDescription>Better Auth-compatible session token is valid for web cookies and bearer API clients.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <InfoList rows={[["User", props.workspace.user.id], ["API token handling", "Never logged"]]} />
            <View className="flex gap-2">
              <Button variant="outline" className="gap-2" disabled={refreshing} onClick={() => {
                setRefreshing(true)
                api("/api/v1/auth/refresh", { method: "POST" })
                  .then(() => toast.success("Session refreshed."))
                  .finally(() => setRefreshing(false))
              }}>
                {refreshing ? <Loader2 className="size-4 animate-spin" /> : <RotateCw className="size-4" />}
                {refreshing ? "Refreshing..." : "Refresh session"}
              </Button>
              <Button
                variant="destructive"
                className="gap-2"
                disabled={loggingOut}
                onClick={() =>
                  props.confirm({
                    title: "Logout?",
                    body: "This revokes the current web session and returns to authentication.",
                    label: "Logout",
                    tone: "danger",
                    action: async () => {
                      setLoggingOut(true)
                      try {
                        await props.logout()
                      } finally {
                        setLoggingOut(false)
                      }
                    },
                  })
                }
              >
                {loggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                {loggingOut ? "Logging out..." : "Logout"}
              </Button>
            </View>
          </CardContent>
        </Card>
      </View>
    </View>
  )
}
