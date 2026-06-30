import pino from "pino"

import { env, isProduction } from "@/lib/env"

const redact = [
  "req.headers.authorization",
  "headers.authorization",
  "authorization",
  "cookie",
  "cookies",
  "token",
  "session.token",
  "otp",
  "code",
  "codeHash",
  "RESEND_API_KEY",
  "MONGODB_URI",
  "AUTH_SECRET",
]

let loggerInstance: pino.Logger | null = null

export function getLogger(context = "app") {
  if (!loggerInstance) {
    const options: pino.LoggerOptions = {
      level: env.LOG_LEVEL || (isProduction ? "info" : "debug"),
      redact,
      browser: { asObject: true },
      base: { app: "routineflow" },
    }

    if (!isProduction) {
      options.transport = {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname",
          singleLine: true,
        },
      }
    }

    loggerInstance = pino(options)
  }
  return loggerInstance.child({ context })
}
