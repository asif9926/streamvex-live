// api/match-results.js 
// ✅ Updated to use Football-Data.org for perfect and stable results

import { kv } from '@vercel/kv'

const CRICKET_RESULTS_API  = 'https://cricket-live-line1.p.rapidapi.com/recentMatches'
const CRICKET_HOST         = 'cricket-live-line1.p.rapidapi.com'

const CACHE_TTL  = 3600  // 1 hour KV TTL
const EDGE_CACHE = 's-maxage=3600, stale-while-revalidate=7200'

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://streamvex-live.vercel.app'
  res.setHeader('Access-Control-Allow-Origin',  allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Vary', 'Origin')
  
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const sport = (req.query.sport || 'cricket').toLowerCase()
  if (!['cricket', 'football'].includes(sport)) {
    return res.status(400).json({ error: 'Invalid sport. Use cricket or football.' })
  }

  const bypassCache = req.query.nocache === '1' || req.query.nocache === 'true'
  const cacheHeader = bypassCache ? 'no-store' : EDGE_CACHE
  const cacheKey = `match-results:${sport}`

  try {
    // ── 1. KV Cache Check ───────────────────────────────────
    const cached = bypassCache ? null : await kv.get(cacheKey)
    if (cached) {
      res.setHeader('Cache-Control', cacheHeader)
      return res.status(200).json({ source: 'cache', data: cached._data || cached })
    }

    let response
    let data = []

    if (sport === 'cricket') {
      if (!process.env.RAPIDAPI_KEY) return res.status(503).json({ error: 'RAPIDAPI_KEY missing' })
        
      response = await fetch(CRICKET_RESULTS_API, {
        headers: {
          'x-rapidapi-key':  process.env.RAPIDAPI_KEY,
          'x-rapidapi-host': CRICKET_HOST,
          'Content-Type':    'application/json',
        },
        signal: AbortSignal.timeout(10000),
      })
      
      if (response.ok) {
        const raw = await response.json()
        data = normalizeCricketResults(raw)
      }
      
    } else {
      // ── Football Logic (Using Football-Data.org) ──
      // Note: Make sure you have FOOTBALL_DATA_API_KEY in Vercel Environment Variables
      if (!process.env.FOOTBALL_DATA_API_KEY) return res.status(503).json({ error: 'FOOTBALL_DATA_API_KEY missing' })

      // Generate date: From 2 days ago to Today (Format: YYYY-MM-DD)
      const toYMD = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
      const today = new Date()
      const twoDaysAgo = new Date(Date.now() - (2 * 86400000))
      
      const dateFrom = toYMD(twoDaysAgo)
      const dateTo = toYMD(today)
      
      // ✅ Super clean single API call for FINISHED matches
      const url = `https://api.football-data.org/v4/matches?status=FINISHED&dateFrom=${dateFrom}&dateTo=${dateTo}`

      response = await fetch(url, { 
        headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY },
        signal: AbortSignal.timeout(8000) 
      })

      if (response.ok) {
        const raw = await response.json()
        if (raw && raw.matches) {
          data = normalizeFootballDataOrgResults(raw.matches)
        }
      }
    }

    if (!response || !response.ok) {
      console.error(`[match-results] API Error for ${sport}`)
      const stale = await kv.get(cacheKey).catch(() => null)
      if (stale) {
        res.setHeader('Cache-Control', cacheHeader)
        return res.status(200).json({ source: 'stale_cache', data: stale._data || stale })
      }
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ source: 'error_fallback', data: [], error: 'Failed to fetch' })
    }

    // ── 3. Save to KV Cache ───────────────────────────────────
    if (data.length > 0) {
      await kv.set(cacheKey, { _data: data, _updatedAt: new Date().toISOString() }, { ex: CACHE_TTL })
    }

    res.setHeader('Cache-Control', cacheHeader)
    return res.status(200).json({ source: 'api', data })

  } catch (error) {
    console.error('[match-results] Error:', error.message)
    try {
      const stale = await kv.get(cacheKey)
      if (stale) {
        res.setHeader('Cache-Control', cacheHeader)
        return res.status(200).json({ source: 'stale_cache', data: stale._data || stale })
      }
    } catch {}
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ source: 'error_fallback', data: [], error: 'Service unavailable' })
  }
}

// ── Helpers ───────────────────────────────────────────────────

function toText(val, fallback = '') {
  if (val === null || val === undefined) return fallback
  if (typeof val === 'string' || typeof val === 'number') return String(val)
  if (typeof val === 'object') return val.name ?? val.text ?? val.value ?? val.title ?? val.description ?? fallback
  return fallback
}

// Normalize Cricket Data (from RapidAPI)
function normalizeCricketResults(raw) {
  let items = []
  if (Array.isArray(raw)) items = raw
  else if (Array.isArray(raw?.data)) items = raw.data

  return items.map(m => {
    const s = []
    s.push({ team: m.team_a || 'Team 1', r: m.team_a_scores || '0', w: m.team_a_wickets, o: m.team_a_over })
    s.push({ team: m.team_b || 'Team 2', r: m.team_b_scores || '0', w: m.team_b_wickets, o: m.team_b_over })

    return {
      id:        m.match_id  || m.id,
      name:      m.title     || m.name || `${toText(m.team_a, 'Team 1')} vs ${toText(m.team_b, 'Team 2')}`,
      teams:     [toText(m.team_a, 'Team 1'), toText(m.team_b, 'Team 2')],
      score:     s,
      status:    toText(m.match_status || m.toss || m.need_run_ball, 'Finished'),
      format:    detectFormat(m.match_type || m.title || m.series || ''),
      matchType: toText(m.series || m.match_type, ''),
      venue:     toText(m.venue),
      date:      m.match_date || m.date || '',
    }
  })
}

// ✅ Normalize Football Data (from Football-Data.org)
function normalizeFootballDataOrgResults(matches) {
  return matches.map(m => {
    return {
      id:        m.id,
      homeTeam:  m.homeTeam?.shortName || m.homeTeam?.name || 'Home',
      awayTeam:  m.awayTeam?.shortName || m.awayTeam?.name || 'Away',
      homeScore: m.score?.fullTime?.home ?? m.score?.regularTime?.home ?? 0,
      awayScore: m.score?.fullTime?.away ?? m.score?.regularTime?.away ?? 0,
      tournament:m.competition?.name || '',
      status:    'FT',
      date:      m.utcDate || '',
      isLive:    false,
    }
  })
}

function detectFormat(str) {
  const u = String(str).toUpperCase()
  if (u.includes('TEST'))              return 'Test'
  if (u.includes('ODI'))               return 'ODI'
  if (/T20|IPL|BPL|PSL|BBL/i.test(u)) return 'T20'
  return ''
}