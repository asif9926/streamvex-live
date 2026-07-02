// corsProxy.js — HLS stream URL → Cloudflare Worker CORS proxy helper
// Blueprint: src/utils/corsProxy.js
// Used by: VideoPlayer.jsx, useHLS.js
//
// কিভাবে কাজ করে:
//   Third-party .m3u8 URL → Worker এ পাঠানো হয় → Worker CORS header দিয়ে stream serve করে
//   Worker route: GET https://your-worker.workers.dev/?url=<encoded_stream_url>
//
// Setup:
//   .env.local:  VITE_WORKER_URL=https://your-worker.workers.dev
//   Vercel:      VITE_WORKER_URL environment variable set করো

// ── Worker base URL ───────────────────────────────────
// Blueprint supports দুটো env var নাম — দুটোই check করো
const WORKER_BASE = (
  import.meta.env.VITE_WORKER_URL ||
  import.meta.env.VITE_PROXY_BASE_URL ||
  ''
).replace(/\/$/, '')   // trailing slash remove

// ── Dev only: proxy skip করতে VITE_SKIP_PROXY=true ──
export const SKIP_PROXY =
  import.meta.env.DEV && import.meta.env.VITE_SKIP_PROXY === 'true'

/**
 * proxyUrl — stream URL কে Worker proxy দিয়ে wrap করো
 *
 * @param {string} originalUrl — raw .m3u8 stream URL
 * @returns {string}           — proxied URL (or original if no worker set)
 *
 * @example
 * const url = proxyUrl('https://cdn.example.com/live/stream.m3u8')
 * // → 'https://your-worker.workers.dev/?url=https%3A%2F%2Fcdn.example.com%2F...'
 */
export function proxyUrl(originalUrl, options = {}) {
  if (!originalUrl) return ''

  // Same-origin stream — proxy দরকার নেই
  if (
    typeof window !== 'undefined' &&
    originalUrl.startsWith(window.location.origin)
  ) {
    return originalUrl
  }

  // Worker URL set না থাকলে → direct URL (CORS fail হতে পারে)
  if (!WORKER_BASE) {
    if (import.meta.env.DEV) {
      console.warn(
        '[StreamVex] VITE_WORKER_URL not set — stream loading directly.\n' +
        'Set VITE_WORKER_URL in .env.local to fix CORS issues.'
      )
    }
    return originalUrl
  }

  // ✅ [Fix] noReferer — কিছু origin (session/token-based CDN, e.g. Nimble
  // Streamer) স্পুফ করা Referer/Origin header দেখলেই 403 দেয়, যেহেতু সরাসরি
  // ব্রাউজারে খুললে কোনো Referer পাঠানো হয় না। channels.json-এ per-channel
  // "skipReferer": true দিলে এই mode চালু হয়।
  const suffix = options.noReferer ? '&noref=1' : ''
  return `${WORKER_BASE}/?url=${encodeURIComponent(originalUrl)}${suffix}`
}

/**
 * isProxied — URL টা already proxy দিয়ে wrap করা কিনা check করো
 * (double-proxying এড়ানোর জন্য)
 */
export function isProxied(url) {
  if (!WORKER_BASE || !url) return false
  return url.startsWith(WORKER_BASE)
}

/**
 * resolveStreamUrl — VideoPlayer এ use করার জন্য main helper
 * SKIP_PROXY + isProxied + proxyUrl সব handle করে
 */
export function resolveStreamUrl(url, options = {}) {
  if (!url) return ''
  if (SKIP_PROXY) return url
  if (isProxied(url)) return url
  return proxyUrl(url, options)
}
