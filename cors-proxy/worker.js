/**
 * cors-proxy/worker.js — Cloudflare Worker (Fully Unlocked)
 */

const ALLOWED_EXTENSIONS = ['.m3u8', '.ts', '.m3u', '.key']

const PRIVATE_IP_PATTERNS = [
  /^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, 
  /^169\.254\./, /^::1$/, /^fc00:/i, /^fe80:/i, /^0\./, 
  /^localhost$/i, /^internal\./i, /\.local$/i, /\.internal$/i,
]

const MAX_RESPONSE_BYTES = 10 * 1024 * 1024

function isAllowedUrl(targetUrl, env) {
  let parsed
  try {
    parsed = new URL(targetUrl)
  } catch {
    return { ok: false, reason: 'Invalid URL format' }
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, reason: 'Only http/https protocols allowed' }
  }

  const path = parsed.pathname.toLowerCase()
  const hasAllowedExt = ALLOWED_EXTENSIONS.some(ext => path.includes(ext))
  if (!hasAllowedExt) {
    return { ok: false, reason: `Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed` }
  }

  const hostname = parsed.hostname
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { ok: false, reason: 'Private/loopback addresses not allowed' }
    }
  }

  // 100% আনলকড: যেকোনো ডোমেইন এবং আইপি এলাউ করা হলো
  return { ok: true, parsed } 
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':      '*',
    'Access-Control-Allow-Methods':     'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers':     'Range, Accept, Origin',
    'Access-Control-Expose-Headers':    'Content-Length, Content-Range, Content-Type',
    'Access-Control-Max-Age':           '86400',
  }
}

function rewriteManifest(manifestText, targetUrl, workerOrigin) {
  let baseUrl
  try {
    baseUrl = new URL(targetUrl)
  } catch {
    return manifestText 
  }

  const toProxied = (rawUri) => {
    let absolute
    try {
      absolute = new URL(rawUri, baseUrl).href
    } catch {
      return rawUri 
    }
    return `${workerOrigin}/?url=${encodeURIComponent(absolute)}`
  }

  const lines = manifestText.split(/\r?\n/)
  const rewritten = lines.map((line) => {
    const trimmed = line.trim()
    if (!trimmed) return line
    if (trimmed.startsWith('#')) {
      const uriMatch = trimmed.match(/URI="([^"]+)"/)
      if (!uriMatch) return line
      return line.replace(uriMatch[1], toProxied(uriMatch[1]))
    }
    return toProxied(trimmed)
  })
  return rewritten.join('\n')
}

function errorResponse(message, status, extraHeaders = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
      ...extraHeaders,
    },
  })
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const method = request.method.toUpperCase()

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() })
    }

    if (method !== 'GET' && method !== 'HEAD') {
      return errorResponse('Method not allowed', 405)
    }

    const targetUrl = url.searchParams.get('url')
    if (!targetUrl) return errorResponse('Missing required ?url= parameter', 400)

    let decodedUrl = targetUrl
    try {
      const once = decodeURIComponent(targetUrl)
      new URL(once)
      decodedUrl = once
    } catch {
      decodedUrl = targetUrl
    }

    const check = isAllowedUrl(decodedUrl, env)
    if (!check.ok) return errorResponse(check.reason, 403)

    const { parsed: parsedTarget } = check

    try {
      const upstreamHeaders = {
        'User-Agent': 'Mozilla/5.0 (compatible; StreamVexProxy/1.0)',
        'Accept': '*/*',
        'Origin': parsedTarget.origin,
        'Referer': parsedTarget.origin + '/',
      }

      const rangeHeader = request.headers.get('Range')
      if (rangeHeader) upstreamHeaders['Range'] = rangeHeader

      const upstreamResponse = await fetch(decodedUrl, {
        method: method,
        headers: upstreamHeaders,
        cf: {
          cacheTtl: parsedTarget.pathname.endsWith('.m3u8') ? 5 : 0,
          cacheEverything: parsedTarget.pathname.endsWith('.m3u8'),
        },
      })

      if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
        return errorResponse(`Upstream returned ${upstreamResponse.status}`, upstreamResponse.status >= 500 ? 502 : upstreamResponse.status)
      }

      const contentLength = upstreamResponse.headers.get('Content-Length')
      if (contentLength && Number(contentLength) > MAX_RESPONSE_BYTES) {
        return errorResponse('Response too large', 413)
      }

      const responseHeaders = new Headers()
      const PASSTHROUGH_HEADERS = ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges', 'Last-Modified', 'ETag']
      for (const h of PASSTHROUGH_HEADERS) {
        const val = upstreamResponse.headers.get(h)
        if (val) responseHeaders.set(h, val)
      }

      if (!responseHeaders.get('Content-Type')) {
        if (parsedTarget.pathname.endsWith('.m3u8') || parsedTarget.pathname.endsWith('.m3u')) {
          responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl')
        } else if (parsedTarget.pathname.endsWith('.ts')) {
          responseHeaders.set('Content-Type', 'video/MP2T')
        }
      }

      for (const [k, v] of Object.entries(corsHeaders())) {
        responseHeaders.set(k, v)
      }

      const isManifest = parsedTarget.pathname.endsWith('.m3u8') || parsedTarget.pathname.endsWith('.m3u')
      if (isManifest) {
        responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      } else if (parsedTarget.pathname.endsWith('.ts')) {
        responseHeaders.set('Cache-Control', 'public, max-age=3600, immutable')
      }

      if (isManifest && method === 'GET') {
        const manifestText = await upstreamResponse.text()
        const rewritten = rewriteManifest(manifestText, decodedUrl, url.origin)
        responseHeaders.delete('Content-Length')
        return new Response(rewritten, { status: upstreamResponse.status, headers: responseHeaders })
      }

      return new Response(upstreamResponse.body, { status: upstreamResponse.status, headers: responseHeaders })

    } catch (err) {
      if (err.message?.includes('timeout') || err.name === 'TimeoutError') {
        return errorResponse('Upstream stream timed out', 504)
      }
      return errorResponse('Failed to fetch stream', 502)
    }
  },
}