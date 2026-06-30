import { Temporal } from "@js-temporal/polyfill"

import { OCCURRENCE_WINDOW_DAYS } from "@/lib/constants"

export function nowIso() {
  return new Date().toISOString()
}

export function addSeconds(iso: string, seconds: number) {
  return new Date(new Date(iso).getTime() + seconds * 1000).toISOString()
}

export function addDays(date: string, days: number) {
  return Temporal.PlainDate.from(date).add({ days }).toString()
}

export function currentLocalDate(timezone: string, instant: Temporal.Instant = Temporal.Now.instant()) {
  return instant.toZonedDateTimeISO(timezone).toPlainDate().toString()
}

export function occurrenceWindow(timezone: string) {
  const start = currentLocalDate(timezone)
  return {
    start,
    end: addDays(start, OCCURRENCE_WINDOW_DAYS - 1),
    dates: Array.from({ length: OCCURRENCE_WINDOW_DAYS }, (_, index) => addDays(start, index)),
  }
}

export function localDateTimeToUtcIso(date: string, time: string, timezone: string) {
  const dateTime = Temporal.PlainDateTime.from(`${date}T${time}:00`)
  return dateTime.toZonedDateTime(timezone).toInstant().toString()
}

export function notificationDueAtIso(scheduledTimeUtc: string, reminderMinutes: number) {
  return Temporal.Instant.from(scheduledTimeUtc).subtract({ minutes: reminderMinutes }).toString()
}

export function delayMinutes(completedAtIso: string, scheduledTimeUtcIso: string) {
  const completed = Temporal.Instant.from(completedAtIso).epochMilliseconds
  const scheduled = Temporal.Instant.from(scheduledTimeUtcIso).epochMilliseconds
  return Math.round((completed - scheduled) / 60000)
}

export function dayOfWeek(date: string) {
  return Temporal.PlainDate.from(date).dayOfWeek % 7
}

export function dayOfMonth(date: string) {
  return Temporal.PlainDate.from(date).day
}

export function monthAndDay(date: string) {
  const plain = Temporal.PlainDate.from(date)
  return { month: plain.month, day: plain.day }
}

export function compareLocalDate(a: string, b: string) {
  return Temporal.PlainDate.compare(Temporal.PlainDate.from(a), Temporal.PlainDate.from(b))
}

export function rangeFromPreset(range: string, timezone: string, startDate?: string, endDate?: string) {
  const today = currentLocalDate(timezone)
  if (range === "custom") {
    return { startDate: startDate ?? today, endDate: endDate ?? today }
  }
  if (range === "all") return { startDate: undefined, endDate: today }
  const days = Number(range.replace("d", ""))
  return { startDate: addDays(today, -(days - 1)), endDate: today }
}

