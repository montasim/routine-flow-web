import { z } from "zod"

import { LOG_STATUS_VALUES, RECURRENCE_VALUES, STATUS_VALUES } from "@/lib/constants"

export function isValidTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value })
    return true
  } catch {
    return false
  }
}

export const timezoneSchema = z.string().refine(isValidTimezone, "Invalid IANA timezone")
export const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const localTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/)
export const emailSchema = z.string().email().transform((value) => value.trim().toLowerCase())

export const recurrenceTypeSchema = z.enum(RECURRENCE_VALUES)
export const statusSchema = z.enum(STATUS_VALUES)
export const logStatusSchema = z.enum(LOG_STATUS_VALUES)

export const recurrenceRulesSchema = z.union([
  z.object({}).strict(),
  z.object({ daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7) }).strict(),
  z.object({ daysOfMonth: z.array(z.number().int().min(1).max(31)).min(1).max(31) }).strict(),
  z.object({
    dates: z.array(z.object({ month: z.number().int().min(1).max(12), day: z.number().int().min(1).max(31) })).min(1),
  }).strict(),
])

export const otpSendSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1).max(120).optional(),
  timezone: timezoneSchema.optional(),
})

export const otpVerifySchema = z.object({
  email: emailSchema,
  code: z.string().regex(/^\d{6}$/),
})

export const socialExchangeSchema = z.object({
  code: z.string().min(16),
  redirectUri: z.string().min(1),
})

export const settingsPatchSchema = z
  .object({
    timezone: timezoneSchema.optional(),
    defaultReminderMinutes: z.number().int().min(0).max(1440).optional(),
    notificationPreferences: z
      .object({
        browserNotificationsEnabled: z.boolean().optional(),
        overnightNotificationsDisabled: z.boolean().optional(),
      })
      .optional(),
    dataRetentionMonths: z.number().int().min(1).max(120).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required")

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(64),
  color: hexColorSchema,
  description: z.string().trim().max(240).nullable().optional(),
  sortOrder: z.number().int().optional(),
})

export const categoryPatchSchema = categoryCreateSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required",
})

export const routineCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  categoryId: z.string().min(1),
  scheduledTime: localTimeSchema,
  recurrenceType: recurrenceTypeSchema,
  recurrenceRules: recurrenceRulesSchema,
  reminderOverride: z.number().int().min(0).max(1440).nullable(),
})

export const routinePatchSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    categoryId: z.string().min(1).optional(),
    scheduledTime: localTimeSchema.optional(),
    recurrenceType: recurrenceTypeSchema.optional(),
    recurrenceRules: recurrenceRulesSchema.optional(),
    reminderOverride: z.number().int().min(0).max(1440).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required")

export const listQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  updatedSince: z.string().datetime().optional(),
})

export const logsQuerySchema = listQuerySchema.extend({
  startDate: localDateSchema.optional(),
  endDate: localDateSchema.optional(),
  routineId: z.string().optional(),
  categoryId: z.string().optional(),
  status: logStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
})

export const occurrencesQuerySchema = listQuerySchema.extend({
  date: localDateSchema.optional(),
  startDate: localDateSchema.optional(),
  endDate: localDateSchema.optional(),
  status: statusSchema.optional(),
})

export const analyticsQuerySchema = z.object({
  period: z.enum(["daily", "weekly", "monthly", "yearly"]).default("weekly"),
  date: localDateSchema.optional(),
  startDate: localDateSchema.optional(),
  endDate: localDateSchema.optional(),
  routineId: z.string().optional(),
  categoryId: z.string().optional(),
})

export const exportQuerySchema = z.object({
  format: z.enum(["xlsx", "csv"]).default("xlsx"),
  range: z.enum(["all", "7d", "30d", "90d", "custom"]).default("30d"),
  startDate: localDateSchema.optional(),
  endDate: localDateSchema.optional(),
  routineId: z.string().optional(),
  categoryId: z.string().optional(),
})

export const tombstoneQuerySchema = listQuerySchema.extend({
  resourceType: z.enum(["routine", "occurrence", "category"]).optional(),
})

export type OtpSendInput = z.infer<typeof otpSendSchema>
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>
export type SettingsPatchInput = z.infer<typeof settingsPatchSchema>
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>
export type CategoryPatchInput = z.infer<typeof categoryPatchSchema>
export type RoutineCreateInput = z.infer<typeof routineCreateSchema>
export type RoutinePatchInput = z.infer<typeof routinePatchSchema>

