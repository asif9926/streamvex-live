// api/match-results.js — Completed cricket results + Football finished matches
// ✅ Football switched to football-data.org (v4), matching the SAME proven
//    working pattern already used in api/football-upcoming.js and
//    api/football-series.js in this project — per-competition endpoint,
//    NOT the global /v4/matches list (which is unreliable/restricted on
//    the free tier).
//
// Env vars required:
//   RAPIDAPI_KEY            — cricket-live-line1 (cricket results)
//   FOOTBALL_DATA_API_KEY   — football-data.org  (football results)
//   ALLOWED_ORIGIN

import { kv } from '@vercel/kv'

const CRICKET_RESULTS_API = 'https://cricket-live-line1.p.rapidapi.com/recentMatches'
const CRICKET_HOST        = 'cricket-live-line1.p.rapidapi.com'
const FD_BASE              = 'https://api.football-data.org/v4'

// ✅ Same mapping as api/football-upcoming.js / api/football-series.js —
// kept identical so league codes behave consistently across the app.
const SUPPORTED_LEAGUES = {
  CL: 2001, WC: 2000, PL: 2021,
  PD: 2014, BL1: 2002, SA: 2019,
  FL1: 2015, PPL: 2017, DED: 2003, BSA: 2013,
}

// ✅ For the Results tab we only sweep the leagues shown in Tournament.jsx's
// FOOTBALL_LEAGUES selector (CL, WC, PL, PD, BL1, SA) rather than all 10 —
// football-data.org's free tier allows 10 req/min, and firing 10 sequential
// calls in a single request would eat the whole per-minute budget by
// itself. Six is enough to reliably surface "recent results" while
// leaving headroom for other endpoints hitting the same key.
const RESULT_LEAGUES = ['CL', 'WC', 'PL', 'PD', 'BL1', 'SA']

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

  // ✅ [Debug aid] ?nocache=1 skips the KV read and forces a fresh fetch —
  // handy for verifying a deploy directly from the browser:
  // /api/match-results?sport=football&nocache=1
  const bypassCache = req.query.nocache === '1' || req.query.nocache === 'true'
  const cacheHeader = bypassCache ? 'no-store' : EDGE_CACHE
  const cacheKey    = `match-results:v2:${sport}`

  try {
    // ── 1. KV Cache Check ─────────────────────────────
    const cached = bypassCache ? null : await kv.get(cacheKey)
    if (cached) {
      res.setHeader('Cache-Control', cacheHeader)
      return res.status(200).json({ source: 'cache', data: cached._data || cached })
    }

    let response
    let data  = []
    let debug = null

    if (sport === 'cricket') {
      if (!process.env.RAPIDAPI_KEY) {
        return res.status(503).json({ error: 'RAPIDAPI_KEY missing' })
      }

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
      // ── Football — football-data.org, per-competition ──
      if (!process.env.FOOTBALL_DATA_API_KEY) {
        return res.status(503).json({ error: 'FOOTBALL_DATA_API_KEY missing' })
      }

      // ✅ [Bug Fix] football-data.org's `dateTo` filter is EXCLUSIVE —
      // "dateTo=2026-07-03 will contain matches only until and excluding
      // the 3rd of July" (per their own docs). Using today's date as
      // dateTo silently dropped every match finished TODAY. Fixed by
      // using tomorrow as the (exclusive) upper bound, so today is
      // fully included.
      const toYMD = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000)
      const tomorrow    = new Date(Date.now() + 1 * 86400000)
      const dateFrom = toYMD(twoDaysAgo)
      const dateTo   = toYMD(tomorrow)   // exclusive bound — now correctly includes today

      const headers = { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY }
      const sleep   = (ms) => new Promise(r => setTimeout(r, ms))

      let collected     = []
      const leaguesTried = []
      let lastResponse   = null

      // ✅ Sequential (not parallel) — free tier is 10 req/min; firing
      // several competitions in parallel risks a 429 on the very first
      // burst. Small delay between calls keeps us well under the limit.
      // Stops early once we have a reasonable number of results, saving
      // quota for the app's other football-data.org endpoints.
      for (const code of RESULT_LEAGUES) {
        const competitionId = SUPPORTED_LEAGUES[code]
        if (!competitionId) continue

        const url = `${FD_BASE}/competitions/${competitionId}/matches?status=FINISHED&dateFrom=${dateFrom}&dateTo=${dateTo}`
        let r
        try {
          r = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
        } catch {
          continue
        }
        lastResponse = r
        leaguesTried.push({ league: code, status: r.status })

        if (r.status === 429) {
          await sleep(700)   // back off a bit longer, then move on
          continue
        }
        if (!r.ok) continue

        const raw = await r.json().catch(() => null)
        if (raw?.matches?.length) {
          collected = collected.concat(raw.matches.map(m => ({ ...m, _league: code })))
        }

        if (collected.length >= 12) break   // enough for the Results tab — stop early
        await sleep(200)                    // small gap between sequential calls
      }

      response = lastResponse
      data     = normalizeFootballDataOrgResults(collected)
      debug    = { leaguesTried, rawMatchCount: collected.length, dateFrom, dateTo }
    }

    if (!response || !response.ok) {
      // football: a per-competition loop can have a later `response` be
      // ok even if the first ones weren't — data.length is the real signal.
      if (sport === 'football' && data.length > 0) {
        // fall through to success path below
      } else {
        console.error(`[match-results] API error for ${sport}`)
        const stale = await kv.get(cacheKey).catch(() => null)
        if (stale) {
          res.setHeader('Cache-Control', cacheHeader)
          return res.status(200).json({ source: 'stale_cache', data: stale._data || stale })
        }
        res.setHeader('Cache-Control', 'no-store')
        const payload = { source: 'error_fallback', data: [], error: 'Failed to fetch' }
        if (bypassCache && debug) payload._debug = debug
        return res.status(200).json(payload)
      }
    }

    // ── 3. Save to KV Cache ───────────────────────────
    if (data.length > 0) {
      await kv.set(cacheKey, { _data: data, _updatedAt: new Date().toISOString() }, { ex: CACHE_TTL })
    }

    res.setHeader('Cache-Control', cacheHeader)
    const payload = { source: 'api', data }
    if (bypassCache && debug) payload._debug = debug
    return res.status(200).json(payload)

  } catch (error) {
    console.error('[match-results] Error:', error.message)
    try {
      const stale = await kv.get(cacheKey)
      if (stale) {
        res.setHeader('Cache-Control', cacheHeader)
        return res.status(200).json({ source: 'stale_cache', data: stale._data || stale })
      }
    } catch { /* no stale cache available */ }
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ source: 'error_fallback', data: [], error: 'Service unavailable' })
  }
}

