import { OpenAPIHono } from '@hono/zod-openapi'
import type { AppEnv } from '../types.js'
import { apiError } from './errors.js'

/**
 * Router OpenAPI dengan format error validasi yang konsisten.
 * Dipakai oleh semua modul route agar pesan error selalu berbentuk
 * { error: { code, message, field? } }.
 */
export function createRouter() {
  return new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        const issue = result.error.issues[0]
        const field = issue?.path.length ? issue.path.map(String).join('.') : undefined
        return apiError(
          c,
          400,
          'VALIDATION_ERROR',
          issue?.message ?? 'The submitted data is not valid.',
          field,
        )
      }
    },
  })
}
