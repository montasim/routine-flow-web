import { normalizedName, randomId } from "@/lib/crypto"
import { conflict, notFound } from "@/lib/errors"
import type { CategoryCreateInput, CategoryPatchInput, RoutineCreateInput, RoutinePatchInput, SettingsPatchInput } from "@/lib/schemas"
import { currentLocalDate, nowIso } from "@/lib/time"
import type { AppData, Category, Routine, SyncTombstone, UserSettings } from "@/lib/types"
import { generateOccurrencesForUser, markMissedForUser, regeneratePendingWindow, removePendingFutureOccurrences } from "@/lib/services/occurrences"

export function listCategories(data: AppData, userId: string, includeDeleted = false) {
  return data.categories
    .filter((item) => item.userId === userId && (includeDeleted || !item.isDeleted))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

export function createCategory(data: AppData, userId: string, input: CategoryCreateInput) {
  assertUniqueCategory(data, userId, input.name)
  const now = nowIso()
  const category: Category = {
    id: randomId("cat"),
    userId,
    name: input.name,
    normalizedName: normalizedName(input.name),
    color: input.color,
    description: input.description ?? null,
    sortOrder: input.sortOrder ?? nextSortOrder(data, userId),
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  data.categories.push(category)
  return category
}

export function updateCategory(data: AppData, userId: string, id: string, input: CategoryPatchInput) {
  const category = requireCategory(data, userId, id)
  if (input.name && normalizedName(input.name) !== category.normalizedName) assertUniqueCategory(data, userId, input.name, id)
  if (input.name) {
    category.name = input.name
    category.normalizedName = normalizedName(input.name)
  }
  if (input.color) category.color = input.color
  if (input.description !== undefined) category.description = input.description
  if (input.sortOrder !== undefined) category.sortOrder = input.sortOrder
  category.updatedAt = nowIso()
  return category
}

export function deleteCategory(data: AppData, userId: string, id: string) {
  const category = requireCategory(data, userId, id)
  const inUse = data.routines.some((routine) => routine.userId === userId && routine.categoryId === id && !routine.isDeleted)
  if (inUse) throw conflict("CATEGORY_IN_USE", "Delete is blocked while routines reference this category.")
  const now = nowIso()
  category.isDeleted = true
  category.deletedAt = now
  category.updatedAt = now
  const tombstone = addTombstone(data, userId, "category", id, "Category soft delete")
  return { deleted: true, category: { id: category.id, isDeleted: category.isDeleted, deletedAt: category.deletedAt }, tombstone }
}

export function listRoutines(data: AppData, userId: string, options: { includeInactive?: boolean; includeDeleted?: boolean; categoryId?: string }) {
  return data.routines
    .filter((item) => item.userId === userId)
    .filter((item) => options.includeDeleted || !item.isDeleted)
    .filter((item) => options.includeInactive || item.isActive)
    .filter((item) => !options.categoryId || item.categoryId === options.categoryId)
    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime) || a.title.localeCompare(b.title))
}

