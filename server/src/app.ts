import { swaggerUI } from '@hono/swagger-ui'
import { createRoute, z } from '@hono/zod-openapi'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { apiError, ApiError } from './lib/errors.js'
import { createRouter } from './lib/openapi.js'
import { authRoutes } from './routes/auth.js'
import { doseRoutes } from './routes/doses.js'
import { medicationRoutes } from './routes/medications.js'
import { starRoutes } from './routes/stars.js'

const app = createRouter()

app.use('*', logger())

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['Health'],
  summary: 'Cek status server',
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } },
      description: 'Server berjalan.',
    },
  },
})

app.openapi(healthRoute, (c) => c.json({ ok: true }, 200))

app.route('/api', authRoutes)
app.route('/api', medicationRoutes)
app.route('/api', doseRoutes)
app.route('/api', starRoutes)

app.doc('/api/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'MedBunny API',
    version: '1.0.0',
    description:
      'API Tahap 1 MedBunny: autentikasi, jadwal obat, dosis, dan bintang. Foto dokumentasi tidak pernah dikirim ke server.',
  },
})

app.get('/api/docs', swaggerUI({ url: '/api/openapi.json', title: 'MedBunny API' }))

app.notFound((c) => apiError(c, 404, 'NOT_FOUND', 'Endpoint tidak ditemukan.'))

app.onError((error, c) => {
  if (error instanceof ApiError) {
    return apiError(c, error.status, error.code, error.message, error.field)
  }

  if (error instanceof HTTPException) {
    return apiError(
      c,
      error.status,
      error.status === 401 ? 'UNAUTHENTICATED' : 'HTTP_ERROR',
      error.message,
    )
  }

  console.error('[medbunny] Unhandled error:', error)
  return apiError(c, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan pada server.')
})

export default app
