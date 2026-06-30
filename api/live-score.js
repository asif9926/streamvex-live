// api/live-score.js — Live cricket + football scores
// Blueprint: RapidAPI → Vercel KV (90s cache)
// ✅ [Update #1] Edge Cache header: s-maxage=90, stale-while-revalidate=120
//
// Env vars required:
//   RAPIDAPI_KEY — rapidapi.com dashboard থেকে নাও

import { kv } from '@vercel/kv'

// ── API Config ────────────────────────────────────────
const CRICKET_API  = 'https://cricket-live-line1.p.rapidapi.com/matches'
const FOOTBALL_API = 'https://allsportsapi2.p.rapidapi.com/api/football/matches/live'
const CRICKET_HOST = 'cricket-live-line1.p.rapidapi.com'
const FOOTBALL_HOST = 'allsportsapi2.p.rapidapi.com'

const CACHE_TTL = 90   // seconds — KV TTL
// ✅ [Update #1] Edge Cache: Vercel Edge Network নিজেই ক্যাশ করবে
//    Browser → Edge Cache (90s) → KV → API
//    Edge hit হলে KV বা API-তে কোনো request-ই যাবে না
const EDGE_CACHE = 's-maxage=90, stale-while-revalidate=120'

export default async function handler(req, res) {
  // CORS — same origin only (Vercel rewrite করে)
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://streamvex.live'
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
      },
      signal: AbortSignal.timeout(8000),  // 8s timeout
    })

    if (!response.ok) {
      // Rate limit (429) — stale cache দেখাও
      if (response.status === 429) {
        const stale = await kv.get(cacheKey).catch(() => null)
        if (stale) {
          res.setHeader('Cache-Control', EDGE_CACHE)
          return res.status(200).json({ source: 'stale_cache', data: stale._data || stale })
        }
      }
      throw new Error(`RapidAPI responded with ${response.status}`)
    }

    const raw  = await response.json()
    const data = normalizeMatches(raw, sport)

    // ── 3. KV-তে save ────────────────────────────────
    await kv.set(cacheKey, { _data: data, _updatedAt: new Date().toISOString() }, { ex: CACHE_TTL })

    // ✅ [Update #1] Edge Cache header
    res.setHeader('Cache-Control', EDGE_CACHE)
    return res.status(200).json({ source: 'api', updatedAt: new Date().toISOString(), data })

  } catch (error) {
    console.error('[live-score] Error:', error.message)

    // Fallback — stale KV data দেখাও
    try {
      const stale = await kv.get(cacheKey)
      if (stale) {
        res.setHeader('Cache-Control', EDGE_CACHE)
        return res.status(200).json({ source: 'stale_cache', data: stale._data || stale })
      }
    } catch {}

    return res.status(500).json({ error: 'Service unavailable. Try again shortly.' })
  }
}

// ── Normalize different API response shapes ───────────
function normalizeMatches(raw, sport) {
  let matches = []
  if (Array.isArray(raw))            matches = raw
  else if (Array.isArray(raw?.data)) matches = raw.data
  else if (Array.isArray(raw?.response)) matches = raw.response

  if (sport === 'cricket') {
    return matches.map(m => ({
      id:        m.match_id  || m.id,
      name:      m.title     || m.name || `${m.team_a} vs ${m.team_b}`,
      teams:     [m.team_a,  m.team_b].filter(Boolean),
      score:     parseScore(m),
      status:    m.match_status || m.status,
      matchType: m.match_type   || m.type,
      format:    detectFormat(m.match_type || m.title || ''),
      isLive:    true,
      venue:     m.venue || '',
      series:    m.series_name || '',
    }))
  }

  // football
  return matches.map(m => ({
    id:        m.event_key    || m.id,
    homeTeam:  m.event_home_team || m.homeTeam,
    awayTeam:  m.event_away_team || m.awayTeam,
    homeScore: m.event_final_result?.split(' - ')?.[0] ?? m.homeScore ?? null,
    awayScore: m.event_final_result?.split(' - ')?.[1] ?? m.awayScore ?? null,
    minute:    m.event_game_minute || m.minute,
    status:    m.event_status || 'Live',
    tournament:m.league_name || m.tournament || '',
    isLive:    true,
  }))
}

function parseScore(m) {
  const scores = []
  if (m.team_a_scores) scores.push({ team: m.team_a, r: m.team_a_scores, w: m.team_a_wickets, o: m.team_a_over })
  if (m.team_b_scores) scores.push({ team: m.team_b, r: m.team_b_scores, w: m.team_b_wickets, o: m.team_b_over })
  return scores
}

function detectFormat(str) {
  const u = str.toUpperCase()
  if (u.includes('TEST'))             return 'Test'
  if (u.includes('ODI'))              return 'ODI'
  if (/T20|IPL|BPL|PSL|BBL/i.test(u)) return 'T20'
  if (/T10/i.test(u))                 return 'T10'
  return ''
}
