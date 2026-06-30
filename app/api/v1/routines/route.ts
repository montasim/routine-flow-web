import type { NextRequest } from "next/server"

import { handleRoute, idempotentMutation, jsonOk, requireCurrentUser } from "@/lib/api"
import { routineCreateSchema } from "@/lib/schemas"
import { createRoutine, listRoutines } from "@/lib/services/catalog"
import { readAppData } from "@/lib/storage/store"

export function GET(request: NextRequest) {
  return handleRoute(request, async (requestId) => {
    const ctx = await requireCurrentUser(request)
    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true"
    const includeDeleted = request.nextUrl.searchParams.get("includeDeleted") === "true"
    const categoryId = request.nextUrl.searchParams.get("categoryId") || undefined
    const store = await readAppData()
    const data = {
      routines: listRoutines(store, ctx.user.id, { includeInactive, includeDeleted, categoryId }),
    }
    return jsonOk(data, { requestId })
  })
}

export function POST(request: NextRequest) {
  return idempotentMutation(request, "routine", (store, userId, body) => {
    const input = routineCreateSchema.parse(body)
    const routine = createRoutine(store, userId, input)
    return {
      status: 201,
      body: { routine },
      resourceId: routine.id,
      headers: { Location: `/api/v1/routines/${routine.id}` },
    }
  })
}
