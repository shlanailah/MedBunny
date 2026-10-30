import { z } from '@hono/zod-openapi'

export const TimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use the HH:mm time format')
  .openapi({ example: '08:00' })

export const FrequencySchema = z.enum(['EVERY_DAY', 'SOME_DAYS', 'AS_NEEDED'])
export const MealTimingSchema = z.enum(['BEFORE_MEAL', 'AFTER_MEAL', 'ANYTIME'])
export const WeekdaySchema = z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])
export const DoseStatusSchema = z.enum(['recorded', 'awaiting', 'missed', 'upcoming'])
export const SessionModeSchema = z.enum(['parent', 'child'])
export const GameSchema = z.enum(['GARDEN', 'STYLE', 'MATCH_UP', 'COLOR_HUNT'])
export const GameIdSchema = z.enum(['garden', 'style', 'match-up', 'color-hunt'])
export const PinSchema = z
  .string()
  .regex(/^\d{4}$/, 'PIN must be 4 digits')
  .openapi({ example: '1234' })

export const MedicationInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Medication name is required').max(80, 'Medication name must be 80 characters or fewer'),
    dose: z.string().trim().min(1, 'Dose is required').max(40, 'Dose must be 40 characters or fewer'),
    startDate: z.iso.date(),
    frequency: FrequencySchema,
    times: z.array(TimeSchema).max(8, 'Up to 8 dose times'),
    meal: MealTimingSchema,
    days: z.array(WeekdaySchema),
    note: z.string().trim().max(1000, 'Notes must be 1000 characters or fewer').optional(),
  })
  .superRefine((value, ctx) => {
    if (value.frequency !== 'AS_NEEDED' && value.times.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['times'], message: 'Add at least one dose time' })
    }
    if (value.frequency === 'AS_NEEDED' && value.times.length > 0) {
      ctx.addIssue({ code: 'custom', path: ['times'], message: '"As needed" medications have no fixed times' })
    }
    if (value.frequency === 'SOME_DAYS' && value.days.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['days'], message: 'Select at least one day' })
    }
    if (new Set(value.times).size !== value.times.length) {
      ctx.addIssue({ code: 'custom', path: ['times'], message: 'Dose times must be different' })
    }
  })

export const UserSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  })
  .openapi('User')

export const ChildSchema = z
  .object({
    id: z.string(),
    nickname: z.string().nullable(),
    birthYear: z.number().int().nullable(),
  })
  .openapi('Child')

export const SessionSchema = z
  .object({
    user: UserSchema,
    children: z.array(ChildSchema),
    mode: SessionModeSchema,
    childId: z.string().nullable(),
  })
  .openapi('Session')

export const MedicationSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    dose: z.string(),
    startDate: z.string(),
    frequency: FrequencySchema,
    meal: MealTimingSchema,
    note: z.string().nullable(),
    times: z.array(z.string()),
    days: z.array(WeekdaySchema),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi('Medication')

export const DoseLogSchema = z
  .object({
    id: z.string(),
    medicationId: z.string(),
    medicationName: z.string(),
    dose: z.string(),
    scheduledAt: z.string(),
    confirmedAt: z.string().nullable(),
    status: DoseStatusSchema,
  })
  .openapi('DoseLog')

export const StarsSchema = z
  .object({
    balance: z.number().int(),
    earned: z.number().int(),
  })
  .openapi('Stars')

export const KidsSettingsSchema = z
  .object({
    sessionMinutes: z.number().int(),
    endReminder: z.boolean(),
    reminderBeforeMinutes: z.number().int(),
  })
  .openapi('KidsModeSettings')

export const KidsSessionSchema = z
  .object({
    endsAt: z.string(),
    reminderAt: z.string().nullable(),
  })
  .openapi('KidsSession')

export const KidsStateSchema = z
  .object({
    childName: z.string(),
    bunny: z.enum(['sleeping', 'awake']),
    starBalance: z.number().int(),
    session: KidsSessionSchema.nullable(),
  })
  .openapi('KidsState')

export const ErrorSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      field: z.string().optional(),
    }),
  })
  .openapi('Error')

export const errorResponse = (description: string) => ({
  content: {
    'application/json': {
      schema: ErrorSchema,
    },
  },
  description,
})
