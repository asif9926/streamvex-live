// api/live-score.js — Live cricket + football scores
// Blueprint: RapidAPI → Vercel KV (90s cache)
// ✅ [Update #1] Edge Cache header: s-maxage=90, stale-while-revalidate=120
// ✅ [Fix] Correct RapidAPI endpoint paths — verified against working production reference
//    Cricket:  /matches  →  /liveMatches   (cricket-live-line1 real endpoint)
//    Football: /api/football/matches/live  →  /api/matches/live  (allsportsapi2 real endpoint)
//
// Env vars required:
//   RAPIDAPI_KEY — rapidapi.com dashboard থেকে নাও

import { kv } from '@vercel/kv'

// ── API Config ────────────────────────────────────────
// ✅ [Fix] সঠিক endpoint path — RapidAPI marketplace এ actual documented route
const CRICKET_API   = 'https://cricket-live-line1.p.rapidapi.com/liveMatches'
const FOOTBALL_API  = 'https://allsportsapi2.p.rapidapi.com/api/matches/live'
const CRICKET_HOST  = 'cricket-live-line1.p.rapidapi.com'
const FOOTBALL_HOST = 'allsportsapi2.p.rapidapi.com'

const CACHE_TTL = 90   // seconds — KV TTL
// ✅ [Update #1] Edge Cache: Vercel Edge Network নিজেই ক্যাশ করবে
//    Browser → Edge Cache (90s) → KV → API
//    Edge hit হলে KV বা API-তে কোনো request-ই যাবে না
const EDGE_CACHE = 's-maxage=90, stale-while-revalidate=120'

export default async function handler(req, res) {
  // CORS — same origin only (Vercel rewrite করে)
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://streamvex-live.vercel.app'
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const sport    = (req.query.sport || 'cricket').toLowerCase()
  const matchId  = req.query.matchId || null
  const cacheKey = matchId ? `live-score:${sport}:${matchId}` : `live-score:${sport}`

  try {
    // ── 1. KV Cache check ─────────────────────────────
    const cached = await kv.get(cacheKey)
    if (cached) {
      res.setHeader('Cache-Control', EDGE_CACHE)  // ✅ [Update #1]
      return res.status(200).json({
        source:    'cache',
        updatedAt: cached._updatedAt || null,
        data:      cached._data      || cached,
      })
    }

    // ── 2. External API call ──────────────────────────
    const apiUrl = sport === 'cricket' ? CRICKET_API : FOOTBALL_API
    const host   = sport === 'cricket' ? CRICKET_HOST : FOOTBALL_HOST

    if (!process.env.RAPIDAPI_KEY) {
      return res.status(503).json({ error: 'RAPIDAPI_KEY not configured' })
    }

    const response = await fetch(apiUrl, {
      headers: {
        'x-rapidapi-key':  process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': host,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      // ✅ [Fix] error হলে crash না করিয়ে stale/empty data সহ 200 দাও
      console.error(`[live-score] RapidAPI ${response.status} for ${sport}`)
      const stale = await kv.get(cacheKey).catch(() => null)
      if (stale) {
        res.setHeader('Cache-Control', EDGE_CACHE)
        return res.status(200).json({ source: 'stale_cache', data: stale._data || stale })
      }
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ source: 'error_fallback', data: [], error: `RapidAPI ${response.status}` })
    }

    const raw  = await response.json()
    const data = normalizeMatches(raw, sport)

    // ── 3. KV-তে save ────────────────────────────────
    await kv.set(cacheKey, { _data: data, _updatedAt: new Date().toISOString() }, { ex: CACHE_TTL })

    res.setHeader('Cache-Control', EDGE_CACHE)
    return res.status(200).json({ source: 'api', updatedAt: new Date().toISOString(), data })

  } catch (error) {
    console.error('[live-score] Error:', error.message)

    try {
      const stale = await kv.get(cacheKey)
      if (stale) {
        res.setHeader('Cache-Control', EDGE_CACHE)
        return res.status(200).json({ source: 'stale_cache', data: stale._data || stale })
      }
    } catch {}

    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ source: 'error_fallback', data: [], error: 'Service temporarily unavailable' })
  }
}

// ── Normalize different API response shapes ───────────
// ✅ [Fix] cricket-live-line1 আসলে { data: [...] } shape এ দেয়
function normalizeMatches(raw, sport) {
  let matches = []
  if (Array.isArray(raw))                matches = raw
  else if (Array.isArray(raw?.data))     matches = raw.data
  else if (Array.isArray(raw?.response)) matches = raw.response
  else if (Array.isArray(raw?.events))   matches = raw.events
  else if (Array.isArray(raw?.matches))  matches = raw.matches

  if (sport === 'cricket') {
    return matches.map(m => ({
      id:        m.match_id  || m.id,
      name:      m.title     || m.name || `${m.team_a || 'Team 1'} vs ${m.team_b || 'Team 2'}`,
      teams:     [m.team_a || 'Team 1', m.team_b || 'Team 2'],
      score:     parseScore(m),
      status:    m.need_run_ball || m.toss || m.match_status || m.status || 'Match info unavailable',
      matchType: m.series || m.match_type || m.type || 'Match',
      format:    detectFormat(m.match_type || m.title || m.series || ''),
      isLive:    true,
      venue:     m.venue || '',
      series:    m.series || m.series_name || '',
    }))
  }

  // football
  // ✅ [Bug Fix] `event_final_result?.split(' - ')` crashed every football
  // match render when allsportsapi2 returned that field as something other
  // than a string (e.g. a number, or a plain "0-0" with no spaces) —
  // optional chaining (`?.`) only guards against null/undefined, NOT
  // against wrong types, so `.split` on a non-string threw a TypeError
  // that took down the entire score grid (all matches share one render
  // pass). Now we explicitly check the type before calling .split(), and
  // fall back gracefully for any other shape.
  return matches.map(m => {
    let homeFromResult = null
    let awayFromResult = null
    if (typeof m.event_final_result === 'string' && m.event_final_result.includes('-')) {
      const parts = m.event_final_result.split('-').map(p => p.trim())
      homeFromResult = parts[0] || null
      awayFromResult = parts[1] || null
    }
    return {
      id:        m.event_key       || m.id,
      homeTeam:  m.event_home_team || m.homeTeam || m.home?.name,
      awayTeam:  m.event_away_team || m.awayTeam || m.away?.name,
      homeScore: homeFromResult ?? m.homeScore ?? m.home?.score ?? null,
      awayScore: awayFromResult ?? m.awayScore ?? m.away?.score ?? null,
      minute:    m.event_game_minute || m.minute,
      status:    m.event_status || m.status || 'Live',
      tournament:m.league_name || m.tournament || '',
      isLive:    true,
    }
  })
}

function parseScore(m) {
  const scores = []
  scores.push({ team: m.team_a || 'Team 1', r: m.team_a_scores || '0', w: m.team_a_wickets, o: m.team_a_over })
  scores.push({ team: m.team_b || 'Team 2', r: m.team_b_scores || '0', w: m.team_b_wickets, o: m.team_b_over })
  return scores
}

function detectFormat(str) {
  const u = String(str).toUpperCase()
  if (u.includes('TEST'))             return 'Test'
  if (u.includes('ODI'))              return 'ODI'
  if (/T20|IPL|BPL|PSL|BBL/i.test(u)) return 'T20'
  if (/T10/i.test(u))                 return 'T10'
  return ''
}
