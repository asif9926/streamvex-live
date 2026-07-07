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

  const cacheKey = 'cricket-series:v5'

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

    // ⚠️ [Update] MAX_PAGES bumped 10→20. This endpoint only refreshes
    // ONCE per 24hr cache window, so extra pages here are cheap
    // (≤20 calls/day total — NOT ×4 like cricket-upcoming.js, which
    // refreshes every 6hrs). CricAPI's list order is not chronological,
    // so a bigger sample meaningfully improves how many
    // international/famous-league series we actually find.
    const MAX_PAGES = 20
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

    // Hide domestic first-class/qualifier noise (Ranji Trophy, random
    // regional tournaments, etc.), keep only international series +
    // well-known T20 leagues (IPL/BPL/PSL/BBL/…).
    // See api/_lib/cricketFilters.js for the exact keyword list.
    const notable = all.filter(s => isNotableCricket(s.name))

    const now = Date.now()
    const isEnded = (s) => {
      if (!s.endDate) return false   // no end date info — treat as not-ended
      const end = new Date(s.endDate).getTime()
      return !isNaN(end) && end < now
    }

    // ⚠️ [Bug Fix — was showing "No series data found"] A strict
    // "notable AND not-yet-ended" filter is the IDEAL result, but CricAPI's
    // list order is arbitrary — with a capped page sample, sometimes every
    // notable series that happens to be in THIS sample is already over,
    // and a strict filter then shows nothing at all, which is worse than
    // showing slightly-stale data. Tiered fallback: use the strict/ideal
    // result if it has enough entries; otherwise progressively relax
    // instead of ever showing an empty page.
    const strict = notable.filter(s => !isEnded(s))
    let chosen
    if (strict.length >= 5) {
      chosen = strict                              // Tier 1: ideal — plenty of live/upcoming notable series
    } else if (notable.length > 0) {
      chosen = notable                             // Tier 2: relax the date cutoff, keep the name filter
    } else {
      chosen = all                                 // Tier 3: last resort — should be unreachable with 20 pages,
    }                                               //          but never show a blank page if it somehow is

    const data = chosen.map(s => ({
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

    // Sort: ongoing first, then upcoming (soonest first), ended ones
    // (only present in the Tier 2/3 fallback) pushed to the very bottom,
    // most-recently-ended first — so it always reads front-to-back like
    // a calendar, whichever tier was used.
    data.sort((a, b) => {
      const rank = (s) => {
        const start = s.startDate ? new Date(s.startDate).getTime() : null
        const end   = s.endDate   ? new Date(s.endDate).getTime()   : null
        if (start !== null && end !== null && start <= now && now <= end) return 0  // ongoing
        if (end !== null && end < now) return 2                                     // ended
        return 1                                                                    // upcoming
      }
      const ra = rank(a), rb = rank(b)
      if (ra !== rb) return ra - rb
      if (ra === 2) {
        const ea = a.endDate ? new Date(a.endDate).getTime() : 0
        const eb = b.endDate ? new Date(b.endDate).getTime() : 0
        return eb - ea   // most recently ended first
      }
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