export function createRoutine(data: AppData, userId: string, input: RoutineCreateInput) {
  requireCategory(data, userId, input.categoryId)
  const now = nowIso()
  const routine: Routine = {
    id: randomId("routine"),
    userId,
    title: input.title,
    categoryId: input.categoryId,
    scheduledTime: input.scheduledTime,
    scheduleType: "fixed",
    recurrenceType: input.recurrenceType,
    recurrenceRules: input.recurrenceRules,
    reminderOverride: input.reminderOverride,
    isActive: true,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  data.routines.push(routine)
  generateOccurrencesForUser(data, userId)
  return routine
}

export function updateRoutine(data: AppData, userId: string, id: string, input: RoutinePatchInput) {
  const routine = requireRoutine(data, userId, id)
  if (input.categoryId) requireCategory(data, userId, input.categoryId)
  const affectsSchedule =
    input.scheduledTime !== undefined ||
    input.recurrenceType !== undefined ||
    input.recurrenceRules !== undefined ||
    input.reminderOverride !== undefined ||
    input.isActive !== undefined

  Object.assign(routine, {
    ...input,
    scheduleType: "fixed",
    updatedAt: nowIso(),
  })
  if (affectsSchedule) regeneratePendingWindow(data, userId)
  return routine
}

export function deleteRoutine(data: AppData, userId: string, id: string) {
  const routine = requireRoutine(data, userId, id)
  markMissedForUser(data, userId)
  const removed = removePendingFutureOccurrences(data, userId, id)
  const now = nowIso()
  routine.isDeleted = true
  routine.isActive = false
  routine.deletedAt = now
  routine.updatedAt = now
  const tombstone = addTombstone(data, userId, "routine", id, "Routine soft delete")
  return {
    deleted: true,
    routine: { id: routine.id, isDeleted: routine.isDeleted, deletedAt: routine.deletedAt },
    pendingOccurrencesRemoved: removed,
    tombstone,
  }
}

export function updateSettings(data: AppData, userId: string, input: SettingsPatchInput) {
  const settings = data.userSettings.find((item) => item.userId === userId)
  if (!settings) throw notFound("Settings")
  const oldTimezone = settings.timezone
  const timezoneChanged = input.timezone && input.timezone !== settings.timezone
  const reminderChanged = input.defaultReminderMinutes !== undefined && input.defaultReminderMinutes !== settings.defaultReminderMinutes

  if (input.timezone) settings.timezone = input.timezone
  if (input.defaultReminderMinutes !== undefined) settings.defaultReminderMinutes = input.defaultReminderMinutes
  if (input.notificationPreferences) {
    settings.notificationPreferences = {
      ...settings.notificationPreferences,
      ...input.notificationPreferences,
    }
  }
  if (input.dataRetentionMonths !== undefined) settings.dataRetentionMonths = input.dataRetentionMonths
  settings.updatedAt = nowIso()

  let occurrencesRegenerated = 0
  let occurrencesPreserved = 0
  if (timezoneChanged || reminderChanged) {
    const before = data.occurrences.filter((item) => item.userId === userId && item.status === "Pending").length
    const result = regeneratePendingWindow(data, userId)
    occurrencesRegenerated = result.occurrencesGenerated
    occurrencesPreserved = before - occurrencesRegenerated
    if (timezoneChanged) {
      data.scheduledJobs.unshift({
        id: randomId("job"),
        at: nowIso(),
        label: "Timezone changed",
        result: `${oldTimezone} -> ${settings.timezone}; current day ${currentLocalDate(settings.timezone)}`,
        requestId: "settings",
      })
    }
  }
  return {
    settings,
    oldTimezone,
    newTimezone: settings.timezone,
    occurrencesRegenerated,
    occurrencesPreserved: Math.max(0, occurrencesPreserved),
    notificationJobsUpdated: occurrencesRegenerated,
  }
}

export function requireCategory(data: AppData, userId: string, id: string) {
  const category = data.categories.find((item) => item.userId === userId && item.id === id && !item.isDeleted)
  if (!category) throw notFound("Category")
  return category
}

export function requireRoutine(data: AppData, userId: string, id: string) {
  const routine = data.routines.find((item) => item.userId === userId && item.id === id)
  if (!routine) throw notFound("Routine")
  return routine
}

export function addTombstone(data: AppData, userId: string, resourceType: SyncTombstone["resourceType"], resourceId: string, reason: string) {
  const tombstone: SyncTombstone = {
    id: randomId("tomb"),
    userId,
    resourceType,
    resourceId,
    deletedAt: nowIso(),
    reason,
    createdAt: nowIso(),
  }
  data.syncTombstones.push(tombstone)
  return tombstone
}

function assertUniqueCategory(data: AppData, userId: string, name: string, excludeId?: string) {
  const clean = normalizedName(name)
  const duplicate = data.categories.find(
    (item) => item.userId === userId && item.normalizedName === clean && !item.isDeleted && item.id !== excludeId
  )
  if (duplicate) throw conflict("CATEGORY_NAME_EXISTS", "Category names must be unique per user.")
}

function nextSortOrder(data: AppData, userId: string) {
  const max = Math.max(0, ...data.categories.filter((item) => item.userId === userId).map((item) => item.sortOrder))
  return max + 10
}

export function publicSettings(settings: UserSettings) {
  return settings
}

