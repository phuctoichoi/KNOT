import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'offline.html'],
      manifest: false, // using public/manifest.json
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/v1\/(reports|alerts|map|support).*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxAgeSeconds: 300 },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles-cache',
              expiration: { maxEntries: 1000, maxAgeSeconds: 86400 },
            },
          },
          {
            urlPattern: /\.(js|css|woff2|png|svg|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: { maxAgeSeconds: 2592000 },
            },
          },
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/\/api\//, /\/ws\//],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      },
    },
  },
  build: {
    // Skip type checking during build for Docker compatibility
    rollupOptions: {
      onwarn(warning, warn) {
        // Skip certain warnings that are causing issues in Docker
        if (warning.code === 'UNRESOLVED_IMPORT') return;
        warn(warning);
      }
    }
  }
})
