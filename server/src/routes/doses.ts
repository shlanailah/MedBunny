import { createRoute, z } from '@hono/zod-openapi'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { prisma } from '../db.js'
import { toDoseDto } from '../lib/dto.js'
import { ApiError, apiError, isUuid, notFound } from '../lib/errors.js'
import { createRouter } from '../lib/openapi.js'
import {
  DoseLogSchema,
  DoseStatusSchema,
  errorResponse,
} from '../lib/schemas.js'
import { requireAuth, requireChildAccess, requireParentMode } from '../middleware/auth.js'
import { AWAITING_WINDOW_MS } from '../services/dose-status.js'
import { ensureDoseLogs, MAX_RANGE_DAYS } from '../services/dose-schedule.js'

export const doseRoutes = createRouter()

const MAX_EARLY_MS = 60 * 60 * 1000

const ChildParamsSchema = z.object({
  childId: z.uuid().openapi({ param: { name: 'childId', in: 'path' } }),
})

const DoseParamsSchema = z.object({
  id: z.uuid().openapi({ param: { name: 'id', in: 'path' } }),
})

const DoseQuerySchema = z.object({
  from: z.iso.date().openapi({ param: { name: 'from', in: 'query' }, example: '2026-10-01' }),
  to: z.iso.date().openapi({ param: { name: 'to', in: 'query' }, example: '2026-10-31' }),
  status: DoseStatusSchema.optional().openapi({ param: { name: 'status', in: 'query' } }),
  q: z
    .string()
    .trim()
    .max(80)
    .optional()
    .openapi({ param: { name: 'q', in: 'query' }, example: 'Ibuprofen' }),
})

doseRoutes.use(
  '/children/:childId/doses',
  requireAuth,
  requireParentMode,
  requireChildAccess,
)
doseRoutes.use('/doses/*', requireAuth, requireParentMode)

type DateTimeFilter = {
  gte?: Date
  lte?: Date
  gt?: Date
  lt?: Date
}

function buildScheduledAtFilter(
  base: { gte: Date; lte: Date },
  status: z.infer<typeof DoseStatusSchema> | undefined,
): DateTimeFilter {
  const now = Date.now()
  const lower = base.gte.getTime()
  const upper = base.lte.getTime()

  switch (status) {
    case 'upcoming':
      // Jika rentang yang diminta seluruhnya di masa depan, jangan buang dosis di batas bawah.
      return lower > now
        ? { gte: base.gte, lte: base.lte }
        : { gt: new Date(now), lte: base.lte }
    case 'awaiting':
      return {
        gte: new Date(Math.max(lower, now - AWAITING_WINDOW_MS)),
        lte: new Date(Math.min(upper, now)),
      }
    case 'missed':
      return {
        gte: base.gte,
        lte: new Date(Math.min(upper, now - AWAITING_WINDOW_MS - 1)),
      }
    default:
      return { gte: base.gte, lte: base.lte }
  }
}

const listDosesRoute = createRoute({
  method: 'get',
  path: '/children/{childId}/doses',
  tags: ['Doses'],
  summary: 'Daftar dosis pada rentang tanggal',
  description:
    'Baris dosis dibuat otomatis (lazy) dari jadwal obat. Rentang maksimal 62 hari.',
  request: {
    params: ChildParamsSchema,
    query: DoseQuerySchema,
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.array(DoseLogSchema) } },
      description: 'Daftar dosis beserta status yang dihitung dari waktu sekarang.',
    },
    400: errorResponse('Rentang tanggal tidak valid.'),
    401: errorResponse('Belum masuk.'),
    404: errorResponse('Anak tidak ditemukan.'),
  },
})

doseRoutes.openapi(listDosesRoute, async (c) => {
  const child = c.get('child')
  const user = c.get('user')
  const { from, to, status, q } = c.req.valid('query')

  const rangeDays = differenceInCalendarDays(parseISO(to), parseISO(from)) + 1
  if (rangeDays < 1) {
    return apiError(c, 400, 'INVALID_RANGE', 'Tanggal "to" harus sama atau setelah "from".', 'to')
  }
  if (rangeDays > MAX_RANGE_DAYS) {
    return apiError(
      c,
      400,
      'RANGE_TOO_LARGE',
      `Rentang maksimal ${MAX_RANGE_DAYS} hari per permintaan.`,
      'to',
    )
  }

  await ensureDoseLogs(child.id, from, to, user.timezone)

  const baseRange = {
    gte: fromZonedTime(`${from}T00:00:00.000`, user.timezone),
    lte: fromZonedTime(`${to}T23:59:59.999`, user.timezone),
  }

  const scheduledAt = buildScheduledAtFilter(baseRange, status)

  const logs = await prisma.doseLog.findMany({
    where: {
      medication: { childId: child.id },
      scheduledAt,
      ...(q ? { medicationName: { contains: q, mode: 'insensitive' as const } } : {}),
      ...(status === 'recorded'
        ? { confirmedAt: { not: null } }
        : status
          ? { confirmedAt: null }
          : {}),
    },
    orderBy: { scheduledAt: 'asc' },
  })

  return c.json(logs.map(toDoseDto), 200)
})

const confirmDoseRoute = createRoute({
  method: 'post',
  path: '/doses/{id}/confirm',
  tags: ['Doses'],
  summary: 'Konfirmasi dosis dan beri 1 bintang',
  request: { params: DoseParamsSchema },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            dose: DoseLogSchema,
            starBalance: z.number().int(),
          }),
        },
      },
      description: 'Dosis tercatat dan satu bintang ditambahkan.',
    },
    401: errorResponse('Belum masuk.'),
    404: errorResponse('Dosis tidak ditemukan.'),
    409: errorResponse('Dosis sudah pernah dikonfirmasi.'),
    422: errorResponse('Dosis belum waktunya dikonfirmasi.'),
  },
})

doseRoutes.openapi(confirmDoseRoute, async (c) => {
  const user = c.get('user')
  const { id } = c.req.valid('param')
  if (!isUuid(id)) return notFound(c)

  const dose = await prisma.doseLog.findFirst({
    where: {
      id,
      medication: { child: { userId: user.id } },
    },
    include: { medication: { select: { childId: true } } },
  })

  if (!dose) return notFound(c)
  if (dose.confirmedAt) {
    return apiError(c, 409, 'ALREADY_CONFIRMED', 'Dosis ini sudah dikonfirmasi.')
  }
  if (dose.scheduledAt.getTime() - Date.now() > MAX_EARLY_MS) {
    return apiError(c, 422, 'NOT_YET', 'Belum waktunya dosis ini dikonfirmasi.')
  }

  const confirmedAt = new Date()

  const starBalance = await prisma.$transaction(async (tx) => {
    // Update bersyarat: hanya berhasil kalau belum pernah dikonfirmasi.
    // Ini membuat klik dobel / dua request bersamaan tetap aman.
    const { count } = await tx.doseLog.updateMany({
      where: { id: dose.id, confirmedAt: null },
      data: { confirmedAt, confirmedById: user.id },
    })

    if (count === 0) {
      throw new ApiError(409, 'ALREADY_CONFIRMED', 'Dosis ini sudah dikonfirmasi.')
    }

    await tx.starTransaction.create({
      data: {
        childId: dose.medication.childId,
        amount: 1,
        reason: 'DOSE_CONFIRMED',
        doseLogId: dose.id,
      },
    })

    const aggregate = await tx.starTransaction.aggregate({
      where: { childId: dose.medication.childId },
      _sum: { amount: true },
    })

    return aggregate._sum.amount ?? 0
  })

  return c.json(
    {
      dose: toDoseDto({ ...dose, confirmedAt }),
      starBalance,
    },
    200,
  )
})
