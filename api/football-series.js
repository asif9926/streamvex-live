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

// ✅ [Fix] football-data.org এ comma-separated status কাজ করে না
// Valid single values: SCHEDULED | LIVE | IN_PLAY | PAUSED | FINISHED | POSTPONED | CANCELLED
// Approach: 2 separate requests → merge → deduplicate
async function fetchMatches(competitionId, status, authToken) {
  try {
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
  } catch (err) {
    // ✅ [Fix] Previously an uncaught timeout/network/JSON-parse error here
    // propagated all the way up and crashed the WHOLE league's response
    // with a 500 ("Failed to load fixtures"), even though the other status
    // request might have succeeded fine. Degrade to "no matches" instead —
    // the UI already handles an empty list gracefully.
    console.error(`[football-series] fetchMatches(${competitionId}, ${status}) failed:`, err.message)
    return []
  }
}

export default async function handler(req, res) {
  // ✅ [Fix] CORS locked to own domain
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://streamvex.live'
  res.setHeader('Access-Control-Allow-Origin',  allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' })

  // ✅ [Fix] Previously this only accepted a numeric ID or a small
  // hardcoded shortcode map (LEGACY_SHORTCODES) — any other real
  // football-data.org code (e.g. "CLI" for Copa Libertadores, "ELC" for
  // the Championship) was rejected with 400 *before ever calling the API*.
  // football-data.org's own endpoint accepts either the numeric ID or its
  // code interchangeably, so we just pass through whatever code the
  // dynamic league list (api/football-leagues.js) gave us — no need to
  // maintain a hardcoded map that will always be missing some competition.
  const leagueCode    = (req.query.league || '2001').toString().toUpperCase().trim()
  const isSane         = /^[A-Z0-9]{1,10}$/.test(leagueCode)   // basic sanity check, not a whitelist
  const competitionId  = isSane ? leagueCode : null
  if (!competitionId) {
    return res.status(400).json({ error: `Invalid league parameter: ${leagueCode}` })
  }

  // ✅ [Fix] Versioned — bumped because FINISHED matches are now merged in;
  // old cached entries (SCHEDULED+IN_PLAY only) would otherwise persist
  // for up to 24hrs after deploy and hide the completed-matches fix.
  const cacheKey = `football-series:v2:${leagueCode}`

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
    // ✅ [Fix] FINISHED added — previously only SCHEDULED + IN_PLAY were
    // fetched, so completed matches never showed up at all.
    const [scheduledMatches, liveMatches, finishedMatchesRaw] = await Promise.all([
      fetchMatches(competitionId, 'SCHEDULED', token),
      fetchMatches(competitionId, 'IN_PLAY',   token),
      fetchMatches(competitionId, 'FINISHED',  token),
    ])

    // A full season of FINISHED matches can be large (100+) — only keep the
    // most recent ones so the list stays relevant and small.
    const finishedMatches = finishedMatchesRaw
      .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate))
      .slice(0, 8)

    // Merge + deduplicate by id
    const seen   = new Set()
    const merged = [...liveMatches, ...scheduledMatches, ...finishedMatches].filter(m => {
      if (seen.has(m.id)) return false
      seen.add(m.id)
      return true
    })

    // ✅ [Fix] 3 buckets now instead of 2: Live → Upcoming (soonest first)
    // → recent Finished results (most recent first) at the bottom. A flat
    // ascending-date sort would've put FINISHED (past) matches before
    // SCHEDULED (future) ones, which reads backwards to a viewer.
    merged.sort((a, b) => {
      const rank = (m) => {
        if (['IN_PLAY', 'LIVE', 'PAUSED'].includes(m.status)) return 0
        if (m.status === 'FINISHED') return 2
        return 1   // SCHEDULED / TIMED / upcoming
      }
      const ra = rank(a), rb = rank(b)
      if (ra !== rb) return ra - rb
      const diff = new Date(a.utcDate) - new Date(b.utcDate)
      return ra === 2 ? -diff : diff   // finished: most-recent-first (descending)
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
