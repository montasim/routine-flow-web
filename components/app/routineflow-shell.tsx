"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useForm, type Resolver } from "react-hook-form"
import {
  ChartColumn,
  CalendarDays,
  Check,
  Download,
  Folder,
  Globe,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Repeat2,
  Copy,
  Info,
  Settings2,
  ShieldCheck,
  FastForward,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty as EmptyRoot,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty"
import {
  Field as FieldRoot,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  AppAside,
  AppHeader,
  AppMain,
  AppNav,
  AppSection,
  Heading1,
  Paragraph,
  StrongText,
  Text,
  View,
} from "@/components/ui/layout"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ThemeToggle } from "@/components/app/theme-toggle"
import { REMINDER_OPTIONS } from "@/lib/constants"
import { categoryCreateSchema, type CategoryCreateInput } from "@/lib/schemas"
import type { AnalyticsMetrics, Category, ExportRecord, Occurrence, Routine, RoutineLog, SyncTombstone, ScheduledJobLog, User, UserSettings } from "@/lib/types"
import { useRoutineFlowUi, type ConfirmState } from "@/lib/ui-state"
import { cn } from "@/lib/utils"

export type { ConfirmState } from "@/lib/ui-state"

export type PageId = "login" | "dashboard" | "calendar" | "analytics" | "routines" | "categories" | "logs" | "exports" | "settings" | "system"

interface ApiEnvelope<T> {
  data: T
  meta?: Record<string, unknown>
}

interface ApiError extends Error {
  status?: number
}

export interface Workspace {
  user: User
  settings: UserSettings
  categories: Category[]
  routines: Routine[]
  occurrences: Occurrence[]
  logs: RoutineLog[]
  analytics: {
    period: string
    metrics: AnalyticsMetrics
    series: { date: string; completionRate: number; total: number }[]
    generatedAt: string
  }
  tombstones: SyncTombstone[]
  exports: ExportRecord[]
  jobs: ScheduledJobLog[]
}

export interface RoutineFlowPageContext {
  workspace: Workspace
  reload: () => Promise<void>
  confirm: (state: ConfirmState) => void
  openRoutine: (routine: Routine | "new") => void
  openCategory: (category: Category | "new") => void
  logout: () => Promise<void>
}

const navItems: { id: PageId; href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "dashboard", href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "calendar", href: "/calendar", label: "Calendar", icon: CalendarDays },
  { id: "analytics", href: "/analytics", label: "Analytics", icon: ChartColumn },
  { id: "routines", href: "/routines", label: "Routines", icon: Repeat2 },
  { id: "categories", href: "/categories", label: "Categories", icon: Folder },
  { id: "logs", href: "/logs", label: "Logs", icon: ListTodo },
  { id: "exports", href: "/exports", label: "Exports", icon: Download },
  { id: "settings", href: "/settings", label: "Settings", icon: Settings2 },
  { id: "system", href: "/system", label: "System", icon: ShieldCheck },
]

const primaryNavItems = navItems.filter((item) => item.id !== "settings" && item.id !== "system")
const defaultCategoryColor = "#3e63ff"

const routeByPage = Object.fromEntries(navItems.map((item) => [item.id, item.href])) as Record<PageId, string>
routeByPage.login = "/"
const workspaceQueryKey = ["routineflow", "workspace"] as const

const pageCopy: Record<PageId, [string, string]> = {
  login: ["Login", "Sign in to your workspace"],
  dashboard: ["Overview", "Today's occurrences and measured execution state"],
  calendar: ["Calendar", "Past logs and future generated occurrences"],
  analytics: ["Analytics", "Metrics derived only from routine_logs."],
  routines: ["Routines", "Fixed schedules, recurrence, reminders, and soft deletion"],
  categories: ["Categories", "Manage routine categories and open category-level statistics"],
  logs: ["Logs", "Historical source of truth with routine snapshots"],
  exports: ["Exports", "Excel and CSV downloads with confirmation"],
  settings: ["Settings", "Profile, timezone, reminders, notifications, and session."],
  system: ["System", "Versioned API, scheduled jobs, and security controls."],
}

export const reminders = REMINDER_OPTIONS.map((value) => String(value))
export const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

