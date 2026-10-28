import { createRoute, z } from '@hono/zod-openapi'
import { prisma } from '../db.js'
import { createRouter } from '../lib/openapi.js'
import { errorResponse } from '../lib/schemas.js'
import { requireAuth, requireChildAccess } from '../middleware/auth.js'

export const starRoutes = createRouter()

const ChildParamsSchema = z.object({
  childId: z.uuid().openapi({ param: { name: 'childId', in: 'path' } }),
})

starRoutes.use('/children/:childId/stars', requireAuth, requireChildAccess)

const balanceRoute = createRoute({
  method: 'get',
  path: '/children/{childId}/stars',
  tags: ['Stars'],
  summary: 'Saldo bintang anak',
  request: { params: ChildParamsSchema },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({ balance: z.number().int() }),
        },
      },
      description: 'Saldo dihitung dari ledger star_transactions.',
    },
    401: errorResponse('Belum masuk.'),
    404: errorResponse('Anak tidak ditemukan.'),
  },
})

starRoutes.openapi(balanceRoute, async (c) => {
  const child = c.get('child')
  const aggregate = await prisma.starTransaction.aggregate({
    where: { childId: child.id },
    _sum: { amount: true },
  })

  return c.json({ balance: aggregate._sum.amount ?? 0 }, 200)
})
