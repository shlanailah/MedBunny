import type { MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'
import { verify } from 'hono/jwt'
import { prisma } from '../db.js'
import { env } from '../env.js'
import { apiError, isUuid, notFound } from '../lib/errors.js'
import { SESSION_COOKIE } from '../lib/session.js'
import type { AppEnv, SessionMode } from '../types.js'

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE)

  if (!token) {
    return apiError(c, 401, 'UNAUTHENTICATED', 'Please sign in first.')
  }

  let payload: Record<string, unknown>
  try {
    payload = await verify(token, env.JWT_SECRET, 'HS256')
  } catch {
    return apiError(c, 401, 'UNAUTHENTICATED', 'Your session has ended. Please sign in again.')
  }

  if (typeof payload.sub !== 'string' || !isUuid(payload.sub)) {
    return apiError(c, 401, 'UNAUTHENTICATED', 'Invalid session. Please sign in again.')
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user) {
    return apiError(c, 401, 'UNAUTHENTICATED', 'Account not found. Please sign in again.')
  }

  // Token lama (sebelum tahap 2) tidak punya mode; anggap Parent mode.
  const mode: SessionMode = payload.mode === 'child' ? 'child' : 'parent'

  if (mode === 'child') {
    const childId = typeof payload.childId === 'string' ? payload.childId : ''
    if (!isUuid(childId)) {
      return apiError(c, 401, 'UNAUTHENTICATED', 'Invalid Kids mode session. Please sign in again.')
    }

    const child = await prisma.child.findFirst({
      where: { id: childId, userId: user.id },
    })
    if (!child) {
      return apiError(c, 401, 'UNAUTHENTICATED', 'Child profile not found. Please sign in again.')
    }

    c.set('child', child)
  }

  c.set('user', user)
  c.set('sessionMode', mode)
  await next()
}

export const requireParentMode: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.get('sessionMode') !== 'parent') {
    return apiError(
      c,
      403,
      'PARENT_MODE_REQUIRED',
      'This feature is only available in Parent mode.',
    )
  }

  await next()
}

export const requireChildMode: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.get('sessionMode') !== 'child') {
    return apiError(c, 403, 'CHILD_MODE_REQUIRED', 'This feature is only available in Kids mode.')
  }

  await next()
}

export const requireChildAccess: MiddlewareHandler<AppEnv> = async (c, next) => {
  const childId = c.req.param('childId')
  if (!childId || !isUuid(childId)) return notFound(c)

  const user = c.get('user')
  const child = await prisma.child.findFirst({
    where: { id: childId, userId: user.id },
  })

  // 404 (bukan 403) supaya keberadaan data milik pengguna lain tidak bisa ditebak.
  if (!child) return notFound(c)

  c.set('child', child)
  await next()
}
