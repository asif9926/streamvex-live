// api/cricket-series.js — Cricket series/tournament list
// Blueprint: CricAPI → Vercel KV (24hr cache)
// ✅ [Update #1] Edge Cache: s-maxage=86400, stale-while-revalidate=172800
//
// Env vars required:
//   CRICAPI_KEY — cricapi.com থেকে free API key নাও

import { kv } from '@vercel/kv'
import { isNotableCricket } from './_lib/cricketFilters.js'

const CRICAPI_URL = 'https://api.cricapi.com/v1/series'
const CACHE_TTL   = 86400   // 24 hours
const EDGE_CACHE  = 's-maxage=86400, stale-while-revalidate=172800'  // ✅ [Update #1]

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://streamvex-live.vercel.app'
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' })

  const cacheKey = 'cricket-series:v4'

  try {
    // ── 1. KV Cache (24hr) ────────────────────────────
    const cached = await kv.get(cacheKey)
    if (cached) {
      res.setHeader('Cache-Control', EDGE_CACHE)
      return res.status(200).json({ source: 'cache', data: cached._data || cached })
    }

    if (!process.env.CRICAPI_KEY) {
      return res.status(503).json({ error: 'CRICAPI_KEY not configured' })
    }

    // ⚠️ [Update] MAX_PAGES bumped 4→10 now that api/match-results.js no
    // longer shares CRICAPI_KEY's quota (reverted to RapidAPI) — this
    // endpoint now has the headroom to fetch more pages, which matters
    // because most of what CricAPI returns is domestic/associate-nation
    // noise that gets filtered out below (isNotableCricket) — need a
    // bigger raw pool so enough INTERNATIONAL/famous-league series survive
    // the filter. Still capped, still just once per 24hr cache window
    // (≤10 calls/day for this endpoint).
    const MAX_PAGES = 10
    let all      = []
    let pageSize = null
    for (let page = 0; page < MAX_PAGES; page++) {
      const offset = page * (pageSize || 25)
      const url = `${CRICAPI_URL}?apikey=${process.env.CRICAPI_KEY}&offset=${offset}`
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
      if (!response.ok) {
        if (page === 0) throw new Error(`CricAPI ${response.status}`)
        break   // later page failed — keep what we already collected
      }
      const raw = await response.json()
      if (raw.status !== 'success') {
        if (page === 0) throw new Error(raw.reason || 'CricAPI error')
        break
      }
      const batch = raw.data || []
      if (pageSize === null) pageSize = batch.length || 25
      all = all.concat(batch)
      if (batch.length === 0 || batch.length < pageSize) break   // last page reached
    }

    // ⚠️ [Bug Fix] User request — hide domestic first-class/qualifier noise
    // (Ranji Trophy, random regional tournaments, etc.), keep only real
    // international series + well-known T20 leagues (IPL/BPL/PSL/BBL/…).
    // See api/_lib/cricketFilters.js for the exact keyword list.
    const notable = all.filter(s => isNotableCricket(s.name))

    // ⚠️ [Bug Fix] The name filter above only checked WHAT a series is,
    // never WHEN — so already-finished series (some from over a year ago)
    // were still passing through and cluttering the list. This is the
    // "Series" tab (ongoing + upcoming fixtures only); a finished tour is
    // not "running this month + upcoming months" — completed matches
    // belong in the separate Results tab (match-results.js). Drop anything
    // whose endDate has already passed. Missing endDate is kept (can't be
    // sure it's over) rather than dropped, to avoid losing valid data CricAPI
    // just didn't tag with an end date.
    const now = Date.now()
    const current = notable.filter(s => {
      if (!s.endDate) return true
      const end = new Date(s.endDate).getTime()
      return isNaN(end) || end >= now
    })

    const data = current.map(s => ({
      id:         s.id,
      name:       s.name,
      startDate:  s.startDate,
      endDate:    s.endDate,
      odi:        s.odi  || 0,
      t20:        s.t20  || 0,
      test:       s.test || 0,
      squads:     s.squads || 0,
      matches:    s.matches || 0,
      matchCount: (s.odi || 0) + (s.t20 || 0) + (s.test || 0),
    }))

    // ✅ [Fix] CricAPI returns series in no particular useful order.
    // Now that ended series are filtered out above, only 2 buckets remain:
    // ongoing first, then upcoming (soonest start first) — reads
    // front-to-back like a calendar.
    data.sort((a, b) => {
      const rank = (s) => {
        const start = s.startDate ? new Date(s.startDate).getTime() : null
        const end   = s.endDate   ? new Date(s.endDate).getTime()   : null
        if (start !== null && end !== null && start <= now && now <= end) return 0  // ongoing
        return 1   // upcoming (or edge case with missing dates)
      }
      const ra = rank(a), rb = rank(b)
      if (ra !== rb) return ra - rb
      const da = a.startDate ? new Date(a.startDate).getTime() : 0
      const db = b.startDate ? new Date(b.startDate).getTime() : 0
      return da - db   // soonest start first
    })

    // ── 3. KV save (24hr) ────────────────────────────
    await kv.set(cacheKey, { _data: data, _updatedAt: new Date().toISOString() }, { ex: CACHE_TTL })

    res.setHeader('Cache-Control', EDGE_CACHE)
    return res.status(200).json({ source: 'api', data })

  } catch (error) {
    console.error('[cricket-series] Error:', error.message)
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
