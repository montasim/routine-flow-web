import type { NextRequest } from "next/server"

import { handleRoute, jsonOk, parseQuery, requireCurrentUser } from "@/lib/api"
import { tombstoneQuerySchema } from "@/lib/schemas"
import { cursorPage } from "@/lib/services/shared"
import { readAppData } from "@/lib/storage/store"

export function GET(request: NextRequest) {
  return handleRoute(request, async (requestId) => {
    const ctx = await requireCurrentUser(request)
    const input = parseQuery(request, tombstoneQuerySchema)
    const store = await readAppData()
    let rows = store.syncTombstones.filter((item) => item.userId === ctx.user.id)
    if (input.resourceType) rows = rows.filter((item) => item.resourceType === input.resourceType)
    if (input.updatedSince) rows = rows.filter((item) => item.deletedAt > input.updatedSince!)
    rows.sort((a, b) => a.deletedAt.localeCompare(b.deletedAt) || a.resourceId.localeCompare(b.resourceId))
    const page = cursorPage(rows, input.cursor, input.limit)
    const data = { tombstones: page.items, nextCursor: page.nextCursor }
    return jsonOk({ tombstones: data.tombstones }, { meta: { nextCursor: data.nextCursor }, requestId })
  })
}
