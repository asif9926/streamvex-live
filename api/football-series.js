// api/football-series.js — Football league competition fixtures
// Blueprint: football-data.org → Vercel KV (24hr cache)
// ✅ [Update #1] Edge Cache: s-maxage=86400, stale-while-revalidate=172800
// ✅ [Fix] Comma-separated status param removed — football-data.org এটা support করে না
//          দুটো আলাদা request করে merge করা হয়েছে (SCHEDULED + IN_PLAY)
// ✅ [Fix] CORS locked to ALLOWED_ORIGIN
//
// Env vars required:
//   FOOTBALL_DATA_API_KEY — football-data.org থেকে free key নাও
//   ALLOWED_ORIGIN

import { kv } from '@vercel/kv'

const FD_BASE    = 'https://api.football-data.org/v4'
const CACHE_TTL  = 86400   // 24 hours
const EDGE_CACHE = 's-maxage=86400, stale-while-revalidate=172800'  // ✅ [Update #1]

// ✅ [Update] League list is now dynamic (see api/football-leagues.js),
// so this no longer restricts to a hardcoded set of shortcodes — it
// accepts any numeric football-data.org competition ID directly.
// Kept only for backward compatibility with old ?league=CL style links.
const LEGACY_SHORTCODES = {
  CL: '2001', WC: '2000', PL: '2021', PD: '2014', BL1: '2002',
  SA: '2019', FL1: '2015', PPL: '2017', DED: '2003', BSA: '2013',
}

// ✅ [Fix] football-data.org এ comma-separated status কাজ করে না
// Valid single values: SCHEDULED | LIVE | IN_PLAY | PAUSED | FINISHED | POSTPONED | CANCELLED
// Approach: 2 separate requests → merge → deduplicate
async function fetchMatches(competitionId, status, authToken) {
  const res = await fetch(
    `${FD_BASE}/competitions/${competitionId}/matches?status=${status}`,
    {
      headers: { 'X-Auth-Token': authToken },
      signal:  AbortSignal.timeout(8000),
    }
  )
  if (!res.ok) return []
  const json = await res.json()
  return json.matches || []
}

export default async function handler(req, res) {
  // ✅ [Fix] CORS locked to own domain
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://streamvex.live'
  res.setHeader('Access-Control-Allow-Origin',  allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' })

  const leagueCode    = (req.query.league || '2001').toString().toUpperCase()
  const competitionId = /^\d+$/.test(leagueCode) ? leagueCode : LEGACY_SHORTCODES[leagueCode]
  if (!competitionId) {
    return res.status(400).json({
      error: `Unknown league: ${leagueCode}. Expected a numeric football-data.org competition ID.`,
    })
  }

  const cacheKey = `football-series:${leagueCode}`

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

    const token = process.env.FOOTBALL_DATA_API_KEY

    // ── 2. ✅ [Fix] Separate requests per status ──────
    // football-data.org free plan: 10 req/min — small delay between calls
    const [scheduledMatches, liveMatches] = await Promise.all([
      fetchMatches(competitionId, 'SCHEDULED', token),
      fetchMatches(competitionId, 'IN_PLAY',   token),
    ])

    // Merge + deduplicate by id
    const seen   = new Set()
    const merged = [...liveMatches, ...scheduledMatches].filter(m => {
      if (seen.has(m.id)) return false
      seen.add(m.id)
      return true
    })

    // Sort: live first, then by date
    merged.sort((a, b) => {
      const aLive = ['IN_PLAY', 'LIVE', 'PAUSED'].includes(a.status) ? 0 : 1
      const bLive = ['IN_PLAY', 'LIVE', 'PAUSED'].includes(b.status) ? 0 : 1
      if (aLive !== bLive) return aLive - bLive
      return new Date(a.utcDate) - new Date(b.utcDate)
    })

    // ── Competition name — fetch once ─────────────────
    let competitionName = leagueCode
    if (merged.length > 0 && merged[0].competition?.name) {
      competitionName = merged[0].competition.name
    } else {
      // Fallback: fetch competition info
      try {
        const compRes = await fetch(`${FD_BASE}/competitions/${competitionId}`, {
          headers: { 'X-Auth-Token': token },
          signal:  AbortSignal.timeout(5000),
        })
        if (compRes.ok) {
          const compData = await compRes.json()
          competitionName = compData.name || leagueCode
        }
      } catch {}
    }

    const data = merged.map(m => ({
      id:        m.id,
      name:      `${m.homeTeam?.name || '?'} vs ${m.awayTeam?.name || '?'}`,
      homeTeam:  m.homeTeam?.name   || '',
      awayTeam:  m.awayTeam?.name   || '',
      homeScore: m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? null,
      awayScore: m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? null,
      status:    m.status,
      date:      formatDate(m.utcDate),
      time:      formatTime(m.utcDate),
      startDate: m.utcDate,
      tournament: competitionName,
      league:    leagueCode,
      round:     m.matchday ? `Matchday ${m.matchday}` : '',
      isLive:    ['IN_PLAY', 'LIVE', 'PAUSED'].includes(m.status),
    }))

    // ── 3. KV save ────────────────────────────────────
    await kv.set(cacheKey, { _data: data, _updatedAt: new Date().toISOString() }, { ex: CACHE_TTL })

    res.setHeader('Cache-Control', EDGE_CACHE)
    return res.status(200).json({ source: 'api', data })

  } catch (error) {
    console.error('[football-series] Error:', error.message)
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
