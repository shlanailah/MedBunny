import { createRoute, z } from '@hono/zod-openapi'
import { prisma } from '../db.js'
import { toChildDto } from '../lib/dto.js'
import { createRouter } from '../lib/openapi.js'
import { ChildSchema, errorResponse } from '../lib/schemas.js'
import { requireAuth, requireChildAccess, requireParentMode } from '../middleware/auth.js'

export const childRoutes = createRouter()

const MIN_BIRTH_YEAR = 2000

const ChildParamsSchema = z.object({
  childId: z.uuid().openapi({ param: { name: 'childId', in: 'path' } }),
})

const ChildInputSchema = z
  .object({
    nickname: z.string().trim().min(1, 'Please enter a name').max(40, 'Name must be 40 characters or fewer'),
    birthYear: z
      .number()
      .int()
      .min(MIN_BIRTH_YEAR, `Birth year must be ${MIN_BIRTH_YEAR} or later`)
      .refine(year => year <= new Date().getFullYear(), 'Birth year cannot be in the future')
      .nullable(),
  })
  .openapi('ChildInput')

childRoutes.use('/children/:childId', requireAuth, requireParentMode, requireChildAccess)

const updateChildRoute = createRoute({
  method: 'put',
  path: '/children/{childId}',
  tags: ['Children'],
  summary: 'Update the child profile',
  request: {
    params: ChildParamsSchema,
    body: {
      required: true,
      content: { 'application/json': { schema: ChildInputSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: ChildSchema } },
      description: 'Child profile saved.',
    },
    400: errorResponse('Invalid child profile.'),
    401: errorResponse('Not signed in.'),
    403: errorResponse('Only available in Parent mode.'),
    404: errorResponse('Child not found.'),
  },
})

childRoutes.openapi(updateChildRoute, async (c) => {
  const child = c.get('child')
  const input = c.req.valid('json')

  const updated = await prisma.child.update({
    where: { id: child.id },
    data: { nickname: input.nickname, birthYear: input.birthYear },
  })

  return c.json(toChildDto(updated), 200)
})
