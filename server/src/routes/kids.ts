import { createRoute, z } from '@hono/zod-openapi'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { prisma } from '../db.js'
import type { Game } from '../generated/prisma/client.js'
import { ApiError, apiError } from '../lib/errors.js'
import { createRouter } from '../lib/openapi.js'
import {
  errorResponse,
  GameIdSchema,
  KidsSettingsSchema,
  KidsStateSchema,
} from '../lib/schemas.js'
import { requireAuth, requireChildAccess, requireChildMode, requireParentMode } from '../middleware/auth.js'
import { ensureDoseLogs } from '../services/dose-schedule.js'

export const kidsRoutes = createRouter()

const GAME_COST = 1

const GAME_ENUM: Record<z.infer<typeof GameIdSchema>, Game> = {
  garden: 'GARDEN',
  style: 'STYLE',
  'match-up': 'MATCH_UP',
  'color-hunt': 'COLOR_HUNT',
}

const ChildParamsSchema = z.object({
  childId: z.uuid().openapi({ param: { name: 'childId', in: 'path' } }),
})

const GameParamsSchema = z.object({
  game: GameIdSchema.openapi({ param: { name: 'game', in: 'path' }, example: 'match-up' }),
})

const KidsSettingsInputSchema = z
  .object({
    sessionMinutes: z.number().int().min(5, 'Minimal 5 menit').max(30, 'Maksimal 30 menit'),
    endReminder: z.boolean(),
    reminderBeforeMinutes: z
      .number()
      .int()
      .min(1, 'Minimal 1 menit')
      .max(30, 'Maksimal 30 menit'),
  })
  .openapi('KidsModeSettingsInput')

kidsRoutes.use(
  '/children/:childId/kids-settings',
  requireAuth,
  requireParentMode,
  requireChildAccess,
)
kidsRoutes.use(
  '/children/:childId/play-sessions/current/end',
  requireAuth,
  requireParentMode,
  requireChildAccess,
)
kidsRoutes.use('/kids/*', requireAuth, requireChildMode)

function reminderAtFor(
  session: { startedAt: Date; endsAt: Date },
  settings: { endReminder: boolean; reminderBeforeMinutes: number },
) {
  if (!settings.endReminder) return null

  return new Date(
    Math.max(
      session.startedAt.getTime(),
      session.endsAt.getTime() - settings.reminderBeforeMinutes * 60 * 1000,
    ),
  )
}

const getSettingsRoute = createRoute({
  method: 'get',
  path: '/children/{childId}/kids-settings',
  tags: ['Kids'],
  summary: 'Pengaturan sesi Kids mode',
  request: { params: ChildParamsSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: KidsSettingsSchema } },
      description: 'Pengaturan sesi bermain anak.',
    },
    401: errorResponse('Belum masuk.'),
    403: errorResponse('Hanya bisa dibuka dari Parent mode.'),
    404: errorResponse('Anak tidak ditemukan.'),
  },
})

kidsRoutes.openapi(getSettingsRoute, async (c) => {
  const child = c.get('child')
  const settings = await prisma.kidsModeSettings.upsert({
    where: { childId: child.id },
    create: { childId: child.id },
    update: {},
  })

  return c.json(
    {
      sessionMinutes: settings.sessionMinutes,
      endReminder: settings.endReminder,
      reminderBeforeMinutes: settings.reminderBeforeMinutes,
    },
    200,
  )
})

const updateSettingsRoute = createRoute({
  method: 'put',
  path: '/children/{childId}/kids-settings',
  tags: ['Kids'],
  summary: 'Ubah pengaturan sesi Kids mode',
  request: {
    params: ChildParamsSchema,
    body: {
      required: true,
      content: { 'application/json': { schema: KidsSettingsInputSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: KidsSettingsSchema } },
      description: 'Pengaturan berhasil disimpan.',
    },
    400: errorResponse('Pengaturan tidak valid.'),
    401: errorResponse('Belum masuk.'),
    403: errorResponse('Hanya bisa dibuka dari Parent mode.'),
    404: errorResponse('Anak tidak ditemukan.'),
  },
})

kidsRoutes.openapi(updateSettingsRoute, async (c) => {
  const child = c.get('child')
  const input = c.req.valid('json')

  const settings = await prisma.kidsModeSettings.upsert({
    where: { childId: child.id },
    create: { childId: child.id, ...input },
    update: input,
  })

  return c.json(
    {
      sessionMinutes: settings.sessionMinutes,
      endReminder: settings.endReminder,
      reminderBeforeMinutes: settings.reminderBeforeMinutes,
    },
    200,
  )
})

const endSessionRoute = createRoute({
  method: 'post',
  path: '/children/{childId}/play-sessions/current/end',
  tags: ['Kids'],
  summary: 'Akhiri sesi bermain yang sedang aktif',
  request: { params: ChildParamsSchema },
  responses: {
    204: { description: 'Sesi bermain diakhiri.' },
    401: errorResponse('Belum masuk.'),
    403: errorResponse('Hanya bisa dibuka dari Parent mode.'),
    404: errorResponse('Anak tidak ditemukan.'),
  },
})

kidsRoutes.openapi(endSessionRoute, async (c) => {
  const child = c.get('child')

  await prisma.playSession.updateMany({
    where: { childId: child.id, endedAt: null },
    data: { endedAt: new Date() },
  })

  return c.body(null, 204)
})

