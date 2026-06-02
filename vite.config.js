import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Bloque test (vitest lo consume, Vite lo ignora en build/dev)
  const test = {
    environment: 'node',
    include: ['src/__tests__/**/*.test.js'],
  };
  const env = loadEnv(mode, process.cwd(), '')
  const ooTarget = env.VITE_ONLYOFFICE_URL || 'http://localhost'

  return {
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 1500,
    },
    test,
    server: {
      proxy: {
        '/oo-proxy': {
          target: ooTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
          rewrite: (path) => path.replace(/^\/oo-proxy/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('ngrok-skip-browser-warning', '1')
            })
            proxy.on('proxyReqWs', (proxyReq) => {
              proxyReq.setHeader('ngrok-skip-browser-warning', '1')
            })
          },
        },
      },
    },
  }
})
