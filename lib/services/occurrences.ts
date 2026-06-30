import { conflict, forbidden, notFound } from "@/lib/errors"
import { randomId } from "@/lib/crypto"
import {
  addDays,
  compareLocalDate,
  currentLocalDate,
  dayOfMonth,
  dayOfWeek,
  delayMinutes,
  localDateTimeToUtcIso,
  monthAndDay,
  notificationDueAtIso,
  nowIso,
  occurrenceWindow,
} from "@/lib/time"
import type { AppData, Category, Occurrence, Routine, RoutineLog, UserSettings } from "@/lib/types"

export function occursOn(routine: Routine, date: string) {
  if (!routine.isActive || routine.isDeleted || routine.scheduleType !== "fixed") return false
  if (routine.recurrenceType === "daily") return true
  if (routine.recurrenceType === "weekly") {
    return "daysOfWeek" in routine.recurrenceRules && routine.recurrenceRules.daysOfWeek.includes(dayOfWeek(date))
  }
  if (routine.recurrenceType === "monthly") {
    return "daysOfMonth" in routine.recurrenceRules && routine.recurrenceRules.daysOfMonth.includes(dayOfMonth(date))
  }
  const { month, day } = monthAndDay(date)
  return "dates" in routine.recurrenceRules && routine.recurrenceRules.dates.some((item) => item.month === month && item.day === day)
}

export function generateOccurrencesForUser(data: AppData, userId: string) {
  const settings = requireSettings(data, userId)
  const window = occurrenceWindow(settings.timezone)
  let generated = 0
  for (const routine of data.routines.filter((item) => item.userId === userId && item.isActive && !item.isDeleted)) {
    for (const date of window.dates) {
      if (!occursOn(routine, date)) continue
      const exists = data.occurrences.some((item) => item.userId === userId && item.routineId === routine.id && item.date === date)
      if (exists) continue
      data.occurrences.push(makeOccurrence(routine, settings, date))
      generated++
    }
  }
  return { windowStart: window.start, windowEnd: window.end, occurrencesGenerated: generated }
}

export function markMissedForUser(data: AppData, userId: string) {
  const settings = requireSettings(data, userId)
  const today = currentLocalDate(settings.timezone)
  let missedMarked = 0

  for (const occurrence of data.occurrences.filter((item) => item.userId === userId && item.status === "Pending" && compareLocalDate(item.date, today) < 0)) {
    occurrence.status = "Missed"
    occurrence.updatedAt = nowIso()
    occurrence.delayMinutes = null
    occurrence.completedAt = null
    if (!data.routineLogs.some((log) => log.occurrenceId === occurrence.id)) {
      data.routineLogs.unshift(makeLog(data, occurrence, "Missed", null))
    }
    missedMarked++
  }
  return missedMarked
}

export function regeneratePendingWindow(data: AppData, userId: string) {
  const settings = requireSettings(data, userId)
  const today = currentLocalDate(settings.timezone)
  data.occurrences = data.occurrences.filter(
    (item) => !(item.userId === userId && item.status === "Pending" && compareLocalDate(item.date, today) >= 0)
  )
  return generateOccurrencesForUser(data, userId)
}

export function removePendingFutureOccurrences(data: AppData, userId: string, routineId: string) {
  const settings = requireSettings(data, userId)
  const today = currentLocalDate(settings.timezone)
  const before = data.occurrences.length
  data.occurrences = data.occurrences.filter(
    (item) => !(item.userId === userId && item.routineId === routineId && item.status === "Pending" && compareLocalDate(item.date, today) >= 0)
  )
  return before - data.occurrences.length
}

export function completeOccurrence(data: AppData, userId: string, occurrenceId: string) {
  const settings = requireSettings(data, userId)
  const occurrence = requireOccurrence(data, userId, occurrenceId)
  assertPendingToday(occurrence, settings)
  const completedAt = nowIso()
  occurrence.status = "Completed"
  occurrence.completedAt = completedAt
  occurrence.delayMinutes = delayMinutes(completedAt, occurrence.scheduledTimeUtc)
  occurrence.updatedAt = completedAt
  const log = makeLog(data, occurrence, "Completed", completedAt)
  data.routineLogs.unshift(log)
  return { occurrence, log }
}