async function fetchWorkspace(): Promise<Workspace | null> {
  try {
    const analyticsPeriod = "weekly"
    const [me, categories, routines, occurrences, logs, analyticsData, tombstones, exportsList] = await Promise.all([
      api<{ user: User; settings: UserSettings }>("/api/v1/auth/me"),
      api<{ categories: Category[] }>("/api/v1/categories"),
      api<{ routines: Routine[] }>("/api/v1/routines?includeInactive=true&includeDeleted=true"),
      api<{ occurrences: Occurrence[] }>("/api/v1/occurrences"),
      api<{ logs: RoutineLog[] }>("/api/v1/logs?limit=200"),
      api<Workspace["analytics"]>(`/api/v1/analytics?period=${analyticsPeriod}`),
      api<{ tombstones: SyncTombstone[] }>("/api/v1/sync/tombstones?limit=200"),
      api<{ exports: ExportRecord[] }>("/api/v1/exports"),
    ])

    return {
      user: me.user,
      settings: me.settings,
      categories: categories.categories,
      routines: routines.routines,
      occurrences: occurrences.occurrences,
      logs: logs.logs,
      analytics: analyticsData,
      tombstones: tombstones.tombstones,
      exports: exportsList.exports,
      jobs: [],
    }
  } catch (error) {
    if (isAuthError(error)) return null
    throw error
  }
}

export function RoutineFlowShell({ page, children }: { page: PageId; children: (context: RoutineFlowPageContext | null) => React.ReactNode }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const {
    data: workspace = null,
    error: workspaceError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: workspaceQueryKey,
    queryFn: fetchWorkspace,
  })
  const {
    routineModal,
    categoryModal,
    confirm,
    setRoutineModal,
    setCategoryModal,
    setConfirm,
  } = useRoutineFlowUi()

  function navigate(nextPage: PageId) {
    router.push(routeByPage[nextPage])
  }

  React.useEffect(() => {
    if (workspaceError && !isAuthError(workspaceError)) {
      toast.error(errorMessage(workspaceError))
    }
  }, [workspaceError])

  React.useEffect(() => {
    if (!isLoading && !workspace && page !== "login") {
      router.replace("/")
    } else if (!isLoading && workspace && page === "login") {
      router.replace("/dashboard")
    }
  }, [isLoading, workspace, page, router])

  const loadWorkspace = React.useCallback(async () => {
    const result = await refetch()
    if (result.error && !String(result.error).includes("401")) {
      throw result.error
    }
  }, [refetch])

  async function logout() {
    try {
      await api("/api/v1/auth/logout", { method: "POST" })
      queryClient.setQueryData(workspaceQueryKey, null)
      router.push("/login")
      toast.success("Session revoked.")
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const isWorkspaceLoading = isLoading || !workspace

  if (!isWorkspaceLoading && !workspace) {
    return null
  }

  if (!isWorkspaceLoading && workspace && page === "login") {
    return null
  }

  const [title, subtitle] = pageCopy[page]

  return (
    <View className="min-h-svh bg-[var(--paper-50)] text-[var(--ink-900)]">
      <View className="flex min-h-svh">
        <AppAside className="sticky top-0 hidden h-svh w-[248px] shrink-0 border-r border-[var(--paper-200)] bg-[var(--paper-0)] px-4 py-6 lg:flex lg:flex-col">
          <Brand />
          <AppNav className="grid gap-1.5">
            {workspace ? (
              primaryNavItems.map((item) => (
                <NavButton key={item.id} item={item} active={page === item.id} onClick={() => navigate(item.id)} />
              ))
            ) : (
              Array.from({ length: 7 }).map((_, i) => (
                <View key={i} className="flex min-h-10 items-center gap-3 px-3 py-2">
                  <Skeleton className="size-4 rounded-sm" />
                  <Skeleton className="h-4 w-24" />
                </View>
              ))
            )}
          </AppNav>
          <View className="mt-auto pb-9">
            {workspace ? (
              <Button variant="ghost" className="w-full justify-start" onClick={() => navigate("settings")}>
                <Settings2 className="size-4" />
                Account settings
              </Button>
            ) : (
              <View className="flex h-10 w-full items-center gap-2 px-4 py-2">
                <Skeleton className="size-4 rounded-sm" />
                <Skeleton className="h-4 w-32" />
              </View>
            )}
          </View>
        </AppAside>
        <AppMain className="min-w-0 flex-1">
          <AppHeader className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-4 border-b border-[var(--paper-200)] bg-[var(--surface-header)] px-4 py-5 backdrop-blur md:px-8">
            <View className="flex min-w-0 items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden">
                    <Menu className="size-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>
                      <Brand compact />
                    </SheetTitle>
                  </SheetHeader>
                  <AppNav className="mt-6 grid gap-1">
                    {workspace ? (
                      primaryNavItems.map((item) => (
                        <NavButton key={item.id} item={item} active={page === item.id} onClick={() => navigate(item.id)} />
                      ))
                    ) : (
                      Array.from({ length: 7 }).map((_, i) => (
                        <View key={i} className="flex min-h-10 items-center gap-3 px-3 py-2">
                          <Skeleton className="size-4 rounded-sm" />
                          <Skeleton className="h-4 w-24" />
                        </View>
                      ))
                    )}
                  </AppNav>
                </SheetContent>
              </Sheet>
              <View className="min-w-0">
                <View className="md:hidden">
                  <Brand compact />
                </View>
                {workspace ? (
                  <>
                    <Heading1 className="hidden truncate text-[var(--ink-800)] md:block">{title}</Heading1>
                    <Paragraph className="mt-1 hidden md:block">{subtitle}</Paragraph>
                  </>
                ) : (
                  <View className="hidden md:block">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="mt-1.5 h-4 w-80 max-w-full" />
                  </View>
                )}
              </View>
            </View>
            <View className="flex items-center gap-2">
              {workspace ? (
                <ThemeToggle />
              ) : (
                <Skeleton className="size-9 rounded-[var(--radius-md)]" />
              )}
              {workspace ? (
                <Badge className="hidden md:inline-flex">
                  <Globe className="size-3.5" />
                  {workspace.settings.timezone}
                </Badge>
              ) : (
                <Skeleton className="hidden h-6 w-24 rounded-full md:inline-flex" />
              )}

              {workspace ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="avatar" size="avatar">
                      {workspace.user.name.slice(0, 1).toUpperCase()}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>
                      <View className="font-semibold">{workspace.user.name}</View>
                      <View className="truncate text-[var(--text-xs)] font-normal text-[var(--ink-500)]">{workspace.user.email}</View>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("settings")}>
                      <Settings2 className="size-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        setConfirm({
                          title: "Logout?",
                          body: "This revokes the current web session and returns to authentication.",
                          action: logout,
                          label: "Logout",
                          tone: "danger",
                        })
                      }
                    >
                      <LogOut className="size-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Skeleton className="size-8 rounded-full" />
              )}
            </View>
          </AppHeader>
          <AppSection className="motion-reveal w-full max-w-[1240px] px-4 py-6 md:px-8 md:py-8">
            {children(
              workspace
                ? {
                  workspace,
                  reload: loadWorkspace,
                  confirm: setConfirm,
                  openRoutine: setRoutineModal,
                  openCategory: setCategoryModal,
                  logout,
                }
                : null
            )}
          </AppSection>
        </AppMain>
      </View>

      {workspace && (
        <>
          <RoutineDialog value={routineModal} workspace={workspace} onClose={() => setRoutineModal(null)} reload={loadWorkspace} />
          <CategoryDialog value={categoryModal} onClose={() => setCategoryModal(null)} reload={loadWorkspace} />
        </>
      )}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </View>
  )
}



