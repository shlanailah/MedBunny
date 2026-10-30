// Detektor entrypoint Vercel Hono memerlukan import langsung dari paket "hono".
import type { Hono } from 'hono'
import { swaggerUI } from '@hono/swagger-ui'
import { createRoute, z } from '@hono/zod-openapi'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { apiError, ApiError } from './lib/errors.js'
import { createRouter } from './lib/openapi.js'
import { accountRoutes } from './routes/account.js'
import { authRoutes } from './routes/auth.js'
import { childRoutes } from './routes/children.js'
import { doseRoutes } from './routes/doses.js'
import { kidsRoutes } from './routes/kids.js'
import { medicationRoutes } from './routes/medications.js'
import { sessionRoutes } from './routes/session.js'
import { starRoutes } from './routes/stars.js'

const app = createRouter()

app.use('*', logger())

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['Health'],
  summary: 'Check server status',
  responses: {
    200: {
      content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } },
      description: 'Server is running.',
    },
  },
})

app.openapi(healthRoute, (c) => c.json({ ok: true }, 200))

app.route('/api', authRoutes)
app.route('/api', sessionRoutes)
app.route('/api', childRoutes)
app.route('/api', accountRoutes)
app.route('/api', medicationRoutes)
app.route('/api', doseRoutes)
app.route('/api', starRoutes)
app.route('/api', kidsRoutes)

app.doc('/api/openapi.json', {
  openapi: '3.0.0',
  info: {
    title: 'MedBunny API',
    version: '1.0.0',
    description:
      'MedBunny API: authentication, medication schedules, doses, stars, PIN, and Kids mode. Documentation photos are never sent to the server.',
  },
})

app.get('/api/docs', swaggerUI({ url: '/api/openapi.json', title: 'MedBunny API' }))

app.notFound((c) => apiError(c, 404, 'NOT_FOUND', 'Endpoint not found.'))

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
  return apiError(c, 500, 'INTERNAL_ERROR', 'Something went wrong on the server.')
})

export default app
