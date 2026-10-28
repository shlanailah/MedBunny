import { createRoute, z } from '@hono/zod-openapi'
import { compare, hash } from 'bcryptjs'
import { prisma } from '../db.js'
import { apiError } from '../lib/errors.js'
import { createRouter } from '../lib/openapi.js'
import { toChildDto, toUserDto } from '../lib/dto.js'
import { clearSessionCookie, setSessionCookie } from '../lib/session.js'
import { errorResponse, SessionSchema } from '../lib/schemas.js'
import { requireAuth } from '../middleware/auth.js'

export const authRoutes = createRouter()

const CredentialsSchema = z
  .object({
    email: z.email('Format email tidak valid').max(254).openapi({ example: 'parent@example.com' }),
    password: z.string().min(6, 'Password minimal 6 karakter').max(72, 'Password maksimal 72 karakter'),
  })
  .openapi('LoginInput')

const SignupSchema = CredentialsSchema.extend({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter'),
}).openapi('SignupInput')

async function loadSession(userId: string) {
  const [user, children] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.child.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, nickname: true },
    }),
  ])

  return {
    user: toUserDto(user),
    children: children.map(toChildDto),
  }
}

const signupRoute = createRoute({
  method: 'post',
  path: '/auth/signup',
  tags: ['Auth'],
  summary: 'Buat akun orang tua',
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
      description: 'Akun berhasil dibuat dan sesi langsung aktif.',
    },
    400: errorResponse('Data pendaftaran tidak valid.'),
    409: errorResponse('Email sudah terdaftar.'),
  },
})

authRoutes.openapi(signupRoute, async (c) => {
  const input = c.req.valid('json')
  const email = input.email.trim().toLowerCase()

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return apiError(c, 409, 'EMAIL_TAKEN', 'Email ini sudah terdaftar.', 'email')
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
      await tx.child.create({ data: { userId: created.id } })
      return created
    })

    await setSessionCookie(c, user.id)
    const session = await loadSession(user.id)
    return c.json(session, 201)
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return apiError(c, 409, 'EMAIL_TAKEN', 'Email ini sudah terdaftar.', 'email')
    }
    throw error
  }
})

const loginRoute = createRoute({
  method: 'post',
  path: '/auth/login',
  tags: ['Auth'],
  summary: 'Masuk ke akun',
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
      description: 'Login berhasil.',
    },
    400: errorResponse('Data login tidak valid.'),
    401: errorResponse('Email atau password salah.'),
  },
})

authRoutes.openapi(loginRoute, async (c) => {
  const input = c.req.valid('json')
  const email = input.email.trim().toLowerCase()

  const user = await prisma.user.findUnique({ where: { email } })
  const passwordMatches = user ? await compare(input.password, user.passwordHash) : false

  if (!user || !passwordMatches) {
    // Pesan selalu sama supaya email mana yang terdaftar tidak bocor.
    return apiError(c, 401, 'INVALID_CREDENTIALS', 'Email atau password salah.')
  }

  await setSessionCookie(c, user.id)
  const session = await loadSession(user.id)
  return c.json(session, 200)
})

const logoutRoute = createRoute({
  method: 'post',
  path: '/auth/logout',
  tags: ['Auth'],
  summary: 'Keluar dari akun',
  responses: {
    204: { description: 'Cookie sesi dihapus.' },
    401: errorResponse('Belum masuk.'),
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
  summary: 'Ambil sesi yang sedang aktif',
  responses: {
    200: {
      content: { 'application/json': { schema: SessionSchema } },
      description: 'Data pengguna dan anak yang terhubung.',
    },
    401: errorResponse('Belum masuk.'),
  },
})

authRoutes.openapi(meRoute, async (c) => {
  const user = c.get('user')
  const children = await prisma.child.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, nickname: true },
  })

  return c.json(
    {
      user: toUserDto(user),
      children: children.map(toChildDto),
    },
    200,
  )
})
