import type { NextRequest } from "next/server"

import { idempotentMutation } from "@/lib/api"
import { skipOccurrence } from "@/lib/services/occurrences"

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return idempotentMutation(request, "occurrence", (store, userId) => {
    const result = skipOccurrence(store, userId, id)
    return { status: 200, body: result, resourceId: id }
  })
}
