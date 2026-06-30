import type { NextRequest } from "next/server"

import { clientIp, handleRoute, jsonOk, parseJson, userAgent } from "@/lib/api"
import { unauthorized } from "@/lib/errors"
import { socialExchangeSchema } from "@/lib/schemas"
import { createSession, publicUser } from "@/lib/services/auth"
import {
  completeIdempotency,
  fingerprint,
  replayOrStartIdempotency,
  requireIdempotencyKey,
} from "@/lib/services/shared"
import { sha256 } from "@/lib/crypto"
import { nowIso } from "@/lib/time"
import { withAppData } from "@/lib/storage/store"

export function POST(request: NextRequest) {
  return handleRoute(request, async (requestId) => {
    const input = await parseJson(request, socialExchangeSchema)
    const key = requireIdempotencyKey(request.headers.get("idempotency-key"))
    const data = await withAppData((store) => {
      const requestFingerprint = fingerprint({
        method: request.method,
        path: request.nextUrl.pathname,
        body: input,
      })
      const record = store.mobileSocialAuthCodes.find((item) => item.codeHash === sha256(input.code))
      const existingIdempotency = store.idempotencyKeys.find((item) => item.key === key && item.method === request.method && item.path === request.nextUrl.pathname)
      const replayUserId = existingIdempotency?.userId ?? record?.userId
      if (!replayUserId) throw unauthorized("Social exchange code is expired, consumed, or invalid.")
      if (!existingIdempotency && (!record || record.consumedAt || record.expiresAt <= nowIso() || record.redirectUri !== input.redirectUri)) {
        throw unauthorized("Social exchange code is expired, consumed, or invalid.")
      }
      const replay = replayOrStartIdempotency(store, {
        userId: replayUserId,
        key,
        method: request.method,
        path: request.nextUrl.pathname,
        requestFingerprint,
      })
      if (replay) {
        const safe = replay.responseBody as { sessionId?: string; userId?: string } | null
        if (!safe?.sessionId || !safe.userId) throw unauthorized("Social exchange replay is unavailable.")
        const session = store.sessions.find((item) => item.id === safe.sessionId)
        const user = store.users.find((item) => item.id === safe.userId)
        if (!session || session.revokedAt || session.expiresAt <= nowIso() || !user || user.id !== session.userId) {
          throw unauthorized("Social exchange replay is unavailable.")
        }
        return {
          body: {
            session: { token: session.token, expiresAt: session.expiresAt },
            user: publicUser(user),
          },
          replayed: true,
        }
      }
      if (!record) throw unauthorized("Social exchange code is expired, consumed, or invalid.")
      record.consumedAt = nowIso()
      const session = createSession(store, record.userId, clientIp(request), userAgent(request))
      const user = store.users.find((item) => item.id === record.userId)
      if (!user) throw unauthorized()
      completeIdempotency(store, {
        userId: user.id,
        key,
        method: request.method,
        path: request.nextUrl.pathname,
        status: 200,
        body: { sessionId: session.id, userId: user.id },
        resourceType: "session",
        resourceId: session.id,
      })
      return {
        body: {
          session: { token: session.token, expiresAt: session.expiresAt },
          user: publicUser(user),
        },
        replayed: false,
      }
    })
    return jsonOk(data.body, {
      requestId,
      headers: data.replayed ? { "Idempotency-Replayed": "true" } : undefined,
    })
  })
}
