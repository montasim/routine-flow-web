import type { NextRequest } from "next/server"

import { handleRoute, jsonOk, parseJson, requireCurrentUser } from "@/lib/api"
import { categoryPatchSchema } from "@/lib/schemas"
import { deleteCategory, updateCategory } from "@/lib/services/catalog"
import { withAppData } from "@/lib/storage/store"

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return handleRoute(request, async (requestId) => {
    const ctx = await requireCurrentUser(request)
    const input = await parseJson(request, categoryPatchSchema)
    const data = await withAppData((store) => ({
      category: updateCategory(store, ctx.user.id, id, input),
    }))
    return jsonOk(data, { requestId })
  })
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return handleRoute(request, async (requestId) => {
    const ctx = await requireCurrentUser(request)
    const data = await withAppData((store) => deleteCategory(store, ctx.user.id, id))
    return jsonOk(data, { requestId })
  })
}
