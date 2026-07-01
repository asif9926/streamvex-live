// api/series-matches.js — Match list for a specific cricket series
// Blueprint: CricAPI → Vercel KV (10min cache)
// Used by: src/hooks/useLiveScores.js → useSeriesMatches(seriesId)
//          src/components/tournament/SeriesMatches.jsx
//
// ❌ THIS FILE WAS MISSING — caused 404 on series expand in Tournament page
// ✅ Created fresh — fixes useSeriesMatches hook 404 error
//
// Env vars required:
//   CRICAPI_KEY
//   ALLOWED_ORIGIN

import { kv } from '@vercel/kv'

const CRICAPI_SERIES_INFO = 'https://api.cricapi.com/v1/series_info'
const CACHE_TTL           = 600    // 10 minutes — series matches update occasionally
const EDGE_CACHE          = 's-maxage=600, stale-while-revalidate=1200'

export default async function handler(req, res) {
  // ── CORS ─────────────────────────────────────────────
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://streamvex-live.vercel.app'
  res.setHeader('Access-Control-Allow-Origin',  allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' })

  // ── seriesId validation ───────────────────────────────
  const seriesId = req.query.seriesId
  if (!seriesId || typeof seriesId !== 'string' || seriesId.trim().length === 0) {
    return res.status(400).json({ error: 'seriesId query param required' })
  }

  // Basic sanity check — prevent injection via URL
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(seriesId)) {
    return res.status(400).json({ error: 'Invalid seriesId format' })
  }

  const cacheKey = `series-matches:${seriesId}`

  try {
    // ── 1. KV Cache (10min) ───────────────────────────
    const cached = await kv.get(cacheKey)
    if (cached) {
      res.setHeader('Cache-Control', EDGE_CACHE)
      return res.status(200).json({ source: 'cache', data: cached._data || cached })
    }

    if (!process.env.CRICAPI_KEY) {
      return res.status(503).json({ error: 'CRICAPI_KEY not configured' })
    }

    // ── 2. CricAPI — series_info gives match list ─────
    // CricAPI v1 series_info endpoint:
    //   GET /v1/series_info?apikey=KEY&id=SERIES_ID
    //   Returns: { data: { info: {...}, matchList: [...] } }
    const url = `${CRICAPI_SERIES_INFO}?apikey=${process.env.CRICAPI_KEY}&id=${encodeURIComponent(seriesId)}`

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) throw new Error(`CricAPI ${response.status}`)

    const raw = await response.json()

    if (raw.status !== 'success') {
      throw new Error(raw.reason || 'CricAPI error')
    }

    // CricAPI returns matchList inside data
    const seriesInfo  = raw.data?.info   || {}
    const matchList   = raw.data?.matchList || []
    const now         = Date.now()

    const data = matchList.map(m => {
      const startMs   = m.dateTimeGMT ? new Date(m.dateTimeGMT).getTime() : null
      const isUpcoming = startMs ? startMs > now : false
      const isLive     = m.matchStarted && !m.matchEnded

      return {
        id:         m.id,
        name:       m.name,
        matchType:  m.matchType,
        format:     detectFormat(m.matchType || m.name || ''),
        status:     m.status,
        venue:      m.venue || '',
        date:       formatDate(m.dateTimeGMT),
        time:       formatTime(m.dateTimeGMT),
        startDate:  m.dateTimeGMT || null,
        teams:      m.teams || [],
        isLive,
        isUpcoming,
        isFinished: m.matchEnded || false,
        seriesId,
        seriesName: seriesInfo.name || '',
      }
    })

    // Sort: live first → upcoming → finished
    data.sort((a, b) => {
      const rank = (x) => x.isLive ? 0 : x.isUpcoming ? 1 : 2
      if (rank(a) !== rank(b)) return rank(a) - rank(b)
      if (a.startDate && b.startDate) return new Date(a.startDate) - new Date(b.startDate)
      return 0
    })

    // ── 3. KV save (10min) ────────────────────────────
    await kv.set(cacheKey, { _data: data, _updatedAt: new Date().toISOString() }, { ex: CACHE_TTL })

    res.setHeader('Cache-Control', EDGE_CACHE)
    return res.status(200).json({ source: 'api', seriesName: seriesInfo.name || '', data })

  } catch (error) {
    console.error('[series-matches] Error:', error.message)
    try {
      const stale = await kv.get(cacheKey)
      if (stale) {
        res.setHeader('Cache-Control', EDGE_CACHE)
        return res.status(200).json({ source: 'stale_cache', data: stale._data || stale })
      }
    } catch {}
    return res.status(500).json({ error: 'Service unavailable.' })
  }
}

function detectFormat(str = '') {
  const u = str.toUpperCase()
  if (u.includes('TEST'))              return 'Test'
  if (u.includes('ODI'))               return 'ODI'
  if (/T20|IPL|BPL|PSL|BBL/i.test(u)) return 'T20'
  if (/T10/i.test(u))                  return 'T10'
  return ''
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d) ? iso : d.toLocaleDateString('en-BD', { day: '2-digit', month: 'short' })
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d) ? '' : d.toLocaleTimeString('en-BD', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka',
  })
}
