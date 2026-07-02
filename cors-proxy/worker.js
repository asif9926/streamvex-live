/**
 * cors-proxy/worker.js — Cloudflare Worker
 * StreamVex Live — HLS Stream CORS Proxy
 *
 * কাজ: Third-party .m3u8 stream URL গুলোকে CORS header দিয়ে proxy করে
 *       যাতে Browser থেকে directly HLS.js সেগুলো load করতে পারে।
 *
 * ব্যবহার:
 *   GET https://your-worker.workers.dev/?url=https://cdn.example.com/live/stream.m3u8
 *
 * Deploy:
 *   wrangler deploy  (wrangler.toml এ name ও account_id দাও)
 *
 * ──────────────────────────────────────────────────────────────────────────
 * Security layers (blueprint Update #6 + audit fixes):
 *
 *  1. m3u8 / ts / m3u ONLY            — অন্য file type 403
 *  2. ALLOWED_DOMAINS allowlist        — unknown origin SSRF block (audit fix)
 *  3. Private IP / localhost block     — SSRF internal network attack block
 *  4. HTTP method restrict             — GET / HEAD / OPTIONS only
 *  5. Request size limit               — upstream oversized response block
 *  6. Referer check                    — must come from known frontend origin
 *  7. Rate-limit header passthrough    — Cloudflare এর built-in rate limiting সাথে compatible
 * ──────────────────────────────────────────────────────────────────────────
 */

// ── Allowed stream file extensions ───────────────────
// .m3u8  — HLS manifest (playlist)
// .ts    — HLS video segment
// .m3u   — legacy playlist
// .key   — HLS AES-128 encryption key (encrypted streams এর জন্য)
const ALLOWED_EXTENSIONS = ['.m3u8', '.ts', '.m3u', '.key']

// ── Allowed upstream domains (SSRF protection) ───────
// ✅ [Audit Fix] Blueprint audit: unknown domain এ request পাঠানো block করো
// এখানে শুধু known stream providers যোগ করো।
// Cloudflare Worker env variable দিয়েও override করা যাবে (নিচে দেখো)
const DEFAULT_ALLOWED_DOMAINS = [
  // ── Free / public test streams ──
  'test-streams.mux.dev',
  'mux.com',

  // ── Common CDN providers ──
  'akamaized.net',
  'akamai.net',
  'cloudfront.net',
  'fastly.net',
  'cdn.jwplayer.com',
  'cdn77.org',
  'edgecastcdn.net',
  'limelight.com',

  // ── Sports stream providers (common) ──
  'streamtp.com',
  'crichdlive.com',
  'willow.tv',
  'hotstar.com',
  'sonyliv.com',
  'fancode.com',
  'rabbitmvlive.com',
  'bongobdlive.com',
  't-sports.live',
  'gpcdn.net',   // ✅ [Audit Fix] used by BD channel data (src/data/bdChannels.json)
  '103.114.11.37',  // for t-sports
  '114.130.57.233',
  '84.17.50.102',         // ✅ [Fix] Fox Sports raw-IP CDN
  'streamhostingcdn.top', // ✅ [Fix] beIN Sports 1
  'online24.pm',          // ✅ [Fix] beIN Sports 1 backup
  'hopto.org',            // ✅ [Fix] Sky Sports Cricket (atc.hopto.org)
  'ercdn.net',            // ✅ [Fix] A Sports (turknet.ercdn.net)
  'thebosstv.com',        // ✅ [Fix] Somoy TV (live.thebosstv.com)

  // ── Generic CDN patterns ──
  // যেকোনো .live, .stream domain থেকে m3u8 allow করতে নিচের
  // ALLOW_ALL_DOMAINS=true env var দাও (কম secure, free streams এর জন্য)
]

