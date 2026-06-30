import type { NextRequest } from "next/server"

import { handleRoute, idempotentMutation, jsonOk, requireCurrentUser } from "@/lib/api"
import { settingsPatchSchema } from "@/lib/schemas"
import { updateSettings } from "@/lib/services/catalog"

export function GET(request: NextRequest) {
  return handleRoute(request, async (requestId) => {
    const ctx = await requireCurrentUser(request)
    return jsonOk({ settings: ctx.settings }, { requestId })
  })
}

export function PATCH(request: NextRequest) {
  return idempotentMutation(request, "settings", (store, userId, body) => {
    const input = settingsPatchSchema.parse(body)
    const result = updateSettings(store, userId, input)
    return { status: 200, body: result, resourceId: userId }
  })
}
