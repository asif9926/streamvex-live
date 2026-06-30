// api/match-results.js — Completed cricket + football match results
// Blueprint: RapidAPI → Vercel KV (30-60 min cache)
// ✅ [Update #1] Edge Cache: s-maxage=3600, stale-while-revalidate=7200
// ✅ [Fix] Cricket endpoint changed from /series → /matches (correct completed matches API)
// ✅ [Fix] CORS locked to ALLOWED_ORIGIN
//
// Env vars required:
//   RAPIDAPI_KEY
//   ALLOWED_ORIGIN

import { kv } from '@vercel/kv'

// ✅ [Fix] Cricket results endpoint corrected
// /series → cricket series list (wrong)
// /matches → completed match list (correct)
const CRICKET_RESULTS_API  = 'https://cricket-live-line1.p.rapidapi.com/matches'
const FOOTBALL_RESULTS_API = 'https://allsportsapi2.p.rapidapi.com/api/football/matches/result'
const CRICKET_HOST         = 'cricket-live-line1.p.rapidapi.com'
const FOOTBALL_HOST        = 'allsportsapi2.p.rapidapi.com'

const CACHE_TTL  = 3600  // 1 hour KV TTL
const EDGE_CACHE = 's-maxage=3600, stale-while-revalidate=7200'  // ✅ [Update #1]

export default async function handler(req, res) {
  // ✅ [Fix] CORS locked to own domain
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://streamvex.live'
  res.setHeader('Access-Control-Allow-Origin',  allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' })

  const sport    = (req.query.sport || 'cricket').toLowerCase()
  if (!['cricket', 'football'].includes(sport)) {
    return res.status(400).json({ error: 'Invalid sport. Use cricket or football.' })
  }

  const cacheKey = `match-results:${sport}`

  try {
    // ── 1. KV Cache ───────────────────────────────────
    const cached = await kv.get(cacheKey)
    if (cached) {
      res.setHeader('Cache-Control', EDGE_CACHE)
      return res.status(200).json({ source: 'cache', data: cached._data || cached })
    }

    if (!process.env.RAPIDAPI_KEY) {
      return res.status(503).json({ error: 'RAPIDAPI_KEY not configured' })
    }

    // ── 2. API call ───────────────────────────────────
    const apiUrl = sport === 'cricket' ? CRICKET_RESULTS_API : FOOTBALL_RESULTS_API
    const host   = sport === 'cricket' ? CRICKET_HOST        : FOOTBALL_HOST

    // ✅ [Fix] Cricket: filter for completed matches via query param
    const fetchUrl = sport === 'cricket'
      ? `${apiUrl}?type=result`   // cricket-live-line1 supports ?type=result for completed
      : apiUrl

    const response = await fetch(fetchUrl, {
      headers: {
        'x-rapidapi-key':  process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': host,
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      if (response.status === 429) {
        const stale = await kv.get(cacheKey).catch(() => null)
        if (stale) {
          res.setHeader('Cache-Control', EDGE_CACHE)
          return res.status(200).json({ source: 'stale_cache', data: stale._data || stale })
        }
      }
      throw new Error(`RapidAPI ${response.status}`)
    }

    const raw  = await response.json()
    const data = normalizeResults(raw, sport)

    // ── 3. KV save ───────────────────────────────────
    await kv.set(cacheKey, { _data: data, _updatedAt: new Date().toISOString() }, { ex: CACHE_TTL })

    res.setHeader('Cache-Control', EDGE_CACHE)
    return res.status(200).json({ source: 'api', data })

  } catch (error) {
    console.error('[match-results] Error:', error.message)
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

function normalizeResults(raw, sport) {
  let items = []
  if (Array.isArray(raw))               items = raw
  else if (Array.isArray(raw?.data))    items = raw.data
  else if (Array.isArray(raw?.results)) items = raw.results
  else if (Array.isArray(raw?.response)) items = raw.response

  if (sport === 'cricket') {
    return items.map(m => ({
      id:        m.match_id  || m.id,
      name:      m.title     || m.name || `${m.team_a} vs ${m.team_b}`,
      teams:     [m.team_a, m.team_b].filter(Boolean),
      score:     buildCricketScore(m),
      status:    m.match_status || 'Finished',
      format:    detectFormat(m.match_type || m.title || ''),
      matchType: m.match_type || '',
      venue:     m.venue || '',
      date:      m.match_date || '',
    }))
  }

  return items.map(m => ({
    id:        m.event_key       || m.id,
    homeTeam:  m.event_home_team || m.homeTeam,
    awayTeam:  m.event_away_team || m.awayTeam,
    homeScore: m.event_final_result?.split(' - ')?.[0] ?? m.homeScore ?? null,
    awayScore: m.event_final_result?.split(' - ')?.[1] ?? m.awayScore ?? null,
    tournament:m.league_name     || m.tournament || '',
    status:    'FT',
    date:      m.event_date      || '',
    isLive:    false,
  }))
}

function buildCricketScore(m) {
  const s = []
  if (m.team_a_scores != null) s.push({ team: m.team_a, r: m.team_a_scores, w: m.team_a_wickets, o: m.team_a_over })
  if (m.team_b_scores != null) s.push({ team: m.team_b, r: m.team_b_scores, w: m.team_b_wickets, o: m.team_b_over })
  return s
}

function detectFormat(str) {
  const u = str.toUpperCase()
  if (u.includes('TEST'))              return 'Test'
  if (u.includes('ODI'))               return 'ODI'
  if (/T20|IPL|BPL|PSL|BBL/i.test(u)) return 'T20'
  return ''
}