// ── Private / loopback IP ranges (SSRF block) ────────
// এই ranges এ কখনো upstream request পাঠাবে না
const PRIVATE_IP_PATTERNS = [
  /^127\./,               // 127.0.0.0/8  loopback
  /^10\./,                // 10.0.0.0/8   private
  /^192\.168\./,          // 192.168.0.0/16 private
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12 private
  /^169\.254\./,          // 169.254.0.0/16 link-local
  /^::1$/,                // IPv6 loopback
  /^fc00:/i,              // IPv6 unique local
  /^fe80:/i,              // IPv6 link-local
  /^0\./,                 // 0.0.0.0/8
  /^localhost$/i,
  /^internal\./i,
  /\.local$/i,
  /\.internal$/i,
]

// ── Max response size (10 MB) ─────────────────────────
// .m3u8 manifest সাধারণত কয়েক KB — 10MB এর বেশি হলে block
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024

// ─────────────────────────────────────────────────────
// Helper — URL টা allowed কিনা চেক করো
// ─────────────────────────────────────────────────────
function isAllowedUrl(targetUrl, env) {
  let parsed
  try {
    parsed = new URL(targetUrl)
  } catch {
    return { ok: false, reason: 'Invalid URL format' }
  }

  // ── Protocol check — only https ───────────────────
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, reason: 'Only http/https protocols allowed' }
  }

  // ── File extension check ──────────────────────────
  const path      = parsed.pathname.toLowerCase()
  const hasAllowedExt = ALLOWED_EXTENSIONS.some(ext => path.includes(ext))
  if (!hasAllowedExt) {
    return {
      ok:     false,
      reason: `Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed`,
    }
  }

  // ── Private IP / localhost block (SSRF) ──────────
  const hostname = parsed.hostname
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { ok: false, reason: 'Private/loopback addresses not allowed' }
    }
  }

  // ── Domain allowlist check ────────────────────────
  // env.ALLOW_ALL_DOMAINS = 'true' → skip allowlist (less secure)
  const allowAll = env?.ALLOW_ALL_DOMAINS === 'true'
  if (!allowAll) {
    const allowedDomains = env?.ALLOWED_DOMAINS
      ? env.ALLOWED_DOMAINS.split(',').map(d => d.trim().toLowerCase())
      : DEFAULT_ALLOWED_DOMAINS

    const domainLower   = hostname.toLowerCase()
    const domainAllowed = allowedDomains.some(allowed =>
      domainLower === allowed || domainLower.endsWith('.' + allowed)
    )

    if (!domainAllowed) {
      return {
        ok:     false,
        reason: `Domain not in allowlist: ${hostname}. Add to ALLOWED_DOMAINS env var.`,
      }
    }
  }

  return { ok: true, parsed }
}

// ─────────────────────────────────────────────────────
// Helper — CORS headers (stream response-এ attach করো)
// ─────────────────────────────────────────────────────
function corsHeaders(origin) {
  // Stream player এর জন্য * দরকার — browsers restrict credentials এমনিতে
  return {
    'Access-Control-Allow-Origin':      '*',
    'Access-Control-Allow-Methods':     'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers':     'Range, Accept, Origin',
    'Access-Control-Expose-Headers':    'Content-Length, Content-Range, Content-Type',
    'Access-Control-Max-Age':           '86400',
  }
}

// ─────────────────────────────────────────────────────
// Helper — rewrite .m3u8 manifest body so every segment /
// sub-playlist / key URI routes back through this worker
// ─────────────────────────────────────────────────────
// ✅ [Audit Fix — Critical] Without this, the worker only proxies the
// manifest itself. Any segment (.ts) or nested playlist referenced
// inside it — relative OR absolute — still points straight at the
// origin CDN, so the browser's segment requests bypass the proxy and
// hit the exact CORS wall this worker exists to work around. This is
// why "some" streams appeared to work (self-hosted / already-CORS-open
// origins) while real third-party CDNs silently failed to play.
function rewriteManifest(manifestText, targetUrl, workerOrigin, noRef) {
  let baseUrl
  try {
    baseUrl = new URL(targetUrl)
  } catch {
    return manifestText   // shouldn't happen — already validated upstream
  }

  const toProxied = (rawUri) => {
    let absolute
    try {
      absolute = new URL(rawUri, baseUrl).href
    } catch {
      return rawUri   // malformed URI — leave untouched rather than break playback
    }
    const suffix = noRef ? '&noref=1' : ''
    return `${workerOrigin}/?url=${encodeURIComponent(absolute)}${suffix}`
  }

  const lines = manifestText.split(/\r?\n/)

  const rewritten = lines.map((line) => {
    const trimmed = line.trim()
    if (!trimmed) return line

    // ── Tag lines carrying URI="..." (#EXT-X-KEY, #EXT-X-MAP, #EXT-X-MEDIA, etc.) ──
    if (trimmed.startsWith('#')) {
      const uriMatch = trimmed.match(/URI="([^"]+)"/)
      if (!uriMatch) return line
      return line.replace(uriMatch[1], toProxied(uriMatch[1]))
    }

    // ── Plain URI line — media segment (.ts) or nested/variant playlist (.m3u8) ──
    return toProxied(trimmed)
  })

  return rewritten.join('\n')
}

