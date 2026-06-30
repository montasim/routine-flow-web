import type { NextRequest } from "next/server"

import { handleRoute, requireCurrentUser, jsonOk } from "@/lib/api"
import { withAppData } from "@/lib/storage/store"

export function GET(request: NextRequest) {
  return handleRoute(request, async (rid) => {
    const ctx = await requireCurrentUser(request)
    const data = await withAppData((store) => {
      return { exports: store.exports.filter((e) => e.userId === ctx.user.id) }
    })
    return jsonOk(data, { requestId: rid })
  })
}
