import type { NextRequest } from "next/server"

import { handleRoute, parseQuery, requireCurrentUser } from "@/lib/api"
import { exportQuerySchema } from "@/lib/schemas"
import { buildExport } from "@/lib/services/export"
import { withAppData } from "@/lib/storage/store"

export function GET(request: NextRequest) {
  return handleRoute(request, async () => {
    const ctx = await requireCurrentUser(request)
    const input = parseQuery(request, exportQuerySchema)
    const file = await withAppData((store) => buildExport(store, ctx.user.id, ctx.settings, input))
    const body = file.body.buffer.slice(file.body.byteOffset, file.body.byteOffset + file.body.byteLength) as ArrayBuffer
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
      },
    })
  })
}
