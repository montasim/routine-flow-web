import type { NextRequest } from "next/server"

import { handleRoute, jsonOk, parseQuery, requireCurrentUser } from "@/lib/api"
import { logsQuerySchema } from "@/lib/schemas"
import { filterLogs } from "@/lib/services/analytics"
import { cursorPage } from "@/lib/services/shared"
import { readAppData } from "@/lib/storage/store"

export function GET(request: NextRequest) {
  return handleRoute(request, async (requestId) => {
    const ctx = await requireCurrentUser(request)
    const input = parseQuery(request, logsQuerySchema)
    const store = await readAppData()
    const rows = filterLogs(store.routineLogs.filter((log) => log.userId === ctx.user.id), input).sort(
      (a, b) => b.date.localeCompare(a.date) || b.scheduledTime.localeCompare(a.scheduledTime)
    )
    const page = cursorPage(rows, input.cursor, input.limit)
    const data = { logs: page.items, nextCursor: page.nextCursor, total: rows.length }
    return jsonOk({ logs: data.logs }, { meta: { nextCursor: data.nextCursor, total: data.total }, requestId })
  })
}
