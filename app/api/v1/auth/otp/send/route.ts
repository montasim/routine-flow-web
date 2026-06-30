import type { NextRequest } from "next/server"

import { clientIp, handleRoute, jsonOk, parseJson, userAgent } from "@/lib/api"
import { otpSendSchema } from "@/lib/schemas"
import { sendOtp } from "@/lib/services/auth"
import { withAppData } from "@/lib/storage/store"

export function POST(request: NextRequest) {
  return handleRoute(request, async (requestId) => {
    const input = await parseJson(request, otpSendSchema)
    const data = await withAppData((store) =>
      sendOtp(store, input, {
        ip: clientIp(request),
        userAgent: userAgent(request),
        requestId,
      })
    )
    return jsonOk(data, { status: 202, requestId })
  })
}
