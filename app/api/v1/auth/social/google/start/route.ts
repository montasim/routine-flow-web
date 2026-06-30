import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { handleRoute } from "@/lib/api"
import { googleOAuth } from "@/lib/env"
import { badRequest } from "@/lib/errors"
import { allowedRedirect } from "@/lib/services/auth"

import { googleOAuthCallbackUrl } from "../oauth-url"
import { createGoogleOAuthState, type GoogleOAuthClient } from "../oauth-state"

export function GET(request: NextRequest) {
  return handleRoute(request, async () => {
    if (!googleOAuth) {
      throw badRequest("GOOGLE_OAUTH_NOT_CONFIGURED", "Google OAuth requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.")
    }

    const client = parseClient(request.nextUrl.searchParams.get("client"))
    const redirectUri = request.nextUrl.searchParams.get("redirectUri")
    if (client === "mobile") {
      if (!redirectUri) throw badRequest("REDIRECT_URI_REQUIRED", "Mobile Google OAuth requires a redirectUri.")
      allowedRedirect(redirectUri)
    }

    const callback = googleOAuthCallbackUrl(request)
    const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth")
    authorization.searchParams.set("client_id", googleOAuth.clientId)
    authorization.searchParams.set("redirect_uri", callback)
    authorization.searchParams.set("response_type", "code")
    authorization.searchParams.set("scope", "openid email profile")
    authorization.searchParams.set("state", createGoogleOAuthState({
      client,
      redirectUri: client === "mobile" ? redirectUri : null,
      state: request.nextUrl.searchParams.get("state"),
    }))
    authorization.searchParams.set("prompt", "select_account")

    return NextResponse.redirect(authorization)
  })
}

function parseClient(value: string | null): GoogleOAuthClient {
  if (!value || value === "web") return "web"
  if (value === "mobile") return "mobile"
  throw badRequest("INVALID_CLIENT", "Google OAuth client must be web or mobile.")
}