const stateRoute = createRoute({
  method: 'get',
  path: '/kids/state',
  tags: ['Kids'],
  summary: 'State Kids mode',
  description:
    'childId diambil dari token, bukan URL. Bunny tidur kalau ada dosis hari ini yang sudah jatuh tempo dan belum dikonfirmasi.',
  responses: {
    200: {
      content: { 'application/json': { schema: KidsStateSchema } },
      description: 'Nama anak, kondisi Bunny, saldo bintang, dan sesi bermain aktif.',
    },
    401: errorResponse('Belum masuk.'),
    403: errorResponse('Hanya bisa dibuka dari Kids mode.'),
  },
})

kidsRoutes.openapi(stateRoute, async (c) => {
  const user = c.get('user')
  const child = c.get('child')
  const now = new Date()
  const todayKey = formatInTimeZone(now, user.timezone, 'yyyy-MM-dd')

  await ensureDoseLogs(child.id, todayKey, todayKey, user.timezone)

  const dayStart = fromZonedTime(`${todayKey}T00:00:00.000`, user.timezone)
  const dayEnd = fromZonedTime(`${todayKey}T23:59:59.999`, user.timezone)

  const [settings, playSession, starAggregate, todayDoses] = await Promise.all([
    prisma.kidsModeSettings.findUnique({ where: { childId: child.id } }),
    prisma.playSession.findFirst({
      where: { childId: child.id, endedAt: null },
      orderBy: { startedAt: 'desc' },
    }),
    prisma.starTransaction.aggregate({
      where: { childId: child.id },
      _sum: { amount: true },
    }),
    prisma.doseLog.findMany({
      where: {
        medication: { childId: child.id },
        scheduledAt: { gte: dayStart, lte: dayEnd },
      },
      select: { scheduledAt: true, confirmedAt: true },
    }),
  ])

  const effectiveSettings = settings ?? {
    endReminder: true,
    reminderBeforeMinutes: 2,
  }
  const reminderAt = playSession ? reminderAtFor(playSession, effectiveSettings) : null
  const sleeping = todayDoses.some(
    (dose) => dose.confirmedAt === null && dose.scheduledAt <= now,
  )

  return c.json(
    {
      childName: child.nickname?.trim() || user.name.split(' ')[0] || 'kiddo',
      bunny: sleeping ? ('sleeping' as const) : ('awake' as const),
      starBalance: starAggregate._sum.amount ?? 0,
      session: playSession
        ? {
            endsAt: playSession.endsAt.toISOString(),
            reminderAt: reminderAt?.toISOString() ?? null,
          }
        : null,
    },
    200,
  )
})

const startGameRoute = createRoute({
  method: 'post',
  path: '/kids/games/{game}/start',
  tags: ['Kids'],
  summary: 'Mulai satu kali main dan potong 1 bintang',
  description:
    'Memakai row lock pada anak supaya dua ketukan cepat tidak membuat saldo bintang negatif.',
  request: { params: GameParamsSchema },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ starBalance: z.number().int() }),
        },
      },
      description: 'Game dimulai dan 1 bintang tercatat sebagai GAME_PLAY.',
    },
    401: errorResponse('Belum masuk.'),
    403: errorResponse('Hanya bisa dibuka dari Kids mode.'),
    409: errorResponse('Bintang belum cukup.'),
    423: errorResponse('Waktu bermain sudah habis.'),
  },
})

kidsRoutes.openapi(startGameRoute, async (c) => {
  const child = c.get('child')
  const { game } = c.req.valid('param')
  const gameEnum = GAME_ENUM[game]

  let starBalance: number
  try {
    starBalance = await prisma.$transaction(
      async (tx) => {
        // Kunci baris anak: pengecekan saldo dan pencatatan -1 menjadi atomik.
        await tx.$queryRaw`SELECT id FROM children WHERE id = ${child.id}::uuid FOR UPDATE`

        const now = new Date()
        const session = await tx.playSession.findFirst({
          where: { childId: child.id, endedAt: null, endsAt: { gt: now } },
        })

        if (!session) {
          throw new ApiError(423, 'PLAY_TIME_OVER', 'Waktunya istirahat dulu!')
        }

        const aggregate = await tx.starTransaction.aggregate({
          where: { childId: child.id },
          _sum: { amount: true },
        })
        const balance = aggregate._sum.amount ?? 0

        if (balance < GAME_COST) {
          throw new ApiError(409, 'NOT_ENOUGH_STARS', 'Bintangnya belum cukup')
        }

        await tx.starTransaction.create({
          data: {
            childId: child.id,
            amount: -GAME_COST,
            reason: 'GAME_PLAY',
            game: gameEnum,
          },
        })

        return balance - GAME_COST
      },
      // Ketukan beruntun mengantre di row lock; beri waktu lebih dari default 5 detik.
      { maxWait: 10000, timeout: 20000 },
    )
  } catch (error) {
    if ((error as { code?: string }).code === 'P2028') {
      throw new ApiError(409, 'GAME_START_BUSY', 'Coba lagi sebentar ya.')
    }
    throw error
  }

  return c.json({ starBalance }, 200)
})
