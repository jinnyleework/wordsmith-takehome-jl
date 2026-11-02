import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Free-text chat goes to a local Cursor agent. The scripted cards do not.
function cursorAsk(): Plugin {
  return {
    name: 'cursor-ask',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req as { url?: string }).url?.split('?')[0]
        if (path !== '/api/ask' && path !== '/api/ask/reset') return next()
        const root = server.config.root.endsWith('/') ? server.config.root : `${server.config.root}/`
        // Query keeps Node from serving a stale copy of server/ask.mjs after edits.
        const specifier = 'node:fs'
        void import(specifier)
          .then((fs: { statSync: (path: string) => { mtimeMs: number } }) => {
            const version = fs.statSync(`${root}server/ask.mjs`).mtimeMs
            return import(`file://${root}server/ask.mjs?v=${version}`)
          })
          .then((mod) => mod.handle(req, res))
          .catch((err: unknown) => {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ message: err instanceof Error ? err.message : 'Cursor request failed' }))
          })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cursorAsk()],
})
