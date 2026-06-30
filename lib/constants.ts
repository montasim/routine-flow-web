export const APP_NAME = "RoutineFlow"

export const SESSION_COOKIE = "routineflow_session"
export const SESSION_DAYS = 7
export const OTP_EXPIRY_SECONDS = 180
export const OTP_RESEND_SECONDS = 60
export const OTP_MAX_ATTEMPTS = 3
export const OCCURRENCE_WINDOW_DAYS = 7

export const DEFAULT_TIMEZONE = "Asia/Dhaka"
export const DEFAULT_REMINDER_MINUTES = 15
export const DEFAULT_LIMIT = 50
export const MAX_LIMIT = 200

export const STATUS_VALUES = ["Pending", "Completed", "Missed", "Skipped"] as const
export const LOG_STATUS_VALUES = ["Completed", "Missed", "Skipped"] as const
export const RECURRENCE_VALUES = ["daily", "weekly", "monthly", "yearly"] as const
export const REMINDER_OPTIONS = [0, 5, 10, 15, 30, 60] as const

export const PUBLIC_API_PREFIX = "/api/v1"

