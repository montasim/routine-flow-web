import type { NextRequest } from "next/server"

import { handleRoute, idempotentMutation, jsonOk, requireCurrentUser } from "@/lib/api"
import { categoryCreateSchema } from "@/lib/schemas"
import { createCategory, listCategories } from "@/lib/services/catalog"
import { readAppData } from "@/lib/storage/store"

export function GET(request: NextRequest) {
  return handleRoute(request, async (requestId) => {
    const ctx = await requireCurrentUser(request)
    const includeDeleted = request.nextUrl.searchParams.get("includeDeleted") === "true"
    const store = await readAppData()
    const data = {
      categories: listCategories(store, ctx.user.id, includeDeleted),
    }
    return jsonOk(data, { requestId })
  })
}

export function POST(request: NextRequest) {
  return idempotentMutation(request, "category", (store, userId, body) => {
    const input = categoryCreateSchema.parse(body)
    const category = createCategory(store, userId, input)
    return {
      status: 201,
      body: { category },
      resourceId: category.id,
    }
  })
}
