import { DEFAULT_LIMIT, MAX_LIMIT } from "@/lib/constants"
import { badRequest, conflict } from "@/lib/errors"
import { randomId, sha256 } from "@/lib/crypto"
import { addSeconds, nowIso } from "@/lib/time"
import type { AppData } from "@/lib/types"

export function pageLimit(limit?: number) {
  return Math.min(MAX_LIMIT, Math.max(1, limit ?? DEFAULT_LIMIT))
}

export function cursorPage<T extends { id: string }>(rows: T[], cursor?: string, limit?: number) {
  const take = pageLimit(limit)
  const start = cursor ? Math.max(0, rows.findIndex((row) => row.id === cursor) + 1) : 0
  const items = rows.slice(start, start + take)
  const nextCursor = rows.length > start + take ? items.at(-1)?.id : undefined
  return { items, nextCursor }
}

export function fingerprint(input: unknown) {
  return sha256(JSON.stringify(input ?? {}))
}

export function requireIdempotencyKey(key: string | null) {
  if (!key) throw badRequest("IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required for this mutation.")
  if (key.length < 20) throw badRequest("IDEMPOTENCY_KEY_INVALID", "Idempotency-Key must be a high-entropy opaque value.")
  return key
}

export function replayOrStartIdempotency(data: AppData, input: {
  userId: string
  key: string
  method: string
  path: string
  requestFingerprint: string
}) {
  const existing = data.idempotencyKeys.find(
    (record) =>
      record.userId === input.userId &&
      record.key === input.key &&
      record.method === input.method &&
      record.path === input.path
  )

  if (existing) {
    if (existing.requestFingerprint !== input.requestFingerprint) {
      throw conflict("IDEMPOTENCY_KEY_REUSED", "The same Idempotency-Key was reused with a different request body.")
    }
    if (existing.status === "completed") return existing
    throw conflict("IDEMPOTENCY_KEY_IN_PROGRESS", "A request with this Idempotency-Key is still in progress.")
  }

  const now = nowIso()
  const record = {
    id: randomId("idem"),
    userId: input.userId,
    key: input.key,
    method: input.method,
    path: input.path,
    requestFingerprint: input.requestFingerprint,
    status: "in_progress" as const,
    responseStatus: null,
    responseBody: null,
    resourceType: null,
    resourceId: null,
    expiresAt: addSeconds(now, 86400),
    createdAt: now,
    updatedAt: now,
  }
  data.idempotencyKeys.push(record)
  return null
}

export function completeIdempotency(data: AppData, input: {
  userId: string
  key: string
  method: string
  path: string
  status: number
  body: unknown
  resourceType?: string
  resourceId?: string
}) {
  const record = data.idempotencyKeys.find(
    (item) => item.userId === input.userId && item.key === input.key && item.method === input.method && item.path === input.path
  )
  if (!record) return
  record.status = "completed"
  record.responseStatus = input.status
  record.responseBody = input.body
  record.resourceType = input.resourceType ?? null
  record.resourceId = input.resourceId ?? null
  record.updatedAt = nowIso()
}
