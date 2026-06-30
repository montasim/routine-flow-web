import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    LOG_LEVEL: z.string().optional(),
    MONGODB_URI: z.string().optional(),
    AUTH_SECRET: z.string().optional(),
    BETTER_AUTH_SECRET: z.string().optional(),
    BETTER_AUTH_URL: z.string().url().optional(),
    RESEND_API_KEY: z.string().optional(),
    OTP_FROM_EMAIL: z.string().optional(),
    CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:3000,http://localhost:3001"),
    ALLOWED_REDIRECT_URIS: z.string().default("routineflow://auth/callback,http://localhost:3000/auth/callback"),
    SCHEDULED_JOB_SECRET: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    INNGEST_SIGNING_KEY: z.string().optional(),
  },
  experimental__runtimeEnv: {},
  emptyStringAsUndefined: true,
})

export const isProduction = env.NODE_ENV === "production"

export const authSecret =
  env.AUTH_SECRET || env.BETTER_AUTH_SECRET || "routineflow-local-dev-secret"

export const otpSecret =
  env.AUTH_SECRET || env.BETTER_AUTH_SECRET || "routineflow-dev-secret"

export const googleOAuth =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      }
    : undefined

export function requireProductionMongo() {
  if (isProduction && !env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required in production.")
  }
}
