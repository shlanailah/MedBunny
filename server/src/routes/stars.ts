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
  summary: "Child's star balance and total",
  description:
    'balance = all transactions (used in Kids mode), earned = positive transactions only ("stars collected" label).',
  request: { params: ChildParamsSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: StarsSchema } },
      description: 'Computed from the star_transactions ledger.',
    },
    401: errorResponse('Not signed in.'),
    403: errorResponse('Only available in Parent mode.'),
    404: errorResponse('Child not found.'),
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
