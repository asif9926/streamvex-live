// api/match-results.js — Completed cricket results + Football fixtures/schedule
// Blueprint: RapidAPI → Vercel KV (30-60 min cache)
// ✅ [Update #1] Edge Cache: s-maxage=3600, stale-while-revalidate=7200
// ✅ [Fix] Correct RapidAPI endpoint paths — verified against working production reference
//    Cricket:  /matches?type=result  →  /recentMatches      (cricket-live-line1 real endpoint)
//    Football: /api/football/matches/result  →  /api/events/schedule  (allsportsapi2 real endpoint, date param)
//
// Env vars required:
//   RAPIDAPI_KEY
//   ALLOWED_ORIGIN

import { kv } from '@vercel/kv'

// ✅ [Fix] সঠিক endpoint — cricket completed matches
const CRICKET_RESULTS_API  = 'https://cricket-live-line1.p.rapidapi.com/recentMatches'
// ✅ [Fix] সঠিক endpoint — football এর জন্য date-based schedule (results না, কিন্তু এটাই real route)
const FOOTBALL_RESULTS_API = 'https://allsportsapi2.p.rapidapi.com/api/events/schedule'
const CRICKET_HOST         = 'cricket-live-line1.p.rapidapi.com'
const FOOTBALL_HOST        = 'allsportsapi2.p.rapidapi.com'

const CACHE_TTL  = 3600  // 1 hour KV TTL
const EDGE_CACHE = 's-maxage=3600, stale-while-revalidate=7200'  // ✅ [Update #1]

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://streamvex.live'
  res.setHeader('Access-Control-Allow-Origin',  allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' })

  const sport = (req.query.sport || 'cricket').toLowerCase()
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
    const host = sport === 'cricket' ? CRICKET_HOST : FOOTBALL_HOST

    let fetchUrl = sport === 'cricket' ? CRICKET_RESULTS_API : FOOTBALL_RESULTS_API
    let response

    if (sport === 'cricket') {
      response = await fetch(fetchUrl, {
        headers: {
          'x-rapidapi-key':  process.env.RAPIDAPI_KEY,
          'x-rapidapi-host': host,
          'Content-Type':    'application/json',
        },
        signal: AbortSignal.timeout(10000),
      })
    } else {
      // ✅ [Fix] football: date param আজকের তারিখ দিয়ে — reference code এর মতোই
      const today = new Date().toISOString().split('T')[0]
      response = await fetch(`${fetchUrl}?date=${today}`, {
        headers: {
          'x-rapidapi-key':  process.env.RAPIDAPI_KEY,
          'x-rapidapi-host': host,
        },
        signal: AbortSignal.timeout(10000),
      })
    }

    if (!response.ok) {
      console.error(`[match-results] RapidAPI ${response.status} for ${sport}`)
      const stale = await kv.get(cacheKey).catch(() => null)
      if (stale) {
        res.setHeader('Cache-Control', EDGE_CACHE)
        return res.status(200).json({ source: 'stale_cache', data: stale._data || stale })
      }
      // ✅ [Fix] crash এর বদলে empty array সহ 200 — frontend ভাঙবে না
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ source: 'error_fallback', data: [], error: `RapidAPI ${response.status}` })
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
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ source: 'error_fallback', data: [], error: 'Service unavailable' })
  }
}

function normalizeResults(raw, sport) {
  let items = []
  if (Array.isArray(raw))                items = raw
  else if (Array.isArray(raw?.data))     items = raw.data       // ✅ cricket-live-line1 shape
  else if (Array.isArray(raw?.results))  items = raw.results
  else if (Array.isArray(raw?.response)) items = raw.response
  else if (Array.isArray(raw?.events))   items = raw.events     // ✅ [Fix] allsportsapi2 shape
  else if (Array.isArray(raw?.matches))  items = raw.matches    // ✅ [Fix] allsportsapi2 alt shape

  if (sport === 'cricket') {
    return items.map(m => ({
      id:        m.match_id  || m.id,
      name:      m.title     || m.name || `${m.team_a || 'Team 1'} vs ${m.team_b || 'Team 2'}`,
      teams:     [m.team_a || 'Team 1', m.team_b || 'Team 2'],
      score:     buildCricketScore(m),
      status:    m.match_status || m.toss || m.need_run_ball || 'Finished',
      format:    detectFormat(m.match_type || m.title || m.series || ''),
      matchType: m.series || m.match_type || '',
      venue:     m.venue || '',
      date:      m.match_date || m.date || '',
    }))
  }

  return items.map(m => ({
    id:        m.event_key       || m.id,
    homeTeam:  m.event_home_team || m.homeTeam || m.home?.name,
    awayTeam:  m.event_away_team || m.awayTeam || m.away?.name,
    homeScore: m.event_final_result?.split(' - ')?.[0] ?? m.homeScore ?? null,
    awayScore: m.event_final_result?.split(' - ')?.[1] ?? m.awayScore ?? null,
    tournament:m.league_name     || m.tournament || '',
    status:    m.event_status    || 'FT',
    date:      m.event_date      || m.date || '',
    isLive:    false,
  }))
}

function buildCricketScore(m) {
  const s = []
  s.push({ team: m.team_a || 'Team 1', r: m.team_a_scores || '0', w: m.team_a_wickets, o: m.team_a_over })
  s.push({ team: m.team_b || 'Team 2', r: m.team_b_scores || '0', w: m.team_b_wickets, o: m.team_b_over })
  return s
}

function detectFormat(str) {
  const u = String(str).toUpperCase()
  if (u.includes('TEST'))              return 'Test'
  if (u.includes('ODI'))               return 'ODI'
  if (/T20|IPL|BPL|PSL|BBL/i.test(u)) return 'T20'
  return ''
}
