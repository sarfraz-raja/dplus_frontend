import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { compression } from 'vite-plugin-compression2'

function devNoCachePlugin() {
  return {
    name: 'dy3-dev-no-304',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.headers['if-none-match']) delete req.headers['if-none-match']
        if (req.headers['if-modified-since']) delete req.headers['if-modified-since']
        next()
      })
    },
  }
}

// ALLOWED_HOSTS in .env — accepts ['a', "b"] or a,b. Not VITE_-prefixed, so it never reaches client code.
function parseHostList(value) {
  if (!value) return undefined
  const hosts = value
    .replace(/^\s*\[|\]\s*$/g, '')
    .split(',')
    .map((h) => h.trim().replace(/^['"]|['"]$/g, '').trim())
    .filter(Boolean)
  return hosts.length ? hosts : undefined
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  plugins: [
    react(),
    devNoCachePlugin(),
    compression({ algorithm: 'gzip', threshold: 1024 }),
    compression({ algorithm: 'brotliCompress', threshold: 1024 }),
  ],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom', 'react-redux', '@reduxjs/toolkit'],
          'vendor-maplibre': ['maplibre-gl'],
          'vendor-deckgl': ['@deck.gl/core', '@deck.gl/layers', '@deck.gl/react', '@deck.gl/extensions', '@deck.gl/widgets'],
          'vendor-leaflet': ['leaflet', 'react-leaflet'],
          'vendor-ol': ['ol'],
          'vendor-charts': ['recharts'],
          'vendor-icons': ['lucide-react'],
          'vendor-ui': ['sweetalert2', 'react-sweetalert2', 'react-datepicker', 'react-hook-form', 'react-querybuilder'],
        },
      },
    },
  },
  server: {         
    port: 5173,
    strictPort: true,
    // allowedHosts: ['dell5070l', 'dyserver2', 'dyserver', '192.168.0.172', '192.168.0.181',"https://dataplus.live","dataplus.live"],
    allowedHosts: parseHostList(env.ALLOWED_HOSTS),
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  },
  }
})