export function skipOccurrence(data: AppData, userId: string, occurrenceId: string) {
  const settings = requireSettings(data, userId)
  const occurrence = requireOccurrence(data, userId, occurrenceId)
  assertPendingToday(occurrence, settings)
  const now = nowIso()
  occurrence.status = "Skipped"
  occurrence.completedAt = null
  occurrence.delayMinutes = null
  occurrence.updatedAt = now
  const log = makeLog(data, occurrence, "Skipped", null)
  data.routineLogs.unshift(log)
  return { occurrence, log }
}

export function makeOccurrence(routine: Routine, settings: UserSettings, date: string): Occurrence {
  const reminderMinutes = routine.reminderOverride ?? settings.defaultReminderMinutes
  const scheduledTimeUtc = localDateTimeToUtcIso(date, routine.scheduledTime, settings.timezone)
  const now = nowIso()
  return {
    id: randomId("occ"),
    routineId: routine.id,
    userId: routine.userId,
    date,
    scheduledTime: routine.scheduledTime,
    scheduledTimeUtc,
    timezoneAtGeneration: settings.timezone,
    status: "Pending",
    reminderMinutes,
    notificationDueAt: notificationDueAtIso(scheduledTimeUtc, reminderMinutes),
    completedAt: null,
    delayMinutes: null,
    createdAt: now,
    updatedAt: now,
  }
}

export function makeLog(data: AppData, occurrence: Occurrence, status: "Completed" | "Missed" | "Skipped", completedAt: string | null): RoutineLog {
  if (data.routineLogs.some((item) => item.occurrenceId === occurrence.id)) {
    throw conflict("LOG_ALREADY_EXISTS", "This occurrence already has a finalized routine log.")
  }
  const routine = data.routines.find((item) => item.id === occurrence.routineId && item.userId === occurrence.userId)
  if (!routine) throw notFound("Routine")
  const category = data.categories.find((item) => item.id === routine.categoryId && item.userId === occurrence.userId)
  const fallbackCategory: Category = {
    id: routine.categoryId,
    userId: occurrence.userId,
    name: "Deleted category",
    normalizedName: "deleted category",
    color: "#8b8f99",
    description: null,
    sortOrder: 0,
    isDeleted: true,
    deletedAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  const cat = category ?? fallbackCategory
  return {
    id: randomId("log"),
    routineId: routine.id,
    occurrenceId: occurrence.id,
    userId: occurrence.userId,
    routineTitleAtLog: routine.title,
    routineCategoryIdAtLog: cat.id,
    routineCategoryNameAtLog: cat.name,
    routineCategoryColorAtLog: cat.color,
    scheduleTypeAtLog: routine.scheduleType,
    recurrenceTypeAtLog: routine.recurrenceType,
    recurrenceRulesAtLog: routine.recurrenceRules,
    reminderMinutesAtLog: occurrence.reminderMinutes,
    date: occurrence.date,
    scheduledTime: occurrence.scheduledTime,
    scheduledTimeUtc: occurrence.scheduledTimeUtc,
    completedAt,
    timezoneAtLog: occurrence.timezoneAtGeneration,
    status,
    delayMinutes: status === "Completed" && completedAt ? delayMinutes(completedAt, occurrence.scheduledTimeUtc) : null,
    createdAt: nowIso(),
  }
}

function requireSettings(data: AppData, userId: string) {
  const settings = data.userSettings.find((item) => item.userId === userId)
  if (!settings) throw forbidden("User settings were not initialized.")
  return settings
}

function requireOccurrence(data: AppData, userId: string, occurrenceId: string) {
  const occurrence = data.occurrences.find((item) => item.id === occurrenceId && item.userId === userId)
  if (!occurrence) throw notFound("Occurrence")
  return occurrence
}

function assertPendingToday(occurrence: Occurrence, settings: UserSettings) {
  if (occurrence.status !== "Pending") throw conflict("OCCURRENCE_NOT_PENDING", "Only pending occurrences can be finalized.")
  const today = currentLocalDate(settings.timezone)
  if (occurrence.date !== today) {
    throw forbidden("Only occurrences for the user's current local date can be completed or skipped.")
  }
}

export function datesForWindow(settings: UserSettings) {
  const start = currentLocalDate(settings.timezone)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}
