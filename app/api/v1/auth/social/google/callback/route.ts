import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { clientIp, handleRoute, setSessionCookie, userAgent } from "@/lib/api"
import { DEFAULT_TIMEZONE } from "@/lib/constants"
import { randomId, randomToken, sha256 } from "@/lib/crypto"
import { googleOAuth } from "@/lib/env"
import { badRequest, unauthorized } from "@/lib/errors"
import { createDefaultUser, seedWorkspaceForUser } from "@/lib/seed"
import { allowedRedirect, createSession } from "@/lib/services/auth"
import { addSeconds, nowIso } from "@/lib/time"
import { withAppData } from "@/lib/storage/store"
import type { AppData, User } from "@/lib/types"

import { googleOAuthCallbackUrl } from "../oauth-url"
import { parseGoogleOAuthState } from "../oauth-state"

export function GET(request: NextRequest) {
  return handleRoute(request, async (requestId) => {
    const googleCredentials = googleOAuth
    if (!googleCredentials) {
      throw badRequest("GOOGLE_OAUTH_NOT_CONFIGURED", "Google OAuth requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.")
    }

    const oauthError = request.nextUrl.searchParams.get("error")
    if (oauthError) throw unauthorized("Google OAuth was cancelled or denied.")

    const code = request.nextUrl.searchParams.get("code")
    if (!code) throw badRequest("OAUTH_CODE_REQUIRED", "Google OAuth callback is missing a code.")

    const oauthState = parseGoogleOAuthState(request.nextUrl.searchParams.get("state"))
    const callback = googleOAuthCallbackUrl(request)
    const tokens = await exchangeGoogleCode(code, callback, googleCredentials)
    const googleUser = await fetchGoogleUser(tokens.accessToken)

    const result = await withAppData((data) => {
      const user = upsertGoogleUser(data, googleUser)

      if (oauthState.client === "web") {
        const session = createSession(data, user.id, clientIp(request), userAgent(request))
        return {
          session,
          redirect: new URL("/dashboard", request.url).toString(),
        }
      }

      if (!oauthState.redirectUri) throw badRequest("REDIRECT_URI_REQUIRED", "Mobile Google OAuth requires a redirectUri.")
      const target = allowedRedirect(oauthState.redirectUri)
      const exchangeCode = randomToken(24)
      data.mobileSocialAuthCodes.push({
        id: randomId("social"),
        codeHash: sha256(exchangeCode),
        userId: user.id,
        provider: "google",
        redirectUri: target,
        expiresAt: addSeconds(nowIso(), 120),
        consumedAt: null,
        requestId,
        createdAt: nowIso(),
      })
      const redirect = new URL(target)
      redirect.searchParams.set("code", exchangeCode)
      redirect.searchParams.set("state", oauthState.state)
      return { session: null, redirect: redirect.toString() }
    })

    const response = NextResponse.redirect(result.redirect)
    if (result.session) setSessionCookie(response, result.session.token, result.session.expiresAt)
    return response
  })
}

interface GoogleTokenPayload {
  access_token?: unknown
  error?: unknown
  error_description?: unknown
}

interface GoogleUserPayload {
  email?: unknown
  email_verified?: unknown
  name?: unknown
  picture?: unknown
}

interface GoogleUser {
  email: string
  name: string
  picture: string | null
}

async function exchangeGoogleCode(
  code: string,
  redirectUri: string,
  credentials: { clientId: string; clientSecret: string }
) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })
  const payload = (await response.json().catch(() => ({}))) as GoogleTokenPayload
  if (!response.ok || typeof payload.access_token !== "string") {
    throw unauthorized("Google OAuth token exchange failed.")
  }
  return { accessToken: payload.access_token }
}

async function fetchGoogleUser(accessToken: string): Promise<GoogleUser> {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  const payload = (await response.json().catch(() => ({}))) as GoogleUserPayload
  if (!response.ok || typeof payload.email !== "string") {
    throw unauthorized("Google OAuth profile lookup failed.")
  }
  if (payload.email_verified !== true && payload.email_verified !== "true") {
    throw unauthorized("Google account email must be verified.")
  }

  const email = payload.email.toLowerCase()
  return {
    email,
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : email.split("@")[0],
    picture: typeof payload.picture === "string" && payload.picture.trim() ? payload.picture : null,
  }
}

function upsertGoogleUser(data: AppData, googleUser: GoogleUser): User {
  const now = nowIso()
  let user = data.users.find((item) => item.email.toLowerCase() === googleUser.email)

  if (!user) {
    const created = createDefaultUser(googleUser.email, googleUser.name, DEFAULT_TIMEZONE)
    user = { ...created.user, image: googleUser.picture, updatedAt: now }
    data.users.push(user)
    data.userSettings.push(created.settings)
    seedWorkspaceForUser(data, user.id, created.settings.timezone)
    return user
  }

  if (!user.id) user.id = createDefaultUser(user.email, user.name, DEFAULT_TIMEZONE).user.id
  if (googleUser.name) user.name = googleUser.name
  if (googleUser.picture) user.image = googleUser.picture
  user.updatedAt = now

  let settings = data.userSettings.find((item) => item.userId === user.id)
  if (!settings) {
    const created = createDefaultUser(user.email, user.name, DEFAULT_TIMEZONE)
    settings = { ...created.settings, id: `settings_${user.id}`, userId: user.id }
    data.userSettings.push(settings)
  }
  seedWorkspaceForUser(data, user.id, settings.timezone)
  return user
}
