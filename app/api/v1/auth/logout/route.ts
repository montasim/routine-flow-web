import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { clearSessionCookie, handleRoute, jsonOk } from "@/lib/api"
import { unauthorized } from "@/lib/errors"
import { extractToken, revokeSession } from "@/lib/services/auth"
import {
  completeIdempotency,
  fingerprint,
  replayOrStartIdempotency,
  requireIdempotencyKey,
} from "@/lib/services/shared"
import { withAppData } from "@/lib/storage/store"

export function POST(request: NextRequest) {
  return handleRoute(request, async (requestId) => {
    const token = extractToken(request.headers.get("authorization")) || request.cookies.get("routineflow_session")?.value
    if (!token) throw unauthorized()
    const key = requireIdempotencyKey(request.headers.get("idempotency-key"))
    const rawBody = await request.json().catch(() => ({}))
    const data = await withAppData((store) => {
      const session = store.sessions.find((item) => item.token === token)
      if (!session) throw unauthorized("Session is expired or revoked.")
      const requestFingerprint = fingerprint({
        method: request.method,
        path: request.nextUrl.pathname,
        body: rawBody,
      })
      const replay = replayOrStartIdempotency(store, {
        userId: session.userId,
        key,
        method: request.method,
        path: request.nextUrl.pathname,
        requestFingerprint,
      })
      if (replay) return { body: replay.responseBody, replayed: true }
      const body = revokeSession(store, token)
      completeIdempotency(store, {
        userId: session.userId,
        key,
        method: request.method,
        path: request.nextUrl.pathname,
        status: 200,
        body,
        resourceType: "session",
        resourceId: session.id,
      })
      return { body, replayed: false }
    })
    const response = jsonOk(data.body, {
      requestId,
      headers: data.replayed ? { "Idempotency-Replayed": "true" } : undefined,
    }) as NextResponse
    clearSessionCookie(response)
    return response
  })
}
