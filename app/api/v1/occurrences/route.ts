import type { NextRequest } from "next/server"

import { handleRoute, jsonOk, parseQuery, requireCurrentUser } from "@/lib/api"
import { occurrencesQuerySchema } from "@/lib/schemas"
import { cursorPage } from "@/lib/services/shared"
import { readAppData } from "@/lib/storage/store"

export function GET(request: NextRequest) {
  return handleRoute(request, async (requestId) => {
    const ctx = await requireCurrentUser(request)
    const input = parseQuery(request, occurrencesQuerySchema)
    const store = await readAppData()
    let rows = store.occurrences.filter((item) => item.userId === ctx.user.id)
    if (input.date) {
      rows = rows.filter((item) => item.date === input.date)
    } else {
      if (input.startDate) rows = rows.filter((item) => item.date >= input.startDate!)
      if (input.endDate) rows = rows.filter((item) => item.date <= input.endDate!)
    }
    if (input.status) rows = rows.filter((item) => item.status === input.status)
    rows.sort((a, b) => a.date.localeCompare(b.date) || a.scheduledTime.localeCompare(b.scheduledTime))
    const page = cursorPage(rows, input.cursor, input.limit)
    const data = { occurrences: page.items, nextCursor: page.nextCursor }
    return jsonOk({ occurrences: data.occurrences }, { meta: { nextCursor: data.nextCursor }, requestId })
  })
}
