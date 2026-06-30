import type { NextRequest } from "next/server"

import { handleRoute, jsonOk } from "@/lib/api"
import { getBetterAuth } from "@/lib/better-auth"

export async function GET(request: NextRequest) {
  return handleBetterAuth(request)
}

export async function POST(request: NextRequest) {
  return handleBetterAuth(request)
}

async function handleBetterAuth(request: NextRequest) {
  return handleRoute(request, async (requestId) => {
    const auth = await getBetterAuth()
    if (typeof auth.handler === "function") {
      return auth.handler(request)
    }
    return jsonOk({ message: "Better Auth handler is configured." }, { requestId })
  })
}
