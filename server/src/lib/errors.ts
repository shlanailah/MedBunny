import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export class ApiError extends Error {
  constructor(
    public readonly status: ContentfulStatusCode,
    public readonly code: string,
    message: string,
    public readonly field?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function apiError<S extends ContentfulStatusCode>(
  c: Context,
  status: S,
  code: string,
  message: string,
  field?: string,
  extra?: Record<string, unknown>,
) {
  return c.json(
    {
      error: {
        code,
        message,
        ...(field ? { field } : {}),
        ...(extra ?? {}),
      },
    },
    status,
  )
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

export function notFound(c: Context) {
  return apiError(c, 404, 'NOT_FOUND', 'Data tidak ditemukan.')
}
