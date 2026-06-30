import type { NextRequest } from "next/server"

import { handleRoute, jsonOk, requireCurrentUser } from "@/lib/api"
import { publicUser } from "@/lib/services/auth"

export function GET(request: NextRequest) {
  return handleRoute(request, async (requestId) => {
    const ctx = await requireCurrentUser(request)
    return jsonOk(
      {
        user: publicUser(ctx.user),
        settings: ctx.settings,
      },
      { requestId }
    )
  })
}
