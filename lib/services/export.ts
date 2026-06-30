import * as XLSX from "xlsx"

import { randomId } from "@/lib/crypto"
import { exportRange, filterLogs, metricsFromLogs } from "@/lib/services/analytics"
import { nowIso } from "@/lib/time"
import type { AppData, UserSettings } from "@/lib/types"

export function buildExport(data: AppData, userId: string, settings: UserSettings, input: {
  format: "xlsx" | "csv"
  range: string
  startDate?: string
  endDate?: string
  routineId?: string
  categoryId?: string
}) {
  const range = exportRange(settings, input)
  const logs = filterLogs(data.routineLogs.filter((log) => log.userId === userId), {
    startDate: range.startDate,
    endDate: range.endDate,
    routineId: input.routineId,
    categoryId: input.categoryId,
  })
  const categories = data.categories.filter((item) => item.userId === userId)
  const routines = data.routines.filter((item) => item.userId === userId)
  const tombstones = data.syncTombstones.filter((item) => item.userId === userId)
  const summary = [metricsFromLogs(logs)]
  const filename = `routineflow_${range.endDate ?? "all"}.${input.format}`
  data.exports.unshift({ id: randomId("export"), userId, createdAt: nowIso(), label: `${input.range} - ${input.routineId ?? "all routines"}`, rows: logs.length, file: filename })

  if (input.format === "csv") {
    const sheet = XLSX.utils.json_to_sheet(logs)
    return {
      filename,
      contentType: "text/csv; charset=utf-8",
      body: Buffer.from(XLSX.utils.sheet_to_csv(sheet), "utf8"),
    }
  }

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(categories), "Categories")
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(routines), "Routines")
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(logs), "Logs")
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), "Summary")
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(tombstones), "Tombstones")
  const body = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer
  return {
    filename,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    body,
  }
}

