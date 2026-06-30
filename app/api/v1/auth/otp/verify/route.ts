import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { clientIp, handleRoute, jsonOk, parseJson, setSessionCookie, userAgent } from "@/lib/api"
import { otpVerifySchema } from "@/lib/schemas"
import { verifyOtp } from "@/lib/services/auth"
import { withAppData } from "@/lib/storage/store"

export function POST(request: NextRequest) {
  return handleRoute(request, async (requestId) => {
    const input = await parseJson(request, otpVerifySchema)
    const data = await withAppData((store) =>
      verifyOtp(store, input, {
        ip: clientIp(request),
        userAgent: userAgent(request),
      })
    )
    const response = jsonOk(data, { requestId }) as NextResponse
    setSessionCookie(response, data.session.token, data.session.expiresAt)
    return response
  })
}
