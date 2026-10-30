import { createRoute, z } from '@hono/zod-openapi'
import { prisma } from '../db.js'
import { createRouter } from '../lib/openapi.js'
import { errorResponse, StarsSchema } from '../lib/schemas.js'
import { requireAuth, requireChildAccess, requireParentMode } from '../middleware/auth.js'

export const starRoutes = createRouter()

const ChildParamsSchema = z.object({
  childId: z.uuid().openapi({ param: { name: 'childId', in: 'path' } }),
})

starRoutes.use('/children/:childId/stars', requireAuth, requireParentMode, requireChildAccess)

const balanceRoute = createRoute({
  method: 'get',
  path: '/children/{childId}/stars',
  tags: ['Stars'],
  summary: 'Saldo dan total bintang anak',
  description:
    'balance = semua transaksi (dipakai Kids mode), earned = hanya transaksi positif (label "stars collected").',
  request: { params: ChildParamsSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: StarsSchema } },
      description: 'Saldo dihitung dari ledger star_transactions.',
    },
    401: errorResponse('Belum masuk.'),
    403: errorResponse('Hanya bisa dibuka dari Parent mode.'),
    404: errorResponse('Anak tidak ditemukan.'),
  },
})

starRoutes.openapi(balanceRoute, async (c) => {
  const child = c.get('child')
  const [all, positive] = await Promise.all([
    prisma.starTransaction.aggregate({
      where: { childId: child.id },
      _sum: { amount: true },
    }),
    prisma.starTransaction.aggregate({
      where: { childId: child.id, amount: { gt: 0 } },
      _sum: { amount: true },
    }),
  ])

  return c.json(
    {
      balance: all._sum.amount ?? 0,
      earned: positive._sum.amount ?? 0,
    },
    200,
  )
})
