import { defineConfig } from 'vite'
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

export default defineConfig({
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
    allowedHosts: ['dell5070l', 'dyserver2', '192.168.0.172', '192.168.0.181',"https://dataplus.live","dataplus.live"],
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  },
})
