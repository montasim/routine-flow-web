import type { LOG_STATUS_VALUES, RECURRENCE_VALUES, STATUS_VALUES } from "@/lib/constants"

export type RoutineStatus = (typeof STATUS_VALUES)[number]
export type LogStatus = (typeof LOG_STATUS_VALUES)[number]
export type RecurrenceType = (typeof RECURRENCE_VALUES)[number]

export type RecurrenceRules =
  | { type?: "daily" }
  | { daysOfWeek: number[] }
  | { daysOfMonth: number[] }
  | { dates: { month: number; day: number }[] }

export interface User {
  id: string
  name: string
  email: string
  image: string | null
  createdAt: string
  updatedAt: string
}

export interface UserSettings {
  id: string
  userId: string
  timezone: string
  defaultReminderMinutes: number
  notificationPreferences: {
    browserNotificationsEnabled: boolean
    overnightNotificationsDisabled: boolean
  }
  dataRetentionMonths: number | null
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  userId: string
  name: string
  normalizedName: string
  color: string
  description: string | null
  sortOrder: number
  isDeleted: boolean
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Routine {
  id: string
  userId: string
  title: string
  categoryId: string
  scheduledTime: string
  scheduleType: "fixed" | "dynamic"
  recurrenceType: RecurrenceType
  recurrenceRules: RecurrenceRules
  reminderOverride: number | null
  isActive: boolean
  isDeleted: boolean
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Occurrence {
  id: string
  routineId: string
  userId: string
  date: string
  scheduledTime: string
  scheduledTimeUtc: string
  timezoneAtGeneration: string
  status: RoutineStatus
  reminderMinutes: number
  notificationDueAt: string
  completedAt: string | null
  delayMinutes: number | null
  createdAt: string
  updatedAt: string
}

export interface RoutineLog {
  id: string
  routineId: string
  occurrenceId: string
  userId: string
  routineTitleAtLog: string
  routineCategoryIdAtLog: string
  routineCategoryNameAtLog: string
  routineCategoryColorAtLog: string
  scheduleTypeAtLog: "fixed" | "dynamic"
  recurrenceTypeAtLog: RecurrenceType
  recurrenceRulesAtLog: RecurrenceRules
  reminderMinutesAtLog: number
  date: string
  scheduledTime: string
  scheduledTimeUtc: string
  completedAt: string | null
  timezoneAtLog: string
  status: LogStatus
  delayMinutes: number | null
  createdAt: string
}

export interface Session {
  id: string
  userId: string
  token: string
  expiresAt: string
  ipAddress: string | null
  userAgent: string | null
  revokedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface OtpCode {
  id: string
  email: string
  codeHash: string
  name: string | null
  timezone: string
  attemptCount: number
  maxAttempts: number
  expiresAt: string
  resendAvailableAt: string
  consumedAt: string | null
  ipHash: string
  userAgentHash: string
  requestId: string
  createdAt: string
  updatedAt: string
}

export interface MobileSocialAuthCode {
  id: string
  codeHash: string
  userId: string
  provider: "google"
  redirectUri: string
  expiresAt: string
  consumedAt: string | null
  requestId: string
  createdAt: string
}

export interface IdempotencyRecord {
  id: string
  userId: string
  key: string
  method: string
  path: string
  requestFingerprint: string
  status: "in_progress" | "completed"
  responseStatus: number | null
  responseBody: unknown
  resourceType: string | null
  resourceId: string | null
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export interface SyncTombstone {
  id: string
  userId: string
  resourceType: "routine" | "occurrence" | "category"
  resourceId: string
  deletedAt: string
  reason: string
  createdAt: string
}

export interface ExportRecord {
  id: string
  userId: string
  createdAt: string
  label: string
  rows: number
  file: string
}

export interface ScheduledJobLog {
  id: string
  at: string
  label: string
  result: string
  requestId: string
}

export interface AppData {
  users: User[]
  userSettings: UserSettings[]
  categories: Category[]
  routines: Routine[]
  occurrences: Occurrence[]
  routineLogs: RoutineLog[]
  sessions: Session[]
  otpCodes: OtpCode[]
  mobileSocialAuthCodes: MobileSocialAuthCode[]
  idempotencyKeys: IdempotencyRecord[]
  syncTombstones: SyncTombstone[]
  exports: ExportRecord[]
  scheduledJobs: ScheduledJobLog[]
}

export interface CurrentUserContext {
  user: User
  settings: UserSettings
  session: Session
}

export interface AnalyticsMetrics {
  total: number
  completed: number
  missed: number
  skipped: number
  completionRate: number
  averageDelayMinutes: number
  consistencyScore: number
  delayPenalty: number
  disciplineScore: number
  behavioralDrift: number
}

