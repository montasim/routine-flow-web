import type { NextRequest } from "next/server"

import { env } from "@/lib/env"

const GOOGLE_CALLBACK_PATH = "/api/v1/auth/social/google/callback"

export function googleOAuthCallbackUrl(request: NextRequest) {
  const baseUrl = env.BETTER_AUTH_URL || request.nextUrl.origin
  return new URL(GOOGLE_CALLBACK_PATH, normalizedBaseUrl(baseUrl)).toString()
}

function normalizedBaseUrl(value: string) {
  return value.endsWith("/") ? value : `${value}/`
}
