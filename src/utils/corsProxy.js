// corsProxy.js — HLS stream URL → Cloudflare Worker CORS proxy helper

// Vercel Environment Variable থেকে লিংকটি নেবে
const WORKER_BASE = (
  import.meta.env.VITE_WORKER_URL ||
  import.meta.env.VITE_PROXY_BASE_URL ||
  ''
).replace(/\/$/, '') // শেষের স্লাশ (/) থাকলে রিমুভ করে দেবে[cite: 5]

// Dev মোডে প্রক্সি স্কিপ করার অপশন[cite: 5]
export const SKIP_PROXY =
  import.meta.env.DEV && import.meta.env.VITE_SKIP_PROXY === 'true'

export function proxyUrl(originalUrl) {
  if (!originalUrl) return ''

  // Same-origin stream হলে প্রক্সির দরকার নেই[cite: 5]
  if (
    typeof window !== 'undefined' &&
    originalUrl.startsWith(window.location.origin)
  ) {
    return originalUrl
  }

  // Worker URL সেট না থাকলে কনসোলে ওয়ার্নিং দেবে এবং ডিরেক্ট লিংক পাঠাবে[cite: 5]
  if (!WORKER_BASE) {
    if (import.meta.env.DEV) {
      console.warn(
        '[StreamVex] VITE_WORKER_URL not set — stream loading directly.\n' +
        'Set VITE_WORKER_URL in .env.local to fix CORS issues.'
      )
    }
    return originalUrl
  }

  // প্রক্সির লিংক তৈরি করে রিটার্ন করবে[cite: 5]
  return `${WORKER_BASE}/?url=${encodeURIComponent(originalUrl)}`
}

export function isProxied(url) {
  if (!WORKER_BASE || !url) return false
  return url.startsWith(WORKER_BASE)[cite: 5]
}

export function resolveStreamUrl(url) {
  if (!url) return ''
  if (SKIP_PROXY) return url[cite: 5]
  if (isProxied(url)) return url[cite: 5]
  return proxyUrl(url)[cite: 5]
}