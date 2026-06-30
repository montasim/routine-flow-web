import { addDays, currentLocalDate, rangeFromPreset } from "@/lib/time"
import type { AnalyticsMetrics, AppData, RoutineLog, UserSettings } from "@/lib/types"

export function filterLogs(
  logs: RoutineLog[],
  input: {
    startDate?: string
    endDate?: string
    routineId?: string
    categoryId?: string
    status?: "Completed" | "Missed" | "Skipped"
  }
) {
  return logs
    .filter((log) => !input.startDate || log.date >= input.startDate)
    .filter((log) => !input.endDate || log.date <= input.endDate)
    .filter((log) => !input.routineId || log.routineId === input.routineId)
    .filter((log) => !input.categoryId || log.routineCategoryIdAtLog === input.categoryId)
    .filter((log) => !input.status || log.status === input.status)
}

export function metricsFromLogs(logs: RoutineLog[]): AnalyticsMetrics {
  const total = logs.length
  const completed = logs.filter((log) => log.status === "Completed").length
  const missed = logs.filter((log) => log.status === "Missed").length
  const skipped = logs.filter((log) => log.status === "Skipped").length
  const completedWithDelay = logs.filter((log) => log.status === "Completed" && typeof log.delayMinutes === "number")
  const averageDelayMinutes = completedWithDelay.length
    ? Math.round(completedWithDelay.reduce((sum, log) => sum + (log.delayMinutes ?? 0), 0) / completedWithDelay.length)
    : 0
  const completionRate = total ? Math.round((completed / total) * 100) : 0
  const consistencyScore = completionRate
  const delayPenalty = Math.max(0, 100 - Math.min(100, Math.max(0, averageDelayMinutes) * (100 / 60)))
  const disciplineScore = Math.round(completionRate * 0.45 + consistencyScore * 0.35 + delayPenalty * 0.2)
  const recent = logs.filter((log) => log.date >= addDays(currentLocalDate("UTC"), -30))
  const previous = logs.filter((log) => log.date >= addDays(currentLocalDate("UTC"), -60) && log.date < addDays(currentLocalDate("UTC"), -30))
  const behavioralDrift = metricsCompletion(recent) - metricsCompletion(previous)
  return {
    total,
    completed,
    missed,
    skipped,
    completionRate,
    averageDelayMinutes,
    consistencyScore,
    delayPenalty: Math.round(delayPenalty),
    disciplineScore,
    behavioralDrift,
  }
}

export function analytics(data: AppData, userId: string, settings: UserSettings, input: {
  period: "daily" | "weekly" | "monthly" | "yearly"
  date?: string
  startDate?: string
  endDate?: string
  routineId?: string
  categoryId?: string
}) {
  const today = currentLocalDate(settings.timezone)
  const endDate = input.endDate ?? input.date ?? today
  const startDate =
    input.startDate ??
    (input.period === "daily" ? endDate : input.period === "weekly" ? addDays(endDate, -6) : input.period === "monthly" ? addDays(endDate, -29) : `${endDate.slice(0, 4)}-01-01`)
  const rows = filterLogs(
    data.routineLogs.filter((log) => log.userId === userId && log.date <= today),
    { startDate, endDate, routineId: input.routineId, categoryId: input.categoryId }
  )
  const series = makeSeries(rows, startDate, endDate)
  return {
    period: input.period,
    range: { startDate, endDate },
    metrics: metricsFromLogs(rows),
    series,
    generatedAt: new Date().toISOString(),
  }
}

export function exportRange(settings: UserSettings, input: { range: string; startDate?: string; endDate?: string }) {
  return rangeFromPreset(input.range, settings.timezone, input.startDate, input.endDate)
}

function makeSeries(logs: RoutineLog[], startDate: string, endDate: string) {
  const result = []
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    const rows = logs.filter((log) => log.date === date)
    result.push({ date, completionRate: metricsFromLogs(rows).completionRate, total: rows.length })
  }
  return result
}

function metricsCompletion(logs: RoutineLog[]) {
  return logs.length ? Math.round((logs.filter((log) => log.status === "Completed").length / logs.length) * 100) : 0
}

