import type { NextRequest } from "next/server"

import { idempotentMutation } from "@/lib/api"
import { randomId } from "@/lib/crypto"
import { generateOccurrencesForUser, markMissedForUser } from "@/lib/services/occurrences"
import { nowIso } from "@/lib/time"

export function POST(request: NextRequest) {
  return idempotentMutation(request, "occurrence-window", (store, userId) => {
    const missedMarked = markMissedForUser(store, userId)
    const generated = generateOccurrencesForUser(store, userId)
    store.scheduledJobs.unshift({
      id: randomId("job"),
      at: nowIso(),
      label: "Occurrence generator",
      result: `${generated.occurrencesGenerated} occurrences generated; ${missedMarked} missed marked`,
      requestId: "api",
    })
    return {
      status: 200,
      body: { ...generated, missedMarked },
      resourceId: userId,
    }
  })
}
