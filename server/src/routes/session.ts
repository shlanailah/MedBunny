import { createRoute, z } from '@hono/zod-openapi'
import { compare, hash } from 'bcryptjs'
import { addMinutes } from 'date-fns'
import { prisma } from '../db.js'
import { apiError, notFound } from '../lib/errors.js'
import { createRouter } from '../lib/openapi.js'
import { errorResponse, KidsSessionSchema, PinSchema, SessionModeSchema } from '../lib/schemas.js'
import { setSessionCookie } from '../lib/session.js'
import { requireAuth, requireParentMode } from '../middleware/auth.js'

export const sessionRoutes = createRouter()

const MAX_PIN_ATTEMPTS = 5
const PIN_LOCK_MS = 5 * 60 * 1000

const SetPinInputSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password is required').max(72),
    pin: PinSchema,
  })
  .openapi('SetPinInput')

const ModeInputSchema = z
  .object({
    mode: SessionModeSchema,
    childId: z.uuid().optional(),
    pin: PinSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'child' && !value.childId) {
      ctx.addIssue({ code: 'custom', path: ['childId'], message: 'childId is required' })
    }
    if (value.mode === 'parent' && !value.pin) {
      ctx.addIssue({ code: 'custom', path: ['pin'], message: 'PIN is required' })
    }
  })
  .openapi('ModeInput')

const ModeResponseSchema = z
  .object({
    mode: SessionModeSchema,
    childId: z.string().nullable().optional(),
    session: KidsSessionSchema.nullable().optional(),
  })
  .openapi('ModeResponse')

sessionRoutes.use('/me/pin', requireAuth, requireParentMode)
sessionRoutes.use('/session/mode', requireAuth)

const setPinRoute = createRoute({
  method: 'put',
  path: '/me/pin',
  tags: ['Session'],
  summary: 'Set or change the Parent mode PIN',
  description: 'Requires the account password. The PIN is stored as a bcrypt hash.',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: SetPinInputSchema } },
    },
  },
  responses: {
    204: { description: 'PIN saved.' },
    400: errorResponse('Invalid PIN or password.'),
    401: errorResponse('Incorrect password or not signed in.'),
    403: errorResponse('Only available in Parent mode.'),
  },
})

sessionRoutes.openapi(setPinRoute, async (c) => {
  const user = c.get('user')
  const { currentPassword, pin } = c.req.valid('json')

  const passwordMatches = await compare(currentPassword, user.passwordHash)
  if (!passwordMatches) {
    return apiError(c, 401, 'INVALID_PASSWORD', 'Incorrect password.')
  }

  const pinHash = await hash(pin, 12)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      pinHash,
      pinFailedCount: 0,
      pinLockedUntil: null,
    },
  })

  return c.body(null, 204)
})

const switchModeRoute = createRoute({
  method: 'post',
  path: '/session/mode',
  tags: ['Session'],
  summary: 'Switch between Parent mode and Kids mode',
  description:
    'Parent → Kids needs no PIN and starts a play session. Kids → Parent requires the PIN.',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: ModeInputSchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: ModeResponseSchema } },
      description: 'Mode switched and session cookie updated.',
    },
    400: errorResponse('Invalid mode data.'),
    401: errorResponse('Incorrect PIN or not signed in.'),
    403: errorResponse('This mode switch is not allowed.'),
    404: errorResponse('Child not found.'),
    409: errorResponse('PIN has not been set.'),
    423: errorResponse('PIN is temporarily locked or play time is over.'),
  },
})

sessionRoutes.openapi(switchModeRoute, async (c) => {
  const user = c.get('user')
  const sessionMode = c.get('sessionMode')
  const input = c.req.valid('json')

  if (input.mode === 'child') {
    if (sessionMode !== 'parent') {
      return apiError(c, 403, 'PARENT_MODE_REQUIRED', 'Switch back to Parent mode first.')
    }

    if (!user.pinHash) {
      return apiError(
        c,
        409,
        'PIN_NOT_SET',
        'Set a PIN before entering Kids mode.',
      )
    }

    const child = await prisma.child.findFirst({
      where: { id: input.childId!, userId: user.id },
    })
    if (!child) return notFound(c)

    const settings = await prisma.kidsModeSettings.upsert({
      where: { childId: child.id },
      create: { childId: child.id },
      update: {},
    })

    const now = new Date()
    const playSession = await prisma.$transaction(async (tx) => {
      // Tutup sesi lama supaya partial unique index play_sessions_one_active tidak dilanggar.
      await tx.playSession.updateMany({
        where: { childId: child.id, endedAt: null },
        data: { endedAt: now },
      })

      return tx.playSession.create({
        data: {
          childId: child.id,
          startedAt: now,
          endsAt: addMinutes(now, settings.sessionMinutes),
        },
      })
    })

    const reminderAt = settings.endReminder
      ? new Date(
          Math.max(
            playSession.startedAt.getTime(),
            playSession.endsAt.getTime() - settings.reminderBeforeMinutes * 60 * 1000,
          ),
        )
      : null

    await setSessionCookie(c, user.id, 'child', child.id)

    return c.json(
      {
        mode: 'child' as const,
        childId: child.id,
        session: {
          endsAt: playSession.endsAt.toISOString(),
          reminderAt: reminderAt?.toISOString() ?? null,
        },
      },
      200,
    )
  }

  if (sessionMode !== 'child') {
    return apiError(c, 403, 'CHILD_MODE_REQUIRED', 'You are already in Parent mode.')
  }

  const child = c.get('child')
  const now = new Date()

  if (user.pinLockedUntil && user.pinLockedUntil > now) {
    return apiError(
      c,
      423,
      'PIN_LOCKED',
      'Too many PIN attempts. Please try again later.',
      undefined,
      { lockedUntil: user.pinLockedUntil.toISOString() },
    )
  }

  if (!user.pinHash) {
    return apiError(c, 409, 'PIN_NOT_SET', 'No PIN has been set for this account.')
  }

  const pinMatches = await compare(input.pin!, user.pinHash)

  if (!pinMatches) {
    const failedCount = user.pinFailedCount + 1

    if (failedCount >= MAX_PIN_ATTEMPTS) {
      const lockedUntil = new Date(now.getTime() + PIN_LOCK_MS)
      await prisma.user.update({
        where: { id: user.id },
        data: { pinFailedCount: 0, pinLockedUntil: lockedUntil },
      })

      return apiError(
        c,
        423,
        'PIN_LOCKED',
        'Too many PIN attempts. Try again in 5 minutes.',
        undefined,
        { lockedUntil: lockedUntil.toISOString() },
      )
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { pinFailedCount: failedCount },
    })

    return apiError(c, 401, 'INVALID_PIN', 'Incorrect PIN.', undefined, {
      remainingAttempts: MAX_PIN_ATTEMPTS - failedCount,
    })
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { pinFailedCount: 0, pinLockedUntil: null },
    }),
    prisma.playSession.updateMany({
      where: { childId: child.id, endedAt: null },
      data: { endedAt: now },
    }),
  ])

  await setSessionCookie(c, user.id, 'parent')

  return c.json({ mode: 'parent' as const }, 200)
})
