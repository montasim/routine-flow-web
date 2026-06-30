import { betterAuth } from "better-auth"
import { mongodbAdapter } from "better-auth/adapters/mongodb"

import { authSecret, googleOAuth } from "@/lib/env"
import { getMongoDb } from "@/lib/db"

type BetterAuthHandler = {
  handler?: (request: Request) => Response | Promise<Response>
}

let authInstance: BetterAuthHandler | null = null

export async function getBetterAuth() {
  if (authInstance) return authInstance
  const db = await getMongoDb()
  authInstance = betterAuth({
    database: db ? mongodbAdapter(db) : undefined,
    secret: authSecret,
    session: {
      expiresIn: 604800,
      updateAge: 86400,
      storeSessionInDatabase: true,
    },
    socialProviders: googleOAuth ? { google: googleOAuth } : undefined,
  }) as unknown as BetterAuthHandler
  return authInstance
}
