import { createRoute, z } from '@hono/zod-openapi'
import { compare } from 'bcryptjs'
import { prisma } from '../db.js'
import { apiError } from '../lib/errors.js'
import { createRouter } from '../lib/openapi.js'
import { errorResponse } from '../lib/schemas.js'
import { clearSessionCookie } from '../lib/session.js'
import { requireAuth, requireChildAccess, requireParentMode } from '../middleware/auth.js'

export const accountRoutes = createRouter()

const PasswordInputSchema = z
  .object({
    password: z.string().min(1, 'Password is required').max(72),
  })
  .openapi('PasswordConfirmation')

const ChildParamsSchema = z.object({
  childId: z.uuid().openapi({ param: { name: 'childId', in: 'path' } }),
})

accountRoutes.use('/me', requireAuth, requireParentMode)
accountRoutes.use('/children/:childId/history/clear', requireAuth, requireParentMode, requireChildAccess)

const clearHistoryRoute = createRoute({
  method: 'post',
  path: '/children/{childId}/history/clear',
  tags: ['Account'],
  summary: 'Clear medication history',
  description:
    'Deletes past dose records. Medications, upcoming doses, and stars are kept. Cleared doses are never regenerated.',
  request: {
    params: ChildParamsSchema,
    body: {
      required: true,
      content: { 'application/json': { schema: PasswordInputSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ deleted: z.number().int() }) } },
      description: 'History cleared.',
    },
    400: errorResponse('Invalid data.'),
    401: errorResponse('Incorrect password or not signed in.'),
    403: errorResponse('Only available in Parent mode.'),
    404: errorResponse('Child not found.'),
  },
})

accountRoutes.openapi(clearHistoryRoute, async (c) => {
  const user = c.get('user')
  const child = c.get('child')
  const { password } = c.req.valid('json')

  if (!(await compare(password, user.passwordHash))) {
    return apiError(c, 401, 'INVALID_PASSWORD', 'Incorrect password.', 'password')
  }

  const now = new Date()
  const [, { count }] = await prisma.$transaction([
    prisma.child.update({ where: { id: child.id }, data: { historyClearedAt: now } }),
    prisma.doseLog.deleteMany({
      where: { medication: { childId: child.id }, scheduledAt: { lte: now } },
    }),
  ])

  return c.json({ deleted: count }, 200)
})

const deleteAccountRoute = createRoute({
  method: 'delete',
  path: '/me',
  tags: ['Account'],
  summary: 'Delete the account',
  description: 'Permanently deletes the parent account and all child, medication, dose, and star data.',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: PasswordInputSchema } },
    },
  },
  responses: {
    204: { description: 'Account deleted and session cookie cleared.' },
    400: errorResponse('Invalid data.'),
    401: errorResponse('Incorrect password or not signed in.'),
    403: errorResponse('Only available in Parent mode.'),
  },
})

accountRoutes.openapi(deleteAccountRoute, async (c) => {
  const user = c.get('user')
  const { password } = c.req.valid('json')

  if (!(await compare(password, user.passwordHash))) {
    return apiError(c, 401, 'INVALID_PASSWORD', 'Incorrect password.', 'password')
  }

  // Cascade di skema ikut menghapus anak, obat, dosis, bintang, dan sesi bermain.
  await prisma.user.delete({ where: { id: user.id } })
  clearSessionCookie(c)

  return c.body(null, 204)
})
