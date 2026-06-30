import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto"

import { authSecret, otpSecret } from "@/lib/env"

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url")
}

export function randomId(prefix: string) {
  return `${prefix}_${randomBytes(9).toString("base64url")}`
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

export function hmacSha256(value: string) {
  return createHmac("sha256", authSecret).update(value).digest("base64url")
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function normalizedName(value: string) {
  return value.trim().toLowerCase()
}

export function hashOtp(email: string, code: string) {
  return sha256(`${email.toLowerCase()}:${code}:${otpSecret}`)
}

export function hashRequestPart(value: string | null) {
  return sha256(value || "unknown").slice(0, 32)
}
