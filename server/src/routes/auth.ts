import { createRoute, z } from '@hono/zod-openapi'
import { compare, hash } from 'bcryptjs'
import { prisma } from '../db.js'
import { apiError } from '../lib/errors.js'
import { createRouter } from '../lib/openapi.js'
import { toChildDto, toUserDto } from '../lib/dto.js'
import { clearSessionCookie, setSessionCookie } from '../lib/session.js'
import { errorResponse, SessionSchema } from '../lib/schemas.js'
import { requireAuth } from '../middleware/auth.js'
import type { SessionMode } from '../types.js'

export const authRoutes = createRouter()

const WELCOME_BONUS_STARS = 3

const CredentialsSchema = z
  .object({
    email: z.email('Invalid email format').max(254).openapi({ example: 'parent@example.com' }),
    password: z.string().min(6, 'Password must be at least 6 characters').max(72, 'Password must be 72 characters or fewer'),
  })
  .openapi('LoginInput')

const SignupSchema = CredentialsSchema.extend({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or fewer'),
}).openapi('SignupInput')

async function loadSession(userId: string, mode: SessionMode, childId: string | null) {
  const [user, children] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.child.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, nickname: true, birthYear: true },
    }),
  ])

  return {
    user: toUserDto(user),
    children: children.map(toChildDto),
    mode,
    childId,
  }
}

const signupRoute = createRoute({
  method: 'post',
  path: '/auth/signup',
  tags: ['Auth'],
  summary: 'Create a parent account',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: SignupSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: SessionSchema } },
      description: 'Account created and signed in.',
    },
    400: errorResponse('Invalid sign-up data.'),
    409: errorResponse('Email is already registered.'),
  },
})

authRoutes.openapi(signupRoute, async (c) => {
  const input = c.req.valid('json')
  const email = input.email.trim().toLowerCase()

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return apiError(c, 409, 'EMAIL_TAKEN', 'This email is already registered.', 'email')
  }

  const passwordHash = await hash(input.password, 12)

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: input.name,
          email,
          passwordHash,
        },
      })
      const child = await tx.child.create({ data: { userId: created.id } })
      await tx.starTransaction.create({
        data: {
          childId: child.id,
          amount: WELCOME_BONUS_STARS,
          reason: 'WELCOME_BONUS',
        },
      })
      return created
    })

    await setSessionCookie(c, user.id, 'parent')
    const session = await loadSession(user.id, 'parent', null)
    return c.json(session, 201)
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return apiError(c, 409, 'EMAIL_TAKEN', 'This email is already registered.', 'email')
    }
    throw error
  }
})

const loginRoute = createRoute({
  method: 'post',
  path: '/auth/login',
  tags: ['Auth'],
  summary: 'Sign in',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: CredentialsSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: SessionSchema } },
      description: 'Signed in.',
    },
    400: errorResponse('Invalid sign-in data.'),
    401: errorResponse('Incorrect email or password.'),
  },
})

authRoutes.openapi(loginRoute, async (c) => {
  const input = c.req.valid('json')
  const email = input.email.trim().toLowerCase()

  const user = await prisma.user.findUnique({ where: { email } })
  const passwordMatches = user ? await compare(input.password, user.passwordHash) : false

  if (!user || !passwordMatches) {
    // Pesan selalu sama supaya email mana yang terdaftar tidak bocor.
    return apiError(c, 401, 'INVALID_CREDENTIALS', 'Incorrect email or password.')
  }

  await setSessionCookie(c, user.id, 'parent')
  const session = await loadSession(user.id, 'parent', null)
  return c.json(session, 200)
})

const logoutRoute = createRoute({
  method: 'post',
  path: '/auth/logout',
  tags: ['Auth'],
  summary: 'Sign out',
  responses: {
    204: { description: 'Session cookie cleared.' },
    401: errorResponse('Not signed in.'),
  },
})

authRoutes.use('/auth/logout', requireAuth)
authRoutes.use('/auth/me', requireAuth)

authRoutes.openapi(logoutRoute, (c) => {
  clearSessionCookie(c)
  return c.body(null, 204)
})

const meRoute = createRoute({
  method: 'get',
  path: '/auth/me',
  tags: ['Auth'],
  summary: 'Get the current session',
  responses: {
    200: {
      content: { 'application/json': { schema: SessionSchema } },
      description: 'The user and linked children.',
    },
    401: errorResponse('Not signed in.'),
  },
})

authRoutes.openapi(meRoute, async (c) => {
  const user = c.get('user')
  const mode = c.get('sessionMode')
  const childId = mode === 'child' ? c.get('child').id : null
  const children = await prisma.child.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, nickname: true, birthYear: true },
  })

  return c.json(
    {
      user: toUserDto(user),
      children: children.map(toChildDto),
      mode,
      childId,
    },
    200,
  )
})
