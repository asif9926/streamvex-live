// api/cricket-upcoming.js — Upcoming cricket matches
// Blueprint: CricAPI → Vercel KV (6hr cache)
// ✅ [Update #1] Edge Cache: s-maxage=21600, stale-while-revalidate=43200
//
// Env vars required:
//   CRICAPI_KEY

import { kv } from '@vercel/kv'

const CRICAPI_URL = 'https://api.cricapi.com/v1/matches'
const CACHE_TTL   = 21600   // 6 hours
const EDGE_CACHE  = 's-maxage=21600, stale-while-revalidate=43200'  // ✅ [Update #1]

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://streamvex-live.vercel.app'
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' })

  const cacheKey = 'cricket-upcoming'

  try {
    // ── 1. KV Cache (6hr) ─────────────────────────────
    const cached = await kv.get(cacheKey)
    if (cached) {
      res.setHeader('Cache-Control', EDGE_CACHE)
      return res.status(200).json({ source: 'cache', data: cached._data || cached })
    }

    if (!process.env.CRICAPI_KEY) {
      return res.status(503).json({ error: 'CRICAPI_KEY not configured' })
    }

    // ── 2. CricAPI — upcoming matches (paginated) ────
    // ⚠️ [Bug Fix — same root cause as cricket-series.js] CricAPI's
    // /matches endpoint returns ALL matches worldwide (finished/live/
    // upcoming, every level of cricket) in a fixed non-chronological order,
    // ~25 per page. Only fetching offset=0 meant "Upcoming" was filtered
    // from whatever arbitrary ~25 matches landed on page 1 — often missing
    // real near-term matches entirely, which is why the list didn't match
    // reality. Merging several pages first gives the date filter/sort a
    // representative set to work with. Runs once per 6hr cache window, so
    // the extra pages are quota-safe (≤4 calls per refresh).
    const MAX_PAGES = 4
    let all      = []
    let pageSize = null
    for (let page = 0; page < MAX_PAGES; page++) {
      const offset = page * (pageSize || 25)
      const url = `${CRICAPI_URL}?apikey=${process.env.CRICAPI_KEY}&offset=${offset}`
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
      if (!response.ok) {
        if (page === 0) throw new Error(`CricAPI ${response.status}`)
        break
      }
      const raw = await response.json()
      if (raw.status !== 'success') {
        if (page === 0) throw new Error(raw.reason || 'CricAPI error')
        break
      }
      const batch = raw.data || []
      if (pageSize === null) pageSize = batch.length || 25
      all = all.concat(batch)
      if (batch.length === 0 || batch.length < pageSize) break
    }

    // Upcoming only — dateTimeGMT এখনো আসেনি এবং matchStarted = false
    const now  = Date.now()
    const data = all
      .filter(m => {
        // ✅ [Fix] NaN guard — invalid dates should not pass filter
        const startTime = new Date(m.dateTimeGMT).getTime()
        if (isNaN(startTime)) return false
        return !m.matchStarted && startTime > now
      })
      .sort((a, b) => new Date(a.dateTimeGMT) - new Date(b.dateTimeGMT))
      .map(m => ({
        id:        m.id,
        name:      m.name,
        matchType: m.matchType,
        format:    detectFormat(m.matchType || m.name || ''),
        status:    m.status,
        venue:     m.venue,
        date:      formatDate(m.dateTimeGMT),
        time:      formatTime(m.dateTimeGMT),
        startDate: m.dateTimeGMT,
        teams:     m.teams || [],
        series:    m.series || '',
      }))

    // ── 3. KV save (6hr) ──────────────────────────────
    await kv.set(cacheKey, { _data: data, _updatedAt: new Date().toISOString() }, { ex: CACHE_TTL })

    res.setHeader('Cache-Control', EDGE_CACHE)
    return res.status(200).json({ source: 'api', data })

  } catch (error) {
    console.error('[cricket-upcoming] Error:', error.message)
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
  return isNaN(d) ? '' : d.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
}
