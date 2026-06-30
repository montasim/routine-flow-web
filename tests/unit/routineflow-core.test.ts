import { describe, expect, test } from "vitest"

import { createGoogleOAuthState, parseGoogleOAuthState } from "@/app/api/v1/auth/social/google/oauth-state"
import { conflict } from "@/lib/errors"
import { createSeedData, DEMO_USER_ID } from "@/lib/seed"
import { metricsFromLogs } from "@/lib/services/analytics"
import {
  completeOccurrence,
  generateOccurrencesForUser,
  makeOccurrence,
  markMissedForUser,
  occursOn,
} from "@/lib/services/occurrences"
import {
  completeIdempotency,
  fingerprint,
  replayOrStartIdempotency,
} from "@/lib/services/shared"
import { normalizeAppData } from "@/lib/storage/normalize"
import { addDays, currentLocalDate } from "@/lib/time"

describe("RoutineFlow core behavior", () => {
  test("recurrence matching supports daily, weekly, monthly, and yearly rules", () => {
    const data = createSeedData()
    const routine = data.routines.find((item) => item.userId === DEMO_USER_ID)!

    expect(occursOn({ ...routine, recurrenceType: "daily", recurrenceRules: {} }, "2026-06-30")).toBe(true)
    expect(occursOn({ ...routine, recurrenceType: "weekly", recurrenceRules: { daysOfWeek: [2] } }, "2026-06-30")).toBe(true)
    expect(occursOn({ ...routine, recurrenceType: "monthly", recurrenceRules: { daysOfMonth: [30] } }, "2026-06-30")).toBe(true)
    expect(occursOn({ ...routine, recurrenceType: "yearly", recurrenceRules: { dates: [{ month: 6, day: 30 }] } }, "2026-06-30")).toBe(true)
  })

  test("rolling occurrence generation is idempotent for user/routine/date", () => {
    const data = createSeedData()
    const before = data.occurrences.length

    const first = generateOccurrencesForUser(data, DEMO_USER_ID)
    const afterFirst = data.occurrences.length
    const second = generateOccurrencesForUser(data, DEMO_USER_ID)

    expect(first.occurrencesGenerated).toBe(0)
    expect(second.occurrencesGenerated).toBe(0)
    expect(afterFirst).toBe(before)
    expect(data.occurrences.length).toBe(before)
  })

  test("completion writes one log with routine/category/timezone snapshots", () => {
    const data = createSeedData()
    const settings = data.userSettings.find((item) => item.userId === DEMO_USER_ID)!
    const today = currentLocalDate(settings.timezone)
    const occurrence = data.occurrences.find((item) => item.userId === DEMO_USER_ID && item.date === today && item.status === "Pending")!

    const result = completeOccurrence(data, DEMO_USER_ID, occurrence.id)

    expect(result.occurrence.status).toBe("Completed")
    expect(result.log.occurrenceId).toBe(occurrence.id)
    expect(result.log.routineTitleAtLog).toBeTruthy()
    expect(result.log.routineCategoryNameAtLog).toBeTruthy()
    expect(result.log.routineCategoryColorAtLog).toMatch(/^#[0-9a-fA-F]{6}$/)
    expect(result.log.timezoneAtLog).toBe(settings.timezone)
    expect(data.routineLogs.filter((log) => log.occurrenceId === occurrence.id)).toHaveLength(1)
  })

  test("missed detection finalizes older pending occurrences and does not duplicate logs", () => {
    const data = createSeedData()
    const settings = data.userSettings.find((item) => item.userId === DEMO_USER_ID)!
    const routine = data.routines.find((item) => item.userId === DEMO_USER_ID)!
    const yesterday = addDays(currentLocalDate(settings.timezone), -1)
    const occurrence = makeOccurrence(routine, settings, yesterday)
    data.occurrences.push(occurrence)

    expect(markMissedForUser(data, DEMO_USER_ID)).toBe(1)
    expect(markMissedForUser(data, DEMO_USER_ID)).toBe(0)
    expect(data.routineLogs.filter((log) => log.occurrenceId === occurrence.id && log.status === "Missed")).toHaveLength(1)
  })

  test("analytics are computed from finalized routine_logs only", () => {
    const data = createSeedData()
    const logs = data.routineLogs.filter((log) => log.userId === DEMO_USER_ID)
    const metrics = metricsFromLogs(logs)

    expect(metrics.total).toBe(logs.length)
    expect(metrics.completed).toBe(logs.filter((log) => log.status === "Completed").length)
    expect(metrics.missed).toBe(logs.filter((log) => log.status === "Missed").length)
    expect(metrics.skipped).toBe(logs.filter((log) => log.status === "Skipped").length)
  })

  test("idempotency replays same fingerprint and rejects different fingerprints", () => {
    const data = createSeedData()
    const input = {
      userId: DEMO_USER_ID,
      key: "idem-key",
      method: "POST",
      path: "/api/v1/routines",
      requestFingerprint: fingerprint({ title: "A" }),
    }

    expect(replayOrStartIdempotency(data, input)).toBeNull()
    completeIdempotency(data, {
      userId: DEMO_USER_ID,
      key: input.key,
      method: input.method,
      path: input.path,
      status: 201,
      body: { routine: { id: "routine_1" } },
      resourceType: "routine",
      resourceId: "routine_1",
    })

    const replay = replayOrStartIdempotency(data, input)
    expect(replay?.responseStatus).toBe(201)
    expect(() =>
      replayOrStartIdempotency(data, {
        ...input,
        requestFingerprint: fingerprint({ title: "B" }),
      })
    ).toThrow(conflict("IDEMPOTENCY_KEY_REUSED", "The same Idempotency-Key was reused with a different request body.").constructor)
  })

  test("Google OAuth state is signed and rejects tampering", () => {
    const state = createGoogleOAuthState({
      client: "mobile",
      redirectUri: "routineflow://auth/callback",
      state: "mobile-state",
    })

    expect(parseGoogleOAuthState(state)).toMatchObject({
      client: "mobile",
      redirectUri: "routineflow://auth/callback",
      state: "mobile-state",
    })

    const [body, signature] = state.split(".")
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<string, unknown>
    payload.redirectUri = "https://evil.example/auth/callback"
    const tampered = `${Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")}.${signature}`

    expect(() => parseGoogleOAuthState(tampered)).toThrow()
  })

  test("legacy Mongo auth rows are normalized before writes", () => {
    const data = createSeedData()
    const email = "montasimmamun@gmail.com"
    data.users.push({
      name: "MONTASIM",
      email,
      image: null,
      createdAt: "2026-06-20T16:31:33.815Z",
      updatedAt: "2026-06-30T06:35:09.003Z",
    } as (typeof data.users)[number])
    data.userSettings.push(
      {
        id: "settings_undefined",
        timezone: "Asia/Dhaka",
        defaultReminderMinutes: 15,
        notificationPreferences: {
          browserNotificationsEnabled: false,
          overnightNotificationsDisabled: false,
        },
        dataRetentionMonths: null,
        createdAt: "2026-06-30T06:56:13.142Z",
        updatedAt: "2026-06-30T06:56:13.142Z",
      } as (typeof data.userSettings)[number],
      {
        id: "settings_undefined_again",
        timezone: "Asia/Dhaka",
        defaultReminderMinutes: 15,
        notificationPreferences: {
          browserNotificationsEnabled: false,
          overnightNotificationsDisabled: false,
        },
        dataRetentionMonths: null,
        createdAt: "2026-06-30T06:56:13.142Z",
        updatedAt: "2026-06-30T06:56:13.142Z",
      } as (typeof data.userSettings)[number]
    )

    normalizeAppData(data)

    const user = data.users.find((item) => item.email === email)
    expect(user?.id).toMatch(/^user_/)
    expect(data.userSettings.filter((item) => item.userId === user?.id)).toHaveLength(1)
    expect(data.userSettings.some((item) => !item.userId || item.userId === "undefined")).toBe(false)
  })
})
