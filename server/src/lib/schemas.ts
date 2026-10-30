import { z } from '@hono/zod-openapi'

export const TimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Gunakan format jam HH:mm')
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
  .regex(/^\d{4}$/, 'PIN harus 4 digit angka')
  .openapi({ example: '1234' })

export const MedicationInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Nama obat wajib diisi').max(80, 'Nama obat maksimal 80 karakter'),
    dose: z.string().trim().min(1, 'Dosis wajib diisi').max(40, 'Dosis maksimal 40 karakter'),
    startDate: z.iso.date(),
    frequency: FrequencySchema,
    times: z.array(TimeSchema).max(8, 'Maksimal 8 jam minum'),
    meal: MealTimingSchema,
    days: z.array(WeekdaySchema),
    note: z.string().trim().max(1000, 'Catatan maksimal 1000 karakter').optional(),
  })
  .superRefine((value, ctx) => {
    if (value.frequency !== 'AS_NEEDED' && value.times.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['times'], message: 'Minimal satu jam minum' })
    }
    if (value.frequency === 'AS_NEEDED' && value.times.length > 0) {
      ctx.addIssue({ code: 'custom', path: ['times'], message: 'Obat "As needed" tidak punya jam tetap' })
    }
    if (value.frequency === 'SOME_DAYS' && value.days.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['days'], message: 'Pilih minimal satu hari' })
    }
    if (new Set(value.times).size !== value.times.length) {
      ctx.addIssue({ code: 'custom', path: ['times'], message: 'Jam minum tidak boleh sama' })
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
