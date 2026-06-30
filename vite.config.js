// vite.config.js
// StreamVex Live — Vite 6 Configuration
//
// Features:
//   - React plugin (Fast Refresh)
//   - PWA (vite-plugin-pwa) — offline support, installable
//   - Build optimization — manual code splitting for vendor chunks
//   - Path alias @ → src/
//   - Env variable passthrough (VITE_WORKER_URL, VITE_SKIP_PROXY)
//   - Dev server proxy → /api → localhost (Vercel dev local testing)

import { defineConfig }    from 'vite'
import react               from '@vitejs/plugin-react'
import { VitePWA }         from 'vite-plugin-pwa'
import path                from 'path'
import { fileURLToPath }   from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─────────────────────────────────────────────────────
// PWA Manifest — Blueprint + production requirements
// ─────────────────────────────────────────────────────
const pwaManifest = {
  name:             'StreamVex Live',
  short_name:       'StreamVex',
  description:      'Watch live sports streaming — cricket, football, and Bangladesh TV channels.',
  start_url:        '/',
  display:          'standalone',         // app-like — no browser chrome
  background_color: '#0A0A0F',            // brand-bg
  theme_color:      '#E50914',            // brand-red — matches address bar on Android
  orientation:      'portrait-primary',
  lang:             'en',
  dir:              'ltr',
  scope:            '/',
  icons: [
    {
      src:     '/icons/pwa-192x192.png',
      sizes:   '192x192',
      type:    'image/png',
      purpose: 'any',
    },
    {
      src:     '/icons/pwa-512x512.png',
      sizes:   '512x512',
      type:    'image/png',
      purpose: 'any',
    },
    {
      src:     '/icons/pwa-512x512-maskable.png',
      sizes:   '512x512',
      type:    'image/png',
      purpose: 'maskable',               // Android adaptive icon
    },
  ],
  categories:   ['sports', 'entertainment'],
  // Shortcuts — long-press app icon on Android
  shortcuts: [
    {
      name:       'Live Scores',
      short_name: 'Scores',
      url:        '/live-score',
      description:'Real-time cricket & football scores',
      icons: [{ src: '/icons/shortcut-scores.png', sizes: '96x96' }],
    },
    {
      name:       'Sports Channels',
      short_name: 'Sports',
      url:        '/sports',
      description:'Browse all sports channels',
      icons: [{ src: '/icons/shortcut-sports.png', sizes: '96x96' }],
    },
  ],
}

// ─────────────────────────────────────────────────────
// Workbox cache strategies
// Live stream proxied URLs → NetworkOnly (never cache streams)
// API responses → NetworkFirst with short cache
// Static assets → CacheFirst (long cache)
// ─────────────────────────────────────────────────────
const workboxConfig = {
  // Never cache actual HLS streams — they're live
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/^\/api\//, /^\/cors-proxy\//],

  runtimeCaching: [
    // ── HLS streams — NetworkOnly, never cache ────────
    {
      urlPattern:  /\.m3u8$|\.ts$|workers\.dev/,
      handler:     'NetworkOnly',
    },

    // ── Vercel API routes — NetworkFirst, 60s cache ───
    {
      urlPattern: /^\/api\//,
      handler:    'NetworkFirst',
      options: {
        cacheName:          'api-cache',
        networkTimeoutSeconds: 8,
        expiration: {
          maxEntries:     30,
          maxAgeSeconds:  60,       // 1 minute — live data
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },

    // ── Google Fonts — CacheFirst, 1 year ────────────
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
      handler:    'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries:    20,
          maxAgeSeconds: 365 * 24 * 60 * 60,   // 1 year
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    // ── Channel logos (external images) — StaleWhileRevalidate ──
    {
      urlPattern:  /^https:\/\/upload\.wikimedia\.org\//,
      handler:     'StaleWhileRevalidate',
      options: {
        cacheName: 'channel-logos',
        expiration: {
          maxEntries:    100,
          maxAgeSeconds: 7 * 24 * 60 * 60,     // 7 days
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
}

// ─────────────────────────────────────────────────────
export default defineConfig({
  // ── Plugins ──────────────────────────────────────────
  plugins: [
    // React Fast Refresh
    react(),

    // PWA — service worker + manifest
    VitePWA({
      registerType:  'autoUpdate',       // new SW auto-activates
      injectRegister:'auto',
      includeAssets: [
        'favicon.ico',
        'logo.png',
        'og-default.png',
        'icons/*.png',
        'robots.txt',
      ],
      manifest:     pwaManifest,
      workbox:      workboxConfig,
      // Dev mode — SW active in dev for testing
      devOptions: {
        enabled: false,   // true করলে dev-এ SW চলবে (debugging এর জন্য)
        type:    'module',
      },
    }),
  ],

  // ── Path aliases ──────────────────────────────────────
  // @ → src/  (e.g. import Button from '@/components/ui/Button')
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // ── Dev server ────────────────────────────────────────
  server: {
    port: 5173,
    // Proxy /api → Vercel dev server (vercel dev চালাতে হবে)
    // Local development এ API test করতে:
    //   Terminal 1: vercel dev (port 3000)
    //   Terminal 2: npm run dev (port 5173, proxies /api to :3000)
    proxy: {
      '/api': {
        target:      'http://localhost:3000',
        changeOrigin: true,
        secure:       false,
      },
    },
  },

  // ── Build optimization ────────────────────────────────
  build: {
    // Target modern browsers — Vite default is fine
    target:    'esnext',
    // Source maps in production — helpful for debugging (disable if bundle size matters)
    sourcemap:  false,
    // Chunk size warning threshold (KB)
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        // Manual chunk splitting — function form, checked in priority order.
        // (Object form previously left "vendor-react" empty: react-router-dom
        // imports react-dom internally, so Rollup pulled React into whichever
        // chunk resolved it first instead of the intended vendor-react chunk.)
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) {
            return 'vendor-react'
          }
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('hls.js')) return 'vendor-hls'
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('zustand') || id.includes('swr')) return 'vendor-state'
        },
        // Asset file naming
        chunkFileNames:  'assets/js/[name]-[hash].js',
        entryFileNames:  'assets/js/[name]-[hash].js',
        assetFileNames:  'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },

  // ── Preview server ────────────────────────────────────
  preview: {
    port: 4173,
  },
})
