import {
  DEFAULT_REMINDER_MINUTES,
  DEFAULT_TIMEZONE,
  OCCURRENCE_WINDOW_DAYS,
} from "@/lib/constants"
import { normalizedName, randomId } from "@/lib/crypto"
import {
  addDays,
  currentLocalDate,
  delayMinutes,
  localDateTimeToUtcIso,
  notificationDueAtIso,
} from "@/lib/time"
import type {
  AppData,
  Category,
  Occurrence,
  RecurrenceRules,
  RecurrenceType,
  Routine,
  User,
  UserSettings,
} from "@/lib/types"

const createdAt = "2026-01-01T00:00:00.000Z"

export const DEMO_USER_ID = "user_demo"
export const DEMO_EMAIL = "demo@example.com"

export function emptyData(): AppData {
  return {
    users: [],
    userSettings: [],
    categories: [],
    routines: [],
    occurrences: [],
    routineLogs: [],
    sessions: [],
    otpCodes: [],
    mobileSocialAuthCodes: [],
    idempotencyKeys: [],
    syncTombstones: [],
    exports: [],
    scheduledJobs: [],
  }
}

export function createDefaultUser(email = DEMO_EMAIL, name = "Demo User", timezone = DEFAULT_TIMEZONE) {
  const now = new Date().toISOString()
  const user: User = {
    id: email === DEMO_EMAIL ? DEMO_USER_ID : `user_${Buffer.from(email).toString("base64url").slice(0, 16)}`,
    name,
    email,
    image: null,
    createdAt: now,
    updatedAt: now,
  }
  const settings: UserSettings = {
    id: `settings_${user.id}`,
    userId: user.id,
    timezone,
    defaultReminderMinutes: DEFAULT_REMINDER_MINUTES,
    notificationPreferences: {
      browserNotificationsEnabled: false,
      overnightNotificationsDisabled: false,
    },
    dataRetentionMonths: null,
    createdAt: now,
    updatedAt: now,
  }
  return { user, settings }
}

export function seedWorkspaceForUser(data: AppData, userId: string, timezone = DEFAULT_TIMEZONE) {
  if (data.categories.some((category) => category.userId === userId)) return

  const categories: Category[] = [
    category(userId, "cat_fitness", "Fitness", "#1f9d5b", "Strength, mobility, and physical training routines.", 10),
    category(userId, "cat_health", "Health", "#3e63ff", "Daily health maintenance and medication routines.", 20),
    category(userId, "cat_work", "Work", "#3a3d45", "Focused execution and professional review blocks.", 30),
    category(userId, "cat_mind", "Mind", "#cf8a26", "Learning, reflection, and mental training routines.", 40),
    category(userId, "cat_personal", "Personal", "#d83a3f", "Home, reading, and personal-life routines.", 50),
    category(userId, "cat_spiritual", "Spiritual", "#7c5cc4", "Prayer and reflection routines.", 60),
  ]
  data.categories.push(...categories)

  const byName = new Map(categories.map((item) => [item.name, item.id]))
  const routines: Routine[] = [
    routine(userId, "r1", "Morning Gym", byName.get("Fitness")!, "07:00", "weekly", { daysOfWeek: [1, 3, 5] }, null),
    routine(userId, "r2", "Vitamins", byName.get("Health")!, "08:15", "daily", {}, 5),
    routine(userId, "r3", "Deep work block", byName.get("Work")!, "09:30", "weekly", { daysOfWeek: [1, 2, 3, 4, 5] }, null),
    routine(userId, "r4", "Language practice", byName.get("Mind")!, "18:00", "daily", {}, 30),
    routine(userId, "r5", "Read 20 minutes", byName.get("Personal")!, "22:30", "daily", {}, null),
    routine(userId, "r6", "Weekly review", byName.get("Work")!, "16:00", "weekly", { daysOfWeek: [5] }, 60),
  ]
  data.routines.push(...routines)

  const today = currentLocalDate(timezone)
  const logSeeds = [
    ["r2", -1, "08:15", "08:15", "Completed"],
    ["r1", -3, "07:00", "07:11", "Completed"],
    ["r3", -3, "09:30", null, "Missed"],
    ["r4", -3, "18:00", "18:33", "Completed"],
    ["r5", -3, "22:30", null, "Skipped"],
    ["r2", -3, "08:15", "08:18", "Completed"],
    ["r1", -4, "07:00", "06:58", "Completed"],
    ["r3", -4, "09:30", "09:42", "Completed"],
    ["r6", -4, "16:00", "16:07", "Completed"],
    ["r4", -4, "18:00", null, "Missed"],
    ["r5", -4, "22:30", "22:28", "Completed"],
    ["r2", -4, "08:15", "08:16", "Completed"],
  ] as const

  for (const [routineId, offset, scheduledTime, completedTime, status] of logSeeds) {
    const date = addDays(today, offset)
    const seedRoutine = routines.find((item) => item.id === routineId)
    if (!seedRoutine) continue
    const seedCategory = categories.find((item) => item.id === seedRoutine.categoryId)
    if (!seedCategory) continue
    const scheduledTimeUtc = localDateTimeToUtcIso(date, scheduledTime, timezone)
    const completedAt = completedTime ? localDateTimeToUtcIso(date, completedTime, timezone) : null
    data.routineLogs.push({
      id: randomId("log"),
      routineId,
      occurrenceId: randomId("occ_hist"),
      userId,
      routineTitleAtLog: seedRoutine.title,
      routineCategoryIdAtLog: seedCategory.id,
      routineCategoryNameAtLog: seedCategory.name,
      routineCategoryColorAtLog: seedCategory.color,
      scheduleTypeAtLog: seedRoutine.scheduleType,
      recurrenceTypeAtLog: seedRoutine.recurrenceType,
      recurrenceRulesAtLog: seedRoutine.recurrenceRules,
      reminderMinutesAtLog: seedRoutine.reminderOverride ?? DEFAULT_REMINDER_MINUTES,
      date,
      scheduledTime,
      scheduledTimeUtc,
      completedAt,
      timezoneAtLog: timezone,
      status,
      delayMinutes: completedAt ? delayMinutes(completedAt, scheduledTimeUtc) : null,
      createdAt: completedAt ?? localDateTimeToUtcIso(date, "23:59", timezone),
    })
  }

  for (const date of Array.from({ length: OCCURRENCE_WINDOW_DAYS }, (_, index) => addDays(today, index))) {
    for (const item of routines) {
      if (!occursOnSeed(item, date)) continue
      const reminderMinutes = item.reminderOverride ?? DEFAULT_REMINDER_MINUTES
      const scheduledTimeUtc = localDateTimeToUtcIso(date, item.scheduledTime, timezone)
      const occurrence: Occurrence = {
        id: randomId("occ"),
        routineId: item.id,
        userId,
        date,
        scheduledTime: item.scheduledTime,
        scheduledTimeUtc,
        timezoneAtGeneration: timezone,
        status: "Pending",
        reminderMinutes,
        notificationDueAt: notificationDueAtIso(scheduledTimeUtc, reminderMinutes),
        completedAt: null,
        delayMinutes: null,
        createdAt,
        updatedAt: createdAt,
      }
      data.occurrences.push(occurrence)
    }
  }

  data.exports.push({
    id: randomId("export"),
    userId,
    createdAt: addDays(today, -10) + "T08:20:00.000Z",
    label: "Last 30 days - all routines",
    rows: data.routineLogs.filter((log) => log.userId === userId).length,
    file: `routineflow_${today}.xlsx`,
  })

  data.scheduledJobs.push(
    {
      id: randomId("job"),
      at: new Date().toISOString(),
      label: "Occurrence generator",
      result: "7-day window healthy",
      requestId: "seed",
    },
    {
      id: randomId("job"),
      at: new Date().toISOString(),
      label: "Missed detection",
      result: "No unresolved past pending occurrences",
      requestId: "seed",
    }
  )
}