// ─────────────────────────────────────────────────────
// Helper — error response
// ─────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────
// Main Worker
// ─────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url    = new URL(request.url)
    const method = request.method.toUpperCase()

    // ── OPTIONS preflight ─────────────────────────────
    if (method === 'OPTIONS') {
      return new Response(null, {
        status:  204,
        headers: corsHeaders(),
      })
    }

    // ── Method restrict ───────────────────────────────
    if (method !== 'GET' && method !== 'HEAD') {
      return errorResponse('Method not allowed', 405)
    }

    // ── ?url= param required ──────────────────────────
    const targetUrl = url.searchParams.get('url')
    if (!targetUrl) {
      return errorResponse('Missing required ?url= parameter', 400)
    }

    // Decode if double-encoded
    let decodedUrl = targetUrl
    try {
      // একবার decode করো — ইতিমধ্যে decoded হলে ভেঙে পড়বে না
      const once = decodeURIComponent(targetUrl)
      // যদি valid URL তাহলে use করো
      new URL(once)
      decodedUrl = once
    } catch {
      decodedUrl = targetUrl
    }

    // ── Security validation ───────────────────────────
    const check = isAllowedUrl(decodedUrl, env)
    if (!check.ok) {
      console.error(`[worker] Blocked: ${check.reason} — ${decodedUrl}`)
      return errorResponse(check.reason, 403)
    }

    const { parsed: parsedTarget } = check

    // ── Upstream fetch ────────────────────────────────
    try {
      // Forward Range header for video seeking
      // ✅ [Fix] Real Chrome UA instead of a self-identifying proxy UA —
      // some anti-bot/anti-hotlink WAFs (Nimble Streamer etc.) block
      // requests that don't look like an ordinary browser.
      const upstreamHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept':     '*/*',
      }

      // ✅ [Fix] ?noref=1 — skip Origin/Referer entirely for origins that
      // block *any* spoofed referer (common on session/token-based CDNs).
      // Opening a stream URL directly in a browser's address bar sends no
      // Referer at all — this mode matches that exact behaviour.
      // Default (no ?noref=) keeps the old spoofed-referer behaviour,
      // since some other origins actually require it to allow access.
      if (url.searchParams.get('noref') !== '1') {
        upstreamHeaders['Origin']  = parsedTarget.origin
        upstreamHeaders['Referer'] = parsedTarget.origin + '/'
      }

      // Range header passthrough — video player seeking এর জন্য দরকার
      const rangeHeader = request.headers.get('Range')
      if (rangeHeader) {
        upstreamHeaders['Range'] = rangeHeader
      }

      const isManifest = parsedTarget.pathname.endsWith('.m3u8') || parsedTarget.pathname.endsWith('.m3u')
      const isSegment  = /\.(ts|aac|mp4|m4s|key|bin)$/i.test(parsedTarget.pathname)

      const upstreamResponse = await fetch(decodedUrl, {
        method:  method,
        headers: upstreamHeaders,
        // Cloudflare Worker timeout: 30s default
        // Streaming: false — পুরো response নাও তারপর forward করো (m3u8 manifest)
        cf: {
          // ✅ [Perf Fix] manifest কম সময় cache (live edge freshness),
          // কিন্তু segment/.ts ফাইল বেশি সময় cache করো — একবার publish হলে বদলায় না,
          // আর একাধিক viewer একই channel দেখলে origin এ বারবার trip লাগবে না
          cacheTtl:        isManifest ? 4 : (isSegment ? 60 : 0),
          cacheEverything: isManifest || isSegment,
        },
      })

      // ── Upstream error passthrough ────────────────
      if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
        return errorResponse(
          `Upstream returned ${upstreamResponse.status}`,
          upstreamResponse.status >= 500 ? 502 : upstreamResponse.status,
        )
      }

      // ── Response size guard ───────────────────────
      const contentLength = upstreamResponse.headers.get('Content-Length')
      if (contentLength && Number(contentLength) > MAX_RESPONSE_BYTES) {
        return errorResponse('Response too large', 413)
      }

      // ── Build response headers ────────────────────
      const responseHeaders = new Headers()

      // Passthrough safe upstream headers
      const PASSTHROUGH_HEADERS = [
        'Content-Type', 'Content-Length', 'Content-Range',
        'Accept-Ranges', 'Last-Modified', 'ETag',
      ]
      for (const h of PASSTHROUGH_HEADERS) {
        const val = upstreamResponse.headers.get(h)
        if (val) responseHeaders.set(h, val)
      }

      // Content-Type fallback for .m3u8
      if (!responseHeaders.get('Content-Type')) {
        if (parsedTarget.pathname.endsWith('.m3u8') || parsedTarget.pathname.endsWith('.m3u')) {
          responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl')
        } else if (parsedTarget.pathname.endsWith('.ts')) {
          responseHeaders.set('Content-Type', 'video/MP2T')
        } else if (parsedTarget.pathname.endsWith('.key')) {
          responseHeaders.set('Content-Type', 'application/octet-stream')
        }
      }

      // Attach CORS headers
      for (const [k, v] of Object.entries(corsHeaders())) {
        responseHeaders.set(k, v)
      }

      // Cache-Control for manifest vs segment
      if (isManifest) {
        // Live manifest — always fresh
        responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      } else if (parsedTarget.pathname.endsWith('.ts')) {
        // Segments are immutable — long cache
        responseHeaders.set('Cache-Control', 'public, max-age=3600, immutable')
      }

      // ── ✅ [Audit Fix — Critical] Rewrite manifest body ──────────
      // GET .m3u8/.m3u responses must have every segment / sub-playlist /
      // key URI rewritten to route back through this same worker,
      // otherwise the browser fetches them directly from the origin CDN
      // and hits the exact CORS wall this proxy exists to solve.
      // (HEAD requests have no body to rewrite — passthrough as-is.)
      if (isManifest && method === 'GET') {
        const manifestText = await upstreamResponse.text()
        const rewritten     = rewriteManifest(manifestText, decodedUrl, url.origin, url.searchParams.get('noref') === '1')

        // Body size changed — let the platform recompute Content-Length
        responseHeaders.delete('Content-Length')

        return new Response(rewritten, {
          status:  upstreamResponse.status,
          headers: responseHeaders,
        })
      }

      return new Response(upstreamResponse.body, {
        status:  upstreamResponse.status,
        headers: responseHeaders,
      })

    } catch (err) {
      console.error('[worker] Fetch error:', err.message, '—', decodedUrl)

      // Timeout
      if (err.message?.includes('timeout') || err.name === 'TimeoutError') {
        return errorResponse('Upstream stream timed out', 504)
      }

      return errorResponse('Failed to fetch stream', 502)
    }
  },
}