function RoutineDialog(props: { value: Routine | "new" | null; workspace: Workspace; onClose: () => void; reload: () => Promise<void> }) {
  const editing = props.value && props.value !== "new" ? props.value : null
  const firstCategory = props.workspace.categories[0]?.id || ""
  const [title, setTitle] = React.useState("")
  const [categoryId, setCategoryId] = React.useState(firstCategory)
  const [scheduledTime, setScheduledTime] = React.useState("08:00")
  const [recurrenceType, setRecurrenceType] = React.useState("daily")
  const [weeklyDays, setWeeklyDays] = React.useState("1,2,3,4,5")
  const [monthDay, setMonthDay] = React.useState("1")
  const [yearMonth, setYearMonth] = React.useState("1")
  const [yearDay, setYearDay] = React.useState("1")
  const [reminder, setReminder] = React.useState("global")

  React.useEffect(() => {
    if (!props.value) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setTitle(editing?.title ?? "")
    setCategoryId(editing?.categoryId ?? firstCategory)
    setScheduledTime(editing?.scheduledTime ?? "08:00")
    setRecurrenceType(editing?.recurrenceType ?? "daily")
    setReminder(editing?.reminderOverride == null ? "global" : String(editing.reminderOverride))
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [props.value, editing, firstCategory])
  const [saving, setSaving] = React.useState(false)

  async function save() {
    setSaving(true)
    try {
      const recurrenceRules =
        recurrenceType === "weekly"
          ? { daysOfWeek: weeklyDays.split(",").map((value) => Number(value.trim())).filter((value) => Number.isInteger(value) && value >= 0 && value <= 6) }
          : recurrenceType === "monthly"
            ? { daysOfMonth: [Number(monthDay)] }
            : recurrenceType === "yearly"
              ? { dates: [{ month: Number(yearMonth), day: Number(yearDay) }] }
              : {}
      const body = {
        title,
        categoryId,
        scheduledTime,
        recurrenceType,
        recurrenceRules,
        reminderOverride: reminder === "global" ? null : Number(reminder),
      }
      const url = editing ? `/api/v1/routines/${editing.id}` : "/api/v1/routines"
      await api(url, { method: editing ? "PATCH" : "POST", body })
      await props.reload()
      toast.success(editing ? "Routine updated." : "Routine created.")
      props.onClose()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={Boolean(props.value)} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit routine" : "New routine"}</DialogTitle>
          <DialogDescription>{editing ? "Schedule, recurrence, reminder, and active-state changes regenerate pending occurrences." : "Creating a routine generates matching occurrences in the active 7-day window."}</DialogDescription>
        </DialogHeader>
        <View className="grid gap-4 md:grid-cols-2">
          <Field label="Title" className="md:col-span-2" tooltip="1 to 120 characters"><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Morning strength" /></Field>
          <Field label="Category">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {props.workspace.categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Scheduled time"><Input className="font-mono" type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} /></Field>
          <Field label="Reminder override" optional>
            <Select value={reminder} onValueChange={setReminder}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Use global default</SelectItem>
                {reminders.map((value) => <SelectItem key={value} value={value}>{reminderLabel(Number(value))}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Recurrence">
            <Select value={recurrenceType} onValueChange={setRecurrenceType}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["daily", "weekly", "monthly", "yearly"].map((value) => <SelectItem key={value} value={value}>{titleCase(value)}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {recurrenceType === "weekly" && (
            <View className="col-span-1 md:col-span-2">
              <Field label="Weekly days">
                <View className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                    const weeklyDaysArr = weeklyDays ? weeklyDays.split(",").map(Number) : [1, 2, 3, 4, 5]
                    const isChecked = weeklyDaysArr.includes(d)
                    const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
                    return (
                      <Button
                        key={d}
                        type="button"
                        variant="chip"
                        size="chip"
                        aria-pressed={isChecked}
                        data-active={isChecked}
                        onClick={() => {
                          if (isChecked) {
                            setWeeklyDays(weeklyDaysArr.filter((day) => day !== d).join(","))
                            return
                          }
                          setWeeklyDays([...weeklyDaysArr, d].join(","))
                        }}
                      >
                        {WEEKDAYS[d]}
                      </Button>
                    )
                  })}
                </View>
              </Field>
            </View>
          )}
          {recurrenceType === "monthly" && <Field label="Day of month"><Input type="number" min={1} max={31} value={monthDay} onChange={(event) => setMonthDay(event.target.value)} /></Field>}
          {recurrenceType === "yearly" && (
            <View className="grid gap-4 grid-cols-2 md:col-span-2">
              <Field label="Month"><Input type="number" min={1} max={12} value={yearMonth} onChange={(event) => setYearMonth(event.target.value)} /></Field>
              <Field label="Day"><Input type="number" min={1} max={31} value={yearDay} onChange={(event) => setYearDay(event.target.value)} /></Field>
            </View>
          )}
        </View>
        <DialogFooter>
          <Button variant="outline" onClick={props.onClose}>Cancel</Button>
          <Button variant="primary" disabled={saving} onClick={() => void save()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {saving ? (editing ? "Saving..." : "Creating...") : (editing ? "Save changes" : "Create routine")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CategoryDialog(props: { value: Category | "new" | null; onClose: () => void; reload: () => Promise<void> }) {
  const editing = props.value && props.value !== "new" ? props.value : null
  const form = useForm<CategoryCreateInput>({
    resolver: zodResolver(categoryCreateSchema as never) as Resolver<CategoryCreateInput>,
    defaultValues: {
      name: "",
      description: "",
      color: defaultCategoryColor,
    },
  })

  React.useEffect(() => {
    if (!props.value) return
    form.reset({
      name: editing?.name ?? "",
      description: editing?.description ?? "",
      color: editing?.color ?? defaultCategoryColor,
    })
  }, [props.value, editing, form])

  const [saving, setSaving] = React.useState(false)

  async function save(values: CategoryCreateInput) {
    setSaving(true)
    try {
      await api(editing ? `/api/v1/categories/${editing.id}` : "/api/v1/categories", {
        method: editing ? "PATCH" : "POST",
        body: values,
      })
      await props.reload()
      toast.success(editing ? "Category saved." : "Category created.")
      props.onClose()
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Dialog open={Boolean(props.value)} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>{editing ? "Renaming changes current routines only. Historical log snapshots are not rewritten." : "Categories group routines and unlock category-level statistics."}</DialogDescription>
        </DialogHeader>
        <View className="grid gap-4">
          <Field label="Name" tooltip="1 to 64 characters">
            <Input {...form.register("name")} />
            {form.formState.errors.name && (
              <Paragraph className="text-[var(--missed-600)]">{form.formState.errors.name.message}</Paragraph>
            )}
          </Field>
          <Field label="Description" tooltip="Optional. Maximum 240 characters." optional>
            <Textarea {...form.register("description")} />
            {form.formState.errors.description && (
              <Paragraph className="text-[var(--missed-600)]">{form.formState.errors.description.message}</Paragraph>
            )}
          </Field>
          <Field label="Color">
            <View className="flex items-center gap-3">
              <Input type="color" className="w-full flex-1" {...form.register("color")} />
              <View className="flex items-center gap-2 rounded-md border border-[var(--paper-200)] bg-[var(--paper-50)] px-3 py-2">
                <Text className="[font-family:var(--font-mono-stack)] text-sm uppercase text-[var(--ink-700)]">
                  {form.watch("color") || defaultCategoryColor}
                </Text>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 hover:bg-[var(--paper-200)]"
                  onClick={() => {
                    const colorValue = form.getValues("color") || defaultCategoryColor
                    void navigator.clipboard.writeText(colorValue.toUpperCase())
                    toast.success("Color copied to clipboard")
                  }}
                >
                  <Copy className="size-3.5 text-[var(--ink-500)]" />
                </Button>
              </View>
            </View>
            {form.formState.errors.color && (
              <Paragraph className="text-[var(--missed-600)]">{form.formState.errors.color.message}</Paragraph>
            )}
          </Field>
        </View>
        <DialogFooter>
          <Button variant="outline" onClick={props.onClose}>Cancel</Button>
          <Button variant="primary" disabled={saving} onClick={() => void form.handleSubmit(save)()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {saving ? (editing ? "Saving..." : "Creating...") : (editing ? "Save category" : "Create category")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function OccurrenceRow(props: { workspace: Workspace; occurrence: Occurrence; reload: () => Promise<void>; confirm: (state: ConfirmState) => void }) {
  const routine = props.workspace.routines.find((item) => item.id === props.occurrence.routineId)
  const category = routine ? props.workspace.categories.find((item) => item.id === routine.categoryId) : null
  const categoryTone = categoryColorClasses(category?.color)
  return (
    <View className="motion-row grid min-h-[72px] gap-3 rounded-[var(--radius-md)] border border-[var(--paper-200)] bg-[var(--paper-0)] px-4 py-3 hover:bg-[var(--paper-50)] md:grid-cols-[82px_1fr_auto] md:items-center">
      <View className="[font-family:var(--font-mono-stack)] [font-size:var(--text-md)] font-semibold tabular-nums text-[var(--ink-500)]">{props.occurrence.scheduledTime}</View>
      <View className="min-w-0">
        <View className="truncate [font-size:var(--text-md)] font-semibold">{routine?.title || "Deleted routine"}</View>
        <View className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 [font-size:var(--text-sm)] text-[var(--ink-500)]">
          <Text className={cn("inline-flex items-center gap-1.5", categoryTone.text)}>
            <Text className={cn("size-1.5 rounded-[var(--radius-pill)]", categoryTone.bg)} />
            {routine ? categoryName(props.workspace, routine.categoryId) : "Unknown"}
          </Text>
          <Text>{reminderLabel(props.occurrence.reminderMinutes)}</Text>
          <Text className="[font-family:var(--font-mono-stack)]">{props.occurrence.timezoneAtGeneration}</Text>
        </View>
      </View>
      <OccurrenceActions occurrence={props.occurrence} workspace={props.workspace} reload={props.reload} confirm={props.confirm} />
    </View>
  )
}

export function OccurrenceCard(props: { workspace: Workspace; occurrence: Occurrence; reload: () => Promise<void>; confirm: (state: ConfirmState) => void }) {
  return (
    <Card size="sm" className="motion-card">
      <CardContent className="grid gap-4 pt-(--card-spacing)">
        <View className="grid grid-cols-[58px_1fr] gap-3">
          <Badge variant="time">{props.occurrence.scheduledTime}</Badge>
          <View>
            <View className="[font-family:var(--font-display-stack)] text-[var(--text-lg)] font-bold">{routineTitle(props.workspace, props.occurrence.routineId)}</View>
            <View className="text-[var(--text-sm)] text-[var(--ink-500)]">{categoryForOccurrence(props.workspace, props.occurrence)}</View>
          </View>
        </View>
        <View className="flex flex-wrap items-center justify-between gap-2">
          <View className="[font-family:var(--font-mono-stack)] text-[var(--text-xs)] text-[var(--ink-500)]">{reminderLabel(props.occurrence.reminderMinutes)} · {props.occurrence.timezoneAtGeneration} · UTC {props.occurrence.scheduledTimeUtc.slice(11, 16)}</View>
          <OccurrenceActions occurrence={props.occurrence} workspace={props.workspace} reload={props.reload} confirm={props.confirm} />
        </View>
      </CardContent>
    </Card>
  )
}

function OccurrenceActions(props: { workspace: Workspace; occurrence: Occurrence; reload: () => Promise<void>; confirm: (state: ConfirmState) => void }) {
  if (props.occurrence.status !== "Pending" || props.occurrence.date !== todayLocal()) return <StatusBadge status={props.occurrence.status} delay={props.occurrence.delayMinutes} />
  return (
    <View className="flex flex-wrap justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() =>
          props.confirm({
            title: "Skip occurrence?",
            body: `${routineTitle(props.workspace, props.occurrence.routineId)} at ${props.occurrence.scheduledTime} on ${props.occurrence.date} will be recorded as skipped and excluded from completion timing.`,
            label: "Skip occurrence",
            tone: "warning",
            action: async () => {
              await api(`/api/v1/occurrences/${props.occurrence.id}/skip`, { method: "POST" })
              toast.success("Occurrence skipped and logged.")
              await props.reload()
            },
          })
        }
      >
        <FastForward className="size-4" />
        Skip
      </Button>
      <Button
        size="sm"
        variant="success"
        onClick={async () => {
          await api(`/api/v1/occurrences/${props.occurrence.id}/complete`, { method: "POST" })
          toast.success("Occurrence completed and logged.")
          await props.reload()
        }}
      >
        <Check className="size-4" />
        Complete
      </Button>
    </View>
  )
}

function ConfirmDialog(props: { state: ConfirmState | null; onClose: () => void }) {
  return (
    <AlertDialog open={Boolean(props.state)} onOpenChange={(open) => !open && props.onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{props.state?.title}</AlertDialogTitle>
          <AlertDialogDescription>{props.state?.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={props.state?.tone === "danger" ? "danger" : props.state?.tone === "warning" ? "warning" : "primary"}
            onClick={() => {
              const action = props.state?.action
              props.onClose()
              Promise.resolve(action?.()).catch((error) => toast.error(errorMessage(error)))
            }}
          >
            {props.state?.label || "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View className={cn("flex items-center gap-2.5", !compact && "px-2 pb-6")}>
      <View className="grid size-7 place-items-center">
        <Image src="/logo.svg" alt="RoutineFlow" width={32} height={32} className="h-8 w-auto" priority={compact} />
      </View>
      <View className="[font-family:var(--font-display-stack)] text-[19px] font-bold tracking-normal text-[var(--ink-900)]">
        Routine<span className="text-[var(--signal-500)]">Flow</span>
      </View>
    </View>
  )
}

function NavButton(props: { item: (typeof navItems)[number]; active: boolean; onClick: () => void }) {
  const Icon = props.item.icon
  return (
    <Button variant="nav" size="nav" className="motion-icon-hover" data-active={props.active} onClick={props.onClick}>
      <Icon className="motion-icon size-4" />
      {props.item.label}
    </Button>
  )
}

export function MetricGrid({ metrics }: { metrics: [string, string, string][] }) {
  const [expanded, setExpanded] = React.useState(false)

  return (
    <View className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map(([label, value, foot], i) => {
        const display = splitMetricValue(value)
        const isHiddenMobile = !expanded && i > 0

        return (
          <Card key={label} size="metric" className={cn("motion-card", isHiddenMobile ? "hidden md:block" : "block")}>
            <CardContent className="flex h-full min-h-[142px] flex-col justify-between p-5">
              <View>
                <View className="[font-family:var(--font-mono-stack)] [font-size:var(--text-2xs)] font-semibold uppercase tracking-[0.08em] text-[var(--ink-500)]">{label}</View>
                <View className="mt-2.5 flex items-end gap-1 [font-family:var(--font-display-stack)] text-[clamp(30px,3vw,42px)] font-bold leading-[0.95] tracking-normal">
                  <Text>{display.value}</Text>
                  {display.suffix && <Text className="pb-1.5 [font-size:var(--text-sm)] font-semibold text-[var(--ink-500)]">{display.suffix}</Text>}
                </View>
              </View>
              <View className="mt-4 [font-size:var(--text-xs)] leading-[1.35] text-[var(--ink-500)]">{foot}</View>
            </CardContent>
          </Card>
        )
      })}

      {!expanded && metrics.length > 1 && (
        <Button variant="outline" className="md:hidden" onClick={() => setExpanded(true)}>
          Show {metrics.length - 1} more metrics
        </Button>
      )}
      {expanded && metrics.length > 1 && (
        <Button variant="outline" className="md:hidden" onClick={() => setExpanded(false)}>
          Show less
        </Button>
      )}
    </View>
  )
}


export function Field({ label, tooltip, required, optional, children, className }: { label: string; tooltip?: string; required?: boolean; optional?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <FieldRoot className={className}>
      <FieldLabel className="flex items-center gap-1.5">
        {label}
        {required && <span className="text-[var(--missed-600)] -ml-0.5">*</span>}
        {optional && <span className="text-[var(--ink-400)] normal-case font-normal">(Optional)</span>}
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3.5 text-[var(--ink-400)] hover:text-[var(--ink-600)] transition-colors -mt-[1px]" />
              </TooltipTrigger>
              <TooltipContent>{tooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </FieldLabel>
      {children}
    </FieldRoot>
  )
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return <View className="flex flex-wrap items-center justify-between gap-3">{children}</View>
}

export function InfoList({ rows }: { rows: [string, string][] }) {
  return (
    <View className="grid">
      {rows.map(([label, value]) => (
        <View key={label} className="flex items-center justify-between gap-3 border-b border-[var(--paper-200)] py-4 [font-size:var(--text-sm)] last:border-b-0">
          <Text className="text-[var(--ink-500)]">{label}</Text>
          <StrongText className="text-right [font-family:var(--font-mono-stack)] [font-size:var(--text-sm)]">{value}</StrongText>
        </View>
      ))}
    </View>
  )
}

export function InfoSwitch(props: { label: string; checked: boolean; onCheckedChange: (checked: boolean) => void; disabled?: boolean; loading?: boolean }) {
  return (
    <View className="flex items-center justify-between gap-4">
      <Text className="font-medium">{props.label}</Text>
      {props.loading ? (
        <View className="flex h-6 w-11 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-[var(--ink-400)]" />
        </View>
      ) : (
        <Switch checked={props.checked} onCheckedChange={props.onCheckedChange} disabled={props.disabled} />
      )}
    </View>
  )
}

export function Empty({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <EmptyRoot className="min-h-32">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyDescription>{text}</EmptyDescription>
      </EmptyHeader>
    </EmptyRoot>
  )
}

export function StatusBadge({ status, delay }: { status: string; delay?: number | null }) {
  const variant =
    status === "Completed" || status === "Active"
      ? status === "Active" ? "statusActive" : "statusCompleted"
      : status === "Missed" || status === "Deleted"
        ? status === "Deleted" ? "statusDeleted" : "statusMissed"
        : status === "Skipped" || status === "Inactive"
          ? status === "Inactive" ? "statusInactive" : "statusSkipped"
          : "statusPending"
  return (
    <Badge variant={variant}>
      {status === "Completed" && <Check className="size-3.5" />}
      {status}{status === "Completed" && typeof delay === "number" ? ` ${signed(delay)}m` : ""}
    </Badge>
  )
}

function LoadingShell() {
  return (
    <View className="grid min-h-svh place-items-center bg-[var(--paper-50)] p-6">
      <Card className="motion-reveal w-full max-w-md">
        <CardHeader>
          <Brand compact />
          <CardDescription>Loading workspace</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </CardContent>
      </Card>
    </View>
  )
}

export async function api<T>(url: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: HeadersInit = {}
  if (options.body !== undefined) headers["Content-Type"] = "application/json"
  if (["POST", "PATCH", "DELETE"].includes(options.method || "")) headers["Idempotency-Key"] = crypto.randomUUID()
  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  if (!response.ok) {
    const problem = await response.json().catch(() => null)
    const err: ApiError = new Error(problem?.detail || problem?.title || response.statusText || "An unexpected error occurred.")
    err.status = response.status
    throw err
  }
  const contentType = response.headers.get("content-type")
  if (!contentType?.includes("application/json")) return response as T
  const envelope = (await response.json()) as ApiEnvelope<T>
  return envelope.data
}

export async function postJson(url: string, body: unknown) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  })
}

export async function responseMessage(response: Response) {
  const problem = await response.json().catch(() => null)
  return problem?.detail || problem?.title || response.statusText || "An unexpected error occurred."
}

export async function downloadExport(format: string, range = "30d", startDate?: string, endDate?: string, routineId?: string) {
  let endpointUrl = `/api/v1/export?format=${format}&range=${range}`
  if (startDate) endpointUrl += `&startDate=${startDate}`
  if (endDate) endpointUrl += `&endDate=${endDate}`
  if (routineId && routineId !== "all") endpointUrl += `&routineId=${routineId}`
  const response = await fetch(endpointUrl)
  if (!response.ok) {
    toast.error("Export failed.")
    return
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `routineflow.${format}`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong."
}

function isAuthError(error: unknown) {
  const status = error instanceof Error ? (error as ApiError).status : undefined
  const message = error instanceof Error ? error.message : String(error)

  return status === 401 || message.includes("401") || message.includes("Authentication is required")
}

export function todayLocal() {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysClient(date: string, days: number) {
  const next = new Date(`${date}T00:00:00.000Z`)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}

export function calendarDays(date: string) {
  const monthStart = `${date.slice(0, 7)}-01`
  const first = new Date(`${monthStart}T00:00:00.000Z`)
  const start = addDaysClient(monthStart, -first.getUTCDay())
  return Array.from({ length: 42 }, (_, index) => addDaysClient(start, index))
}

export function sortOccurrence(a: Occurrence, b: Occurrence) {
  return a.date.localeCompare(b.date) || a.scheduledTime.localeCompare(b.scheduledTime)
}

export function routineTitle(workspace: Workspace, routineId: string) {
  return workspace.routines.find((routine) => routine.id === routineId)?.title || "Deleted routine"
}

export function categoryForOccurrence(workspace: Workspace, occurrence: Occurrence) {
  const routine = workspace.routines.find((item) => item.id === occurrence.routineId)
  return routine ? categoryName(workspace, routine.categoryId) : "Unknown category"
}

export function categoryName(workspace: Workspace, categoryId: string) {
  return workspace.categories.find((category) => category.id === categoryId)?.name || "Deleted category"
}

export function categoryColorClasses(color?: string | null) {
  switch (color?.toLowerCase()) {
    case "#1f9d5b":
      return { text: "text-[var(--completed-600)]", bg: "bg-[var(--completed-600)]" }
    case "#3e63ff":
      return { text: "text-[var(--signal-600)]", bg: "bg-[var(--signal-500)]" }
    case "#3a3d45":
      return { text: "text-[var(--ink-700)]", bg: "bg-[var(--ink-700)]" }
    case "#cf8a26":
      return { text: "text-[var(--skipped-600)]", bg: "bg-[var(--skipped-600)]" }
    case "#d83a3f":
      return { text: "text-[var(--missed-600)]", bg: "bg-[var(--missed-600)]" }
    case "#7c5cc4":
      return { text: "text-[#7c5cc4]", bg: "bg-[#7c5cc4]" }
    case "#0f766e":
      return { text: "text-[#0f766e]", bg: "bg-[#0f766e]" }
    case "#8b5cf6":
      return { text: "text-[#8b5cf6]", bg: "bg-[#8b5cf6]" }
    default:
      return { text: "text-[var(--pending-600)]", bg: "bg-[var(--pending-600)]" }
  }
}

export function reminderLabel(minutes: number) {
  return minutes === 0 ? "At scheduled time" : `${minutes} min before`
}

export function recurrenceLabel(routine: Routine) {
  if (routine.recurrenceType === "daily") return "Daily"
  if (routine.recurrenceType === "weekly" && "daysOfWeek" in routine.recurrenceRules) return `Weekly · ${routine.recurrenceRules.daysOfWeek.map((day) => weekdays[day]).join(", ")}`
  if (routine.recurrenceType === "monthly" && "daysOfMonth" in routine.recurrenceRules) return `Monthly · ${routine.recurrenceRules.daysOfMonth.join(", ")}`
  if (routine.recurrenceType === "yearly") return "Yearly"
  return titleCase(routine.recurrenceType)
}

export function signed(value: number) {
  return value > 0 ? `+${value}` : String(value)
}

function splitMetricValue(value: string) {
  const percent = value.match(/^(.+)%$/)
  if (percent) return { value: percent[1], suffix: "%" }
  const minutes = value.match(/^(.+)\s(min)$/)
  if (minutes) return { value: minutes[1], suffix: minutes[2] }
  const days = value.match(/^(.+)\s(days?)$/)
  if (days) return { value: days[1], suffix: days[2] }
  return { value, suffix: null }
}

export function titleCase(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1)
}

export function dotClass(status: string) {
  if (status === "Completed") return "bg-[var(--completed-600)]"
  if (status === "Missed") return "bg-[var(--missed-600)]"
  if (status === "Skipped") return "bg-[var(--skipped-600)]"
  return "bg-[var(--pending-600)]"
}