// ── Helpers ─────────────────────────────────────────────────

function toText(val, fallback = '') {
  if (val === null || val === undefined) return fallback
  if (typeof val === 'string' || typeof val === 'number') return String(val)
  if (typeof val === 'object') return val.name ?? val.text ?? val.value ?? val.title ?? val.description ?? fallback
  return fallback
}

// Normalize Cricket Data (from RapidAPI cricket-live-line1)
function normalizeCricketResults(raw) {
  let items = []
  if (Array.isArray(raw)) items = raw
  else if (Array.isArray(raw?.data)) items = raw.data

  return items.map(m => {
    const s = []
    s.push({ team: toText(m.team_a, 'Team 1'), r: m.team_a_scores || '0', w: m.team_a_wickets, o: m.team_a_over })
    s.push({ team: toText(m.team_b, 'Team 2'), r: m.team_b_scores || '0', w: m.team_b_wickets, o: m.team_b_over })

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

// Normalize Football Data (from football-data.org v4)
// ✅ [Safety] Wrapped with toText() even though football-data.org's schema
// is well-documented and reliable — cheap insurance against any future
// schema drift, and consistent with how the rest of the app guards
// against object-as-React-child crashes.
function normalizeFootballDataOrgResults(matches) {
  return matches.map(m => {
    const rawDate  = m.utcDate || ''
    const d        = rawDate ? new Date(rawDate) : null
    const validDate = d && !isNaN(d)

    return {
      id:        m.id,
      homeTeam:  toText(m.homeTeam?.shortName || m.homeTeam?.name, 'Home'),
      awayTeam:  toText(m.awayTeam?.shortName || m.awayTeam?.name, 'Away'),
      homeScore: m.score?.fullTime?.home ?? m.score?.regularTime?.home ?? null,
      awayScore: m.score?.fullTime?.away ?? m.score?.regularTime?.away ?? null,
      tournament:toText(m.competition?.name, ''),
      // ✅ [Fix] Was the literal string 'FT' — FootballScoreCard checks for
      // `status === 'FINISHED'` to show the "FT" badge and a formatted
      // footer; anything else falls through to its "Upcoming" branch,
      // which is exactly backwards for a *results* endpoint.
      status:    'FINISHED',
      // ✅ [Fix] Was the raw ISO string (m.utcDate) dumped straight into
      // the card, e.g. "2026-07-02T00:00:00Z". Now formatted the same way
      // as every other date shown in the app.
      date:      validDate ? d.toLocaleDateString('en-BD', { day: '2-digit', month: 'short' }) : rawDate,
      time:      validDate ? d.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' }) : '',
      isLive:    false,
    }
  })
}

function detectFormat(str) {
  const u = String(str).toUpperCase()
  if (u.includes('TEST'))             return 'Test'
  if (u.includes('ODI'))              return 'ODI'
  if (/T20|IPL|BPL|PSL|BBL/i.test(u)) return 'T20'
  return ''
}