import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { env } from "@/lib/env"

const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
}

export function proxy(request: NextRequest) {
  const response = NextResponse.next()
  for (const [key, value] of Object.entries(securityHeaders)) response.headers.set(key, value)

  if (request.nextUrl.pathname.startsWith("/api/v1")) {
    const allowed = env.CORS_ALLOWED_ORIGINS
      .split(",")
      .map((origin) => origin.trim())
    const origin = request.headers.get("origin")
    if (origin && allowed.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin)
      response.headers.set("Vary", "Origin")
      response.headers.set("Access-Control-Allow-Credentials", "true")
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key, X-Request-Id")
      response.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
    }
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
