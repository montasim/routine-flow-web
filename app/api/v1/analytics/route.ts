import type { NextRequest } from "next/server"

import { handleRoute, jsonOk, parseQuery, requireCurrentUser } from "@/lib/api"
import { analyticsQuerySchema } from "@/lib/schemas"
import { analytics } from "@/lib/services/analytics"
import { readAppData } from "@/lib/storage/store"

export function GET(request: NextRequest) {
  return handleRoute(request, async (requestId) => {
    const ctx = await requireCurrentUser(request)
    const input = parseQuery(request, analyticsQuerySchema)
    const store = await readAppData()
    const data = analytics(store, ctx.user.id, ctx.settings, input)
    return jsonOk(data, { requestId })
  })
}
