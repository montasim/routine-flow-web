import type { NextRequest } from "next/server"

import { handleRoute, jsonOk } from "@/lib/api"
import { env } from "@/lib/env"
import { unauthorized } from "@/lib/errors"
import { randomId } from "@/lib/crypto"
import { generateOccurrencesForUser, markMissedForUser } from "@/lib/services/occurrences"
import { nowIso } from "@/lib/time"
import { withAppData } from "@/lib/storage/store"

export function POST(request: NextRequest) {
  return handleRoute(request, async (requestId) => {
    const expected = env.SCHEDULED_JOB_SECRET
    if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
      throw unauthorized("Invalid scheduled job credentials.")
    }
    const startedAt = nowIso()
    const data = await withAppData((store) => {
      let occurrencesGenerated = 0
      let missedMarked = 0
      for (const user of store.users) {
        missedMarked += markMissedForUser(store, user.id)
        occurrencesGenerated += generateOccurrencesForUser(store, user.id).occurrencesGenerated
      }
      store.scheduledJobs.unshift({
        id: randomId("job"),
        at: nowIso(),
        label: "Cron",
        result: `${occurrencesGenerated} generated; ${missedMarked} missed`,
        requestId,
      })
      return {
        processedUsers: store.users.length,
        occurrencesGenerated,
        missedMarked,
        startedAt,
        finishedAt: nowIso(),
      }
    })
    return jsonOk(data, { requestId })
  })
}
