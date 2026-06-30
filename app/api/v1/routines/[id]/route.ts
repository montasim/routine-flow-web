import type { NextRequest } from "next/server"

import { idempotentMutation } from "@/lib/api"
import { routinePatchSchema } from "@/lib/schemas"
import { deleteRoutine, updateRoutine } from "@/lib/services/catalog"

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return idempotentMutation(request, "routine", (store, userId, body) => {
    const input = routinePatchSchema.parse(body)
    const routine = updateRoutine(store, userId, id, input)
    return { status: 200, body: { routine }, resourceId: id }
  })
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return idempotentMutation(request, "routine", (store, userId) => {
    const result = deleteRoutine(store, userId, id)
    return { status: 200, body: result, resourceId: id }
  })
}
