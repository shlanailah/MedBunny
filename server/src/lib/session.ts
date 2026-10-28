import type { Context } from 'hono'
import { deleteCookie, setCookie } from 'hono/cookie'
import { sign } from 'hono/jwt'
import { env } from '../env.js'

export const SESSION_COOKIE = 'medbunny_session'
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'Lax' as const,
  path: '/',
}

export async function setSessionCookie(c: Context, userId: string) {
  const token = await sign(
    {
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    },
    env.JWT_SECRET,
    'HS256',
  )

  setCookie(c, SESSION_COOKIE, token, {
    ...cookieOptions,
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE, cookieOptions)
}
