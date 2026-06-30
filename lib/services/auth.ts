import { Resend } from "resend"

import { DEFAULT_TIMEZONE, OTP_EXPIRY_SECONDS, OTP_MAX_ATTEMPTS, OTP_RESEND_SECONDS, SESSION_DAYS } from "@/lib/constants"
import { env } from "@/lib/env"
import { hashOtp, hashRequestPart, randomId, randomToken, safeEqual, sha256 } from "@/lib/crypto"
import { badRequest, conflict, unauthorized } from "@/lib/errors"
import { getLogger } from "@/lib/logger"
import { createDefaultUser, seedWorkspaceForUser } from "@/lib/seed"
import { addSeconds, nowIso } from "@/lib/time"
import type { AppData, CurrentUserContext, OtpCode, Session } from "@/lib/types"

const logger = getLogger("auth")

let resend: Resend | null = null

function getResend() {
  if (!env.RESEND_API_KEY) return null
  if (!resend) resend = new Resend(env.RESEND_API_KEY)
  return resend
}

export async function sendOtp(data: AppData, input: { email: string; name?: string; timezone?: string }, meta: { ip: string; userAgent: string; requestId: string }) {
  const now = nowIso()
  const email = input.email.toLowerCase()
  const latest = data.otpCodes
    .filter((item) => item.email === email && !item.consumedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

  if (latest && latest.resendAvailableAt > now) {
    throw conflict("OTP_RESEND_COOLDOWN", "Please wait before requesting another OTP code.")
  }

  const recentByEmail = data.otpCodes.filter((item) => item.email === email && item.createdAt > addSeconds(now, -3600)).length
  const recentByIp = data.otpCodes.filter((item) => item.ipHash === hashRequestPart(meta.ip) && item.createdAt > addSeconds(now, -3600)).length
  if (recentByEmail > 10 || recentByIp > 30) {
    throw new Error("OTP rate limit exceeded.")
  }

  const code = env.NODE_ENV === "production" ? String(Math.floor(100000 + Math.random() * 900000)) : "123456"
  const record: OtpCode = {
    id: randomId("otp"),
    email,
    codeHash: hashOtp(email, code),
    name: input.name ?? null,
    timezone: input.timezone ?? DEFAULT_TIMEZONE,
    attemptCount: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    expiresAt: addSeconds(now, OTP_EXPIRY_SECONDS),
    resendAvailableAt: addSeconds(now, OTP_RESEND_SECONDS),
    consumedAt: null,
    ipHash: hashRequestPart(meta.ip),
    userAgentHash: hashRequestPart(meta.userAgent),
    requestId: meta.requestId,
    createdAt: now,
    updatedAt: now,
  }
  data.otpCodes.push(record)

  const client = getResend()
  if (client && env.OTP_FROM_EMAIL) {
    await client.emails.send({
      from: env.OTP_FROM_EMAIL,
      to: email,
      subject: "Your RoutineFlow verification code",
      text: `Your RoutineFlow verification code is ${code}. It expires in 3 minutes.`,
    })
  } else {
    logger.info({ requestId: meta.requestId, emailHash: sha256(email).slice(0, 12) }, "OTP email skipped in local development")
  }

  return { message: "Verification code sent to email.", resendAfterSeconds: OTP_RESEND_SECONDS }
}

export function verifyOtp(data: AppData, input: { email: string; code: string }, meta: { ip: string; userAgent: string }) {
  const now = nowIso()
  const email = input.email.toLowerCase()
  const record = data.otpCodes
    .filter((item) => item.email === email && !item.consumedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

  if (!record || record.expiresAt <= now || record.attemptCount >= record.maxAttempts) {
    throw unauthorized("OTP code is expired, missing, or invalid.")
  }

  if (!safeEqual(record.codeHash, hashOtp(email, input.code))) {
    record.attemptCount += 1
    record.updatedAt = now
    throw unauthorized("OTP code is expired, missing, or invalid.")
  }

  record.consumedAt = now
  record.updatedAt = now

  let user = data.users.find((item) => item.email === email)
  let settings = undefined as (typeof data.userSettings)[number] | undefined
  if (user) {
    if (!user.id) user.id = createDefaultUser(user.email, user.name, record.timezone).user.id
    settings = data.userSettings.find((item) => item.userId === user!.id)
  }
  if (!user) {
    const created = createDefaultUser(email, record.name ?? email.split("@")[0], record.timezone)
    user = created.user
    settings = created.settings
    data.users.push(user)
    data.userSettings.push(settings)
    seedWorkspaceForUser(data, user.id, settings.timezone)
  } else if (!settings) {
    const created = createDefaultUser(user.email, user.name, record.timezone)
    settings = { ...created.settings, id: `settings_${user.id}`, userId: user.id }
    data.userSettings.push(settings)
    seedWorkspaceForUser(data, user.id, settings.timezone)
  }

  if (!user || !settings) throw unauthorized("OTP verification could not initialize the user.")

  const session = createSession(data, user.id, meta.ip, meta.userAgent)
  return {
    session: { token: session.token, expiresAt: session.expiresAt },
    user: publicUser(user),
  }
}

export function createSession(data: AppData, userId: string, ip: string | null, userAgent: string | null): Session {
  const now = nowIso()
  const session: Session = {
    id: randomId("session"),
    userId,
    token: randomToken(),
    expiresAt: addSeconds(now, SESSION_DAYS * 86400),
    ipAddress: ip,
    userAgent,
    revokedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  data.sessions.push(session)
  return session
}

export function refreshSession(data: AppData, token: string) {
  const session = requireSessionByToken(data, token)
  session.expiresAt = addSeconds(nowIso(), SESSION_DAYS * 86400)
  session.updatedAt = nowIso()
  const user = data.users.find((item) => item.id === session.userId)
  if (!user) throw unauthorized("Session user is unavailable.")
  return { session: { token: session.token, expiresAt: session.expiresAt }, user: publicUser(user) }
}

export function revokeSession(data: AppData, token: string) {
  const session = requireSessionByToken(data, token)
  session.revokedAt = nowIso()
  session.updatedAt = nowIso()
  return { revoked: true }
}

export async function getCurrentUser(input: { bearer: string | null; cookieToken?: string | null }): Promise<CurrentUserContext> {
  const { readAppData } = await import("@/lib/storage/store")
  const data = await readAppData()
  const token = extractToken(input.bearer) || input.cookieToken
  if (!token) throw unauthorized()
  const session = requireSessionByToken(data, token)
  const user = data.users.find((item) => item.id === session.userId)
  const settings = data.userSettings.find((item) => item.userId === session.userId)
  if (!user || !settings) throw unauthorized("Session user is unavailable.")
  return { user, settings, session }
}

export function extractToken(bearer: string | null) {
  if (!bearer) return null
  const match = bearer.match(/^Bearer\s+(.+)$/i)
  return match?.[1] ?? null
}

export function requireSessionByToken(data: AppData, token: string) {
  const session = data.sessions.find((item) => item.token === token)
  if (!session || session.revokedAt || session.expiresAt <= nowIso()) {
    throw unauthorized("Session is expired or revoked.")
  }
  return session
}

export function publicUser(user: { id: string; name: string; email: string; image: string | null }) {
  return { id: user.id, name: user.name, email: user.email, image: user.image }
}

export function allowedRedirect(uri: string) {
  const allowed = env.ALLOWED_REDIRECT_URIS.split(",").map((item) => item.trim())
  if (!allowed.includes(uri)) throw badRequest("REDIRECT_URI_NOT_ALLOWED", "The redirect URI is not allowed.")
  return uri
}
