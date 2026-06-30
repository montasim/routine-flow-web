import { DEFAULT_REMINDER_MINUTES, DEFAULT_TIMEZONE } from "@/lib/constants"
import type {
  AppData,
  IdempotencyRecord,
  Occurrence,
  User,
  UserSettings,
} from "@/lib/types"

export function normalizeAppData(data: AppData) {
  const now = new Date().toISOString()
  const { userIds, remapUserId } = normalizeUsers(data, now)

  data.userSettings = normalizeSettings(data.userSettings, data.users, userIds, remapUserId, now)
  data.categories = dedupeBy(
    normalizeOwned(data.categories, userIds, remapUserId).map((category) => {
      category.normalizedName = category.normalizedName || category.name.toLowerCase().trim()
      return category
    }),
    (category) => `${category.userId}:${category.normalizedName}:${category.isDeleted}`
  )
  data.routines = dedupeBy(normalizeOwned(data.routines, userIds, remapUserId), (routine) => routine.id)
  data.occurrences = dedupeBy(normalizeOwned(data.occurrences, userIds, remapUserId), occurrenceKey)
  data.routineLogs = dedupeBy(normalizeOwned(data.routineLogs, userIds, remapUserId), (log) => log.occurrenceId || log.id)
  data.sessions = dedupeBy(
    normalizeOwned(data.sessions, userIds, remapUserId).filter((session) => Boolean(session.token)),
    (session) => session.token
  )
  data.mobileSocialAuthCodes = dedupeBy(
    normalizeOwned(data.mobileSocialAuthCodes, userIds, remapUserId).filter((code) => Boolean(code.codeHash)),
    (code) => code.codeHash
  )
  data.idempotencyKeys = dedupeBy(normalizeOwned(data.idempotencyKeys, userIds, remapUserId), idempotencyKey)
  data.syncTombstones = dedupeBy(normalizeOwned(data.syncTombstones, userIds, remapUserId), (tombstone) => tombstone.id)
  data.exports = dedupeBy(normalizeOwned(data.exports, userIds, remapUserId), (record) => record.id)

  return data
}

function normalizeUsers(data: AppData, now: string) {
  const usersByEmail = new Map<string, User>()
  const idMap = new Map<string, string>()
  const users: User[] = []

  for (const rawUser of data.users) {
    const record = rawUser as Partial<User>
    const email = stringValue(record.email)?.toLowerCase()
    if (!email) continue

    const sourceId = stringValue(record.id)
    const userId = sourceId || userIdFromEmail(email)
    const existing = usersByEmail.get(email)
    if (existing) {
      if (sourceId) idMap.set(sourceId, existing.id)
      continue
    }

    const user = rawUser
    user.id = userId
    user.email = email
    user.name = stringValue(record.name) || email.split("@")[0]
    user.image = stringValue(record.image)
    user.createdAt = stringValue(record.createdAt) || now
    user.updatedAt = stringValue(record.updatedAt) || user.createdAt
    usersByEmail.set(email, user)
    users.push(user)
    idMap.set(userId, userId)
    if (sourceId) idMap.set(sourceId, userId)
  }

  data.users = users
  const userIds = new Set(users.map((user) => user.id))
  return {
    userIds,
    remapUserId: (userId: unknown) => {
      const value = stringValue(userId)
      return value ? idMap.get(value) ?? value : null
    },
  }
}

function normalizeSettings(
  rawSettings: UserSettings[],
  users: User[],
  userIds: Set<string>,
  remapUserId: (userId: unknown) => string | null,
  now: string
) {
  const settingsByUserId = new Map<string, UserSettings>()

  for (const raw of rawSettings) {
    const userId = remapUserId((raw as Partial<UserSettings>).userId)
    if (!userId || !userIds.has(userId) || settingsByUserId.has(userId)) continue
    settingsByUserId.set(userId, normalizeSetting(raw, userId, now))
  }

  for (const user of users) {
    if (!settingsByUserId.has(user.id)) {
      settingsByUserId.set(user.id, defaultSettings(user.id, DEFAULT_TIMEZONE, now))
    }
  }

  return Array.from(settingsByUserId.values())
}

function normalizeSetting(raw: UserSettings, userId: string, now: string): UserSettings {
  const record = raw as Partial<UserSettings>
  const preferences = record.notificationPreferences ?? {
    browserNotificationsEnabled: false,
    overnightNotificationsDisabled: false,
  }

  return {
    ...raw,
    id: stringValue(record.id) || `settings_${userId}`,
    userId,
    timezone: stringValue(record.timezone) || DEFAULT_TIMEZONE,
    defaultReminderMinutes: numberValue(record.defaultReminderMinutes) ?? DEFAULT_REMINDER_MINUTES,
    notificationPreferences: {
      browserNotificationsEnabled: Boolean(preferences.browserNotificationsEnabled),
      overnightNotificationsDisabled: Boolean(preferences.overnightNotificationsDisabled),
    },
    dataRetentionMonths: numberValue(record.dataRetentionMonths),
    createdAt: stringValue(record.createdAt) || now,
    updatedAt: stringValue(record.updatedAt) || stringValue(record.createdAt) || now,
  }
}

function defaultSettings(userId: string, timezone: string, now: string): UserSettings {
  return {
    id: `settings_${userId}`,
    userId,
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
}

function normalizeOwned<T extends { userId: string }>(items: T[], userIds: Set<string>, remapUserId: (userId: unknown) => string | null) {
  return items.filter((item) => {
    const userId = remapUserId((item as Partial<T>).userId)
    if (!userId || !userIds.has(userId)) return false
    item.userId = userId
    return true
  })
}

function dedupeBy<T>(items: T[], keyFor: (item: T) => string | null | undefined) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = keyFor(item)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function occurrenceKey(occurrence: Occurrence) {
  return `${occurrence.userId}:${occurrence.routineId}:${occurrence.date}`
}

function idempotencyKey(record: IdempotencyRecord) {
  return `${record.userId}:${record.method}:${record.path}:${record.key}`
}

function userIdFromEmail(email: string) {
  return `user_${Buffer.from(email).toString("base64url").slice(0, 16)}`
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}
