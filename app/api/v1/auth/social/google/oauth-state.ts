import { hmacSha256, randomToken, safeEqual } from "@/lib/crypto"
import { unauthorized } from "@/lib/errors"

export type GoogleOAuthClient = "web" | "mobile"

export interface GoogleOAuthState {
  client: GoogleOAuthClient
  redirectUri: string | null
  state: string
  nonce: string
  issuedAt: string
}

const STATE_MAX_AGE_MS = 10 * 60 * 1000

export function createGoogleOAuthState(input: {
  client: GoogleOAuthClient
  redirectUri: string | null
  state: string | null
}) {
  const payload: GoogleOAuthState = {
    client: input.client,
    redirectUri: input.redirectUri,
    state: input.state || randomToken(12),
    nonce: randomToken(16),
    issuedAt: new Date().toISOString(),
  }
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
  return `${body}.${hmacSha256(body)}`
}

export function parseGoogleOAuthState(value: string | null) {
  if (!value) throw unauthorized("OAuth state is missing.")
  const parts = value.split(".")
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw unauthorized("OAuth state is invalid.")

  const [body, signature] = parts
  if (!safeEqual(signature, hmacSha256(body))) throw unauthorized("OAuth state is invalid.")

  let payload: unknown
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
  } catch {
    throw unauthorized("OAuth state is invalid.")
  }

  if (!isGoogleOAuthState(payload)) throw unauthorized("OAuth state is invalid.")
  const issuedAt = new Date(payload.issuedAt).getTime()
  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > STATE_MAX_AGE_MS) {
    throw unauthorized("OAuth state is expired.")
  }

  return payload
}

function isGoogleOAuthState(value: unknown): value is GoogleOAuthState {
  if (!value || typeof value !== "object") return false
  const payload = value as Record<string, unknown>
  return (
    (payload.client === "web" || payload.client === "mobile") &&
    (typeof payload.redirectUri === "string" || payload.redirectUri === null) &&
    typeof payload.state === "string" &&
    typeof payload.nonce === "string" &&
    typeof payload.issuedAt === "string"
  )
}