export function createSeedData() {
  const data = emptyData()
  const { user, settings } = createDefaultUser()
  data.users.push(user)
  data.userSettings.push(settings)
  seedWorkspaceForUser(data, user.id, settings.timezone)
  return data
}

function category(userId: string, id: string, name: string, color: string, description: string, sortOrder: number): Category {
  return {
    id: `${id}_${userId}`,
    userId,
    name,
    normalizedName: normalizedName(name),
    color,
    description,
    sortOrder,
    isDeleted: false,
    deletedAt: null,
    createdAt,
    updatedAt: createdAt,
  }
}

function routine(
  userId: string,
  id: string,
  title: string,
  categoryId: string,
  scheduledTime: string,
  recurrenceType: RecurrenceType,
  recurrenceRules: RecurrenceRules,
  reminderOverride: number | null
): Routine {
  return {
    id: `${id}_${userId}`,
    userId,
    title,
    categoryId,
    scheduledTime,
    scheduleType: "fixed",
    recurrenceType,
    recurrenceRules,
    reminderOverride,
    isActive: true,
    isDeleted: false,
    deletedAt: null,
    createdAt,
    updatedAt: createdAt,
  }
}

function occursOnSeed(routine: Routine, date: string) {
  const plain = new Date(`${date}T00:00:00.000Z`)
  const day = plain.getUTCDay()
  const monthDay = plain.getUTCDate()
  const month = plain.getUTCMonth() + 1

  if (!routine.isActive || routine.isDeleted) return false
  if (routine.recurrenceType === "daily") return true
  if (routine.recurrenceType === "weekly") return "daysOfWeek" in routine.recurrenceRules && routine.recurrenceRules.daysOfWeek.includes(day)
  if (routine.recurrenceType === "monthly") {
    return "daysOfMonth" in routine.recurrenceRules && routine.recurrenceRules.daysOfMonth.includes(monthDay)
  }
  return "dates" in routine.recurrenceRules && routine.recurrenceRules.dates.some((item) => item.month === month && item.day === monthDay)
}
