import { serve } from '@hono/node-server'
import { env } from './env.js'
import app from './app.js'

export default app

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`[medbunny] API berjalan di http://localhost:${info.port}`)
    console.log(`[medbunny] Dokumentasi: http://localhost:${info.port}/api/docs`)
  },
)
