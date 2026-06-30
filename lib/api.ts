import { NextResponse, type NextRequest } from "next/server"
import { ZodError, type ZodType } from "zod"

import { SESSION_COOKIE } from "@/lib/constants"
import { isProduction } from "@/lib/env"
import { ApiProblem, badRequest } from "@/lib/errors"
import { getLogger } from "@/lib/logger"
import { getCurrentUser } from "@/lib/services/auth"
import {
  completeIdempotency,
  fingerprint,
  replayOrStartIdempotency,
  requireIdempotencyKey,
} from "@/lib/services/shared"
import { withAppData } from "@/lib/storage/store"
import { nowIso } from "@/lib/time"
import type { AppData } from "@/lib/types"
import type { CurrentUserContext } from "@/lib/types"

const logger = getLogger("api")

export function requestId(request: NextRequest) {
  return request.headers.get("x-request-id") || crypto.randomUUID()
}

export function jsonOk(data: unknown, init?: { status?: number; meta?: Record<string, unknown>; headers?: HeadersInit; requestId?: string }) {
  return NextResponse.json(
    {
      data,
      meta: {
        requestId: init?.requestId,
        apiVersion: "v1",
        serverTime: nowIso(),
        ...init?.meta,
      },
    },
    { status: init?.status ?? 200, headers: init?.headers }
  )
}

export function noContent() {
  return new NextResponse(null, { status: 204 })
}

export function problemResponse(
  problem: ApiProblem,
  rid: string,
  instance: string,
  errors?: { path: string; message: string }[]
) {
  return new NextResponse(
    JSON.stringify({
      type: `https://routineflow.app/problems/${problem.code.toLowerCase().replaceAll("_", "-")}`,
      title: problem.title,
      status: problem.status,
      detail: problem.message,
      instance,
      code: problem.code,
      requestId: rid,
      ...(errors?.length ? { errors } : {}),
    }),
    {
      status: problem.status,
      headers: {
        "content-type": "application/problem+json",
        "x-request-id": rid,
      },
    }
  )
}

export async function parseJson<T>(request: NextRequest, schema: ZodType<T>) {
  const body = await request.json().catch(() => ({}))
  return schema.parse(body)
}

export function parseQuery<T>(request: NextRequest, schema: ZodType<T>) {
  const input = Object.fromEntries(request.nextUrl.searchParams.entries())
  return schema.parse(input)
}

export async function handleRoute(request: NextRequest, handler: (rid: string) => Promise<Response>) {
  const rid = requestId(request)
  const instance = request.nextUrl.pathname
  try {
    const response = await handler(rid)
    response.headers.set("x-request-id", rid)
    return response
  } catch (error) {
    if (error instanceof ZodError) {
      return problemResponse(
        new ApiProblem(422, "VALIDATION_ERROR", "Validation Error", error.issues[0]?.message || "Invalid request."),
        rid,
        instance,
        error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
      )
    }
    if (error instanceof ApiProblem) {
      return problemResponse(error, rid, instance)
    }
    logger.error({ err: error, requestId: rid }, "Unhandled API route error")
    return problemResponse(new ApiProblem(500, "INTERNAL_ERROR", "Internal Server Error", "An unexpected error occurred."), rid, instance)
  }
}

export async function requireCurrentUser(request: NextRequest): Promise<CurrentUserContext> {
  return getCurrentUser({
    bearer: request.headers.get("authorization"),
    cookieToken: request.cookies.get(SESSION_COOKIE)?.value,
  })
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })
}

export function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "127.0.0.1"
}

export function userAgent(request: NextRequest) {
  return request.headers.get("user-agent") || "unknown"
}

export async function idempotentMutation(
  request: NextRequest,
  resourceType: string,
  mutator: (
    data: AppData,
    userId: string,
    body: unknown
  ) => { status: number; body: unknown; resourceId?: string; headers?: HeadersInit }
) {
  return handleRoute(request, async (rid) => {
    const ctx = await requireCurrentUser(request)
    const rawBody = await request.json().catch(() => ({}))
    const key = requireIdempotencyKey(request.headers.get("idempotency-key"))
    const method = request.method
    const path = request.nextUrl.pathname
    const requestFingerprint = fingerprint(rawBody)
    const result = await withAppData((store) => {
      const replay = replayOrStartIdempotency(store, {
        userId: ctx.user.id,
        key,
        method,
        path,
        requestFingerprint,
      })
      if (replay) {
        return {
          status: replay.responseStatus ?? 200,
          body: replay.responseBody,
          headers: { "Idempotency-Replayed": "true" },
        }
      }
      const outcome = mutator(store, ctx.user.id, rawBody)
      completeIdempotency(store, {
        userId: ctx.user.id,
        key,
        method,
        path,
        status: outcome.status,
        body: outcome.body,
        resourceType,
        resourceId: outcome.resourceId,
      })
      return outcome
    })
    if (!result.body) throw badRequest("EMPTY_RESPONSE", "Mutation returned an empty response.")
    return jsonOk(result.body, { status: result.status, headers: result.headers, requestId: rid })
  })
}
