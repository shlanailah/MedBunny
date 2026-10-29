import { serve } from '@hono/node-server'
import { env } from './env.js'
import app from './app.js'

export default app

// Vercel menjalankan app lewat default export; listener hanya untuk lokal.
if (!process.env.VERCEL) {
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
}
