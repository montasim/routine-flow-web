import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { handleRoute, jsonOk, setSessionCookie } from "@/lib/api"
import { unauthorized } from "@/lib/errors"
import { extractToken, refreshSession } from "@/lib/services/auth"
import { withAppData } from "@/lib/storage/store"

export function POST(request: NextRequest) {
  return handleRoute(request, async (requestId) => {
    const token = extractToken(request.headers.get("authorization")) || request.cookies.get("routineflow_session")?.value
    if (!token) throw unauthorized()
    const data = await withAppData((store) => refreshSession(store, token))
    const response = jsonOk(data, { requestId }) as NextResponse
    setSessionCookie(response, data.session.token, data.session.expiresAt)
    return response
  })
}
