// api/football-upcoming.js — Upcoming football fixtures
// Blueprint: football-data.org → Vercel KV (6hr cache)
// ✅ [Update #1] Edge Cache: s-maxage=21600, stale-while-revalidate=43200
// ✅ [Fix] No more single hardcoded default league (was always "CL", which
// sits empty for months at a time between seasons). When no ?league= is
// given, this now aggregates SCHEDULED matches across every major
// competition server-side and merges them — whatever is actually
// upcoming, from any tournament, shows up. A specific ?league=XX still
// works exactly as before if the caller wants just one competition.
//
// Env vars required:
//   FOOTBALL_DATA_API_KEY

import { kv } from '@vercel/kv'

const FD_BASE    = 'https://api.football-data.org/v4'
const CACHE_TTL  = 21600   // 6 hours
const EDGE_CACHE = 's-maxage=21600, stale-while-revalidate=43200'  // ✅ [Update #1]

// Used both as the single-league lookup map AND as the aggregation set
// when no specific league is requested.
const SUPPORTED_LEAGUES = {
  CL:  2001, WC: 2000, PL: 2021,
  PD:  2014, BL1: 2002, SA: 2019,
  FL1: 2015, PPL: 2017, DED: 2003, BSA: 2013,
}

async function fetchScheduled(competitionId, authToken) {
  try {
    const res = await fetch(`${FD_BASE}/competitions/${competitionId}/matches?status=SCHEDULED`, {
      headers: { 'X-Auth-Token': authToken },
      signal:  AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.matches || []
  } catch (err) {
    // ✅ One competition failing (rate limit, restricted plan access,
    // timeout) never breaks the whole aggregated result — just contributes
    // nothing to the merge.
    console.error(`[football-upcoming] fetchScheduled(${competitionId}) failed:`, err.message)
    return []
  }
}

function mapMatch(m, leagueCode, fallbackTournamentName) {
  return {
    id:        m.id,
    name:      `${m.homeTeam?.name || '?'} vs ${m.awayTeam?.name || '?'}`,
    homeTeam:  m.homeTeam?.name || '',
    awayTeam:  m.awayTeam?.name || '',
    status:    m.status,
    date:      formatDate(m.utcDate),
    time:      formatTime(m.utcDate),
    startDate: m.utcDate,
    tournament: m.competition?.name || fallbackTournamentName || leagueCode,
    league:    leagueCode,
    venue:     m.venue || '',
    round:     m.matchday ? `Matchday ${m.matchday}` : '',
    isLive:    false,
  }
}

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://streamvex-live.vercel.app'
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' })

  const leagueParam = (req.query.league || '').toUpperCase()
  const aggregateAll = !leagueParam || leagueParam === 'ALL'

  // ✅ [Debug aid] ?nocache=1 skips the KV read and forces a fresh fetch —
  // handy for verifying a deploy directly from the browser:
  // /api/football-upcoming?nocache=1
  const bypassCache = req.query.nocache === '1' || req.query.nocache === 'true'
  // ✅ Single source of truth — every success path below uses this instead
  // of EDGE_CACHE directly, so ?nocache=1 always guarantees a true
  // no-store response (useful for verifying a deploy from the browser).
  const successCacheHeader = bypassCache ? 'no-store' : EDGE_CACHE

  if (!process.env.FOOTBALL_DATA_API_KEY) {
    return res.status(503).json({ error: 'FOOTBALL_DATA_API_KEY not configured' })
  }
  const token = process.env.FOOTBALL_DATA_API_KEY

  // ── Single specific league (old behaviour, still supported) ─────
  if (!aggregateAll) {
    const competitionId = SUPPORTED_LEAGUES[leagueParam]
    if (!competitionId) {
      return res.status(400).json({ error: `Unknown league: ${leagueParam}` })
    }

    const cacheKey = `football-upcoming:${leagueParam}`
    try {
      const cached = bypassCache ? null : await kv.get(cacheKey)
      if (cached) {
        res.setHeader('Cache-Control', successCacheHeader)
        return res.status(200).json({ source: 'cache', data: cached._data || cached })
      }

      const matches = await fetchScheduled(competitionId, token)
      const data = matches
        .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate))
        .map(m => mapMatch(m, leagueParam))

      // ✅ [Fix] Same empty-result caching issue as the aggregate branch below.
      if (data.length > 0) {
        await kv.set(cacheKey, { _data: data, _updatedAt: new Date().toISOString() }, { ex: CACHE_TTL })
        res.setHeader('Cache-Control', successCacheHeader)
      } else {
        res.setHeader('Cache-Control', 'no-store')
      }
      return res.status(200).json({ source: 'api', data })
    } catch (error) {
      console.error('[football-upcoming] Error:', error.message)
      return res.status(500).json({ error: 'Service unavailable.' })
    }
  }

  // ── ✅ [Fix] Aggregate across ALL major leagues ──────────────────
  // ✅ [Fix] Bumped to v2 — immediately busts the current stuck-empty
  // cache from before this fix (old key would otherwise sit cached at
  // the Vercel edge for up to 6 more hours regardless of this deploy).
  const cacheKey = 'football-upcoming:all:v2'
  try {
    const cached = bypassCache ? null : await kv.get(cacheKey)
    if (cached) {
      res.setHeader('Cache-Control', successCacheHeader)
      return res.status(200).json({ source: 'cache', data: cached._data || cached })
    }

    const entries = Object.entries(SUPPORTED_LEAGUES)
    const results = await Promise.all(
      entries.map(([code, id]) => fetchScheduled(id, token).then(matches => ({ code, matches })))
    )

    const merged = results.flatMap(({ code, matches }) => matches.map(m => mapMatch(m, code)))
    merged.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))

    // Cap the list — no one needs 200 fixtures from 10 leagues merged.
    const data = merged.slice(0, 40)

    // ✅ [Fix] Only cache (KV + edge) when we actually got results. Every
    // league can occasionally 429/timeout at once (e.g. right after a
    // burst of manual testing) — caching an empty result for 6 hours at
    // the Vercel edge froze the Upcoming tab empty long after the league
    // APIs had recovered. An empty result now falls through with
    // no-store, so the very next request tries fresh instead of hitting
    // a stale "no matches" edge cache.
    if (data.length > 0) {
      await kv.set(cacheKey, { _data: data, _updatedAt: new Date().toISOString() }, { ex: CACHE_TTL })
      res.setHeader('Cache-Control', successCacheHeader)
    } else {
      res.setHeader('Cache-Control', 'no-store')
    }
    return res.status(200).json({ source: 'api', data })

  } catch (error) {
    console.error('[football-upcoming] Aggregate error:', error.message)
    try {
      const stale = await kv.get(cacheKey)
      if (stale) {
        res.setHeader('Cache-Control', successCacheHeader)
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
  return isNaN(d) ? '' : d.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
}
