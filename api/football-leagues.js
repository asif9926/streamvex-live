// api/football-leagues.js — Dynamic list of available football competitions
// ✅ [Feature] Replaces the old hardcoded 6-league picker. Mirrors the
// pattern of cricket-series.js — one API call returns ALL available
// competitions, exactly like CricAPI's /series endpoint does for cricket.
//
// football-data.org: GET /v4/competitions returns every competition your
// API key has access to (varies by plan tier).
//
// Env vars required:
//   FOOTBALL_DATA_API_KEY

import { kv } from '@vercel/kv'

const FD_BASE     = 'https://api.football-data.org/v4'
const CACHE_TTL   = 86400   // 24 hours — competition list rarely changes
const EDGE_CACHE  = 's-maxage=86400, stale-while-revalidate=172800'

// ✅ [Fix] Well-known competitions pinned to the top of the list.
const POPULAR_LEAGUE_ORDER = ['WC', 'CL', 'PL', 'PD', 'BL1', 'SA', 'FL1', 'EC']

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://streamvex.live'
  res.setHeader('Access-Control-Allow-Origin',  allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' })

  // ✅ [Fix] Versioned cache key — bump this suffix whenever the sort/filter
  // logic changes, so a redeploy doesn't get stuck serving a stale KV entry
  // computed under the old logic (this is exactly why the "popular leagues
  // first" sort didn't show up after the first deploy — same key, cached data).
  const cacheKey = 'football-leagues:v2'

  try {
    // ── 1. KV Cache (24hr) ────────────────────────────
    const cached = await kv.get(cacheKey)
    if (cached) {
      res.setHeader('Cache-Control', EDGE_CACHE)
      return res.status(200).json({ source: 'cache', data: cached._data || cached })
    }

    if (!process.env.FOOTBALL_DATA_API_KEY) {
      return res.status(503).json({ error: 'FOOTBALL_DATA_API_KEY not configured' })
    }

    // ── 2. football-data.org call ─────────────────────
    const response = await fetch(`${FD_BASE}/competitions`, {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY },
      signal:  AbortSignal.timeout(10000),
    })

    if (!response.ok) throw new Error(`football-data.org ${response.status}`)

    const raw = await response.json()

    // Only competitions with an active current season are worth showing —
    // filters out defunct/archived ones the plan technically has access to.
    const data = (raw.competitions || [])
      .filter(c => c.currentSeason)
      .map(c => ({
        id:         c.code || String(c.id),   // e.g. "CL", "PL" — used as ?league= param
        name:       c.name,
        group:      c.area?.name || '',
        flag:       c.emblem || c.area?.flag || '',  // image URL — SeriesCard renders as <img> if it looks like a URL
        matchCount: undefined,
      }))
      // ✅ [Fix] Popular competitions (World Cup, Champions League, top
      // European leagues) pinned to the top instead of pure alphabetical —
      // users shouldn't have to scroll past "Campeonato Brasileiro" to
      // find the World Cup.
      .sort((a, b) => {
        const rank = (id) => {
          const i = POPULAR_LEAGUE_ORDER.indexOf(id)
          return i === -1 ? POPULAR_LEAGUE_ORDER.length : i
        }
        const ra = rank(a.id), rb = rank(b.id)
        if (ra !== rb) return ra - rb
        return a.name.localeCompare(b.name)
      })

    // ── 3. KV save (24hr) ─────────────────────────────
    await kv.set(cacheKey, { _data: data, _updatedAt: new Date().toISOString() }, { ex: CACHE_TTL })

    res.setHeader('Cache-Control', EDGE_CACHE)
    return res.status(200).json({ source: 'api', data })

  } catch (error) {
    console.error('[football-leagues] Error:', error.message)
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
