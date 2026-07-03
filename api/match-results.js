// api/match-results.js — Completed cricket results + Football fixtures/schedule
// Blueprint: RapidAPI → Vercel KV (30-60 min cache)
// ✅ [Update #1] Edge Cache: s-maxage=3600, stale-while-revalidate=7200
// ✅ [Bug Fix — v2] Football endpoint corrected after confirming 404 in
//    production logs. See FOOTBALL_RESULTS_API comment below for details.
//    Cricket:  /matches?type=result  →  /recentMatches                    (cricket-live-line1)
//    Football: /api/events/schedule (404!) → /api/matches/{d}/{m}/{y}     (allsportsapi2)
//
// Env vars required:
//   RAPIDAPI_KEY
//   ALLOWED_ORIGIN

import { kv } from '@vercel/kv'

// ✅ [Fix] সঠিক endpoint — cricket completed matches
const CRICKET_RESULTS_API  = 'https://cricket-live-line1.p.rapidapi.com/recentMatches'
// ✅ [Bug Fix — v2] `/api/events/schedule?date=...` returns a hard 404
// (confirmed via production Vercel logs: "RapidAPI 404 for football").
// The API author's own FAQ (github.com/lacassef/recodexapicodeexamples)
// documents the real date-based pattern as day/month/year PATH segments,
// not a query string — e.g. `/api/category/{id}/events/{day}/{month}/{year}`.
// Our own `/api/matches/live` (in api/live-score.js) already works and
// confirms the base resource path is `/api/matches/...`, so the
// non-live/date-scoped sibling is `/api/matches/{day}/{month}/{year}`.
const FOOTBALL_RESULTS_API = 'https://allsportsapi2.p.rapidapi.com/api/matches'
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
      // ✅ [Bug Fix] Previously this only queried TODAY's schedule — if no
      // football match had finished yet today (e.g. early morning, as in
      // the reported screenshot showing "06:42 AM"), the Results tab had
      // nothing to show even though yesterday's finished matches existed.
      // Now we fetch today + yesterday and merge, so "recent results"
      // actually has something recent to show most of the time.
      // ✅ [Bug Fix] Path-segment date format (day/month/year), not a
      // ?date= query string — see FOOTBALL_RESULTS_API comment above.
      const todayDate     = new Date()
      const yesterdayDate = new Date(Date.now() - 86400000)
      const toPath = (d) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`
      const todayPath      = toPath(todayDate)
      const yesterdayPath  = toPath(yesterdayDate)

      const headers = {
        'x-rapidapi-key':  process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': host,
      }

      const [todayRes, yesterdayRes] = await Promise.all([
        fetch(`${fetchUrl}/${todayPath}`,     { headers, signal: AbortSignal.timeout(10000) }),
        fetch(`${fetchUrl}/${yesterdayPath}`, { headers, signal: AbortSignal.timeout(10000) }),
      ])

      // Use whichever succeeded; if both failed, fall through to the
      // existing !response.ok error-handling path below using todayRes.
      response = todayRes.ok ? todayRes : (yesterdayRes.ok ? yesterdayRes : todayRes)

      if (todayRes.ok || yesterdayRes.ok) {
        const [todayJson, yesterdayJson] = await Promise.all([
          todayRes.ok     ? todayRes.json().catch(() => null)     : Promise.resolve(null),
          yesterdayRes.ok ? yesterdayRes.json().catch(() => null) : Promise.resolve(null),
        ])
        const todayItems     = extractItems(todayJson)
        const yesterdayItems = extractItems(yesterdayJson)
        const merged  = [...todayItems, ...yesterdayItems]
        const data    = normalizeResults(merged, sport, /* alreadyExtracted */ true)

        await kv.set(cacheKey, { _data: data, _updatedAt: new Date().toISOString() }, { ex: CACHE_TTL })
        res.setHeader('Cache-Control', EDGE_CACHE)
        return res.status(200).json({ source: 'api', data })
      }
    }

    if (!response.ok) {
      // ✅ [Debug aid] Log the exact URL attempted — if this endpoint
      // guess also turns out wrong, the Vercel log will show precisely
      // which path 404'd instead of just a bare status code.
      console.error(`[match-results] RapidAPI ${response.status} for ${sport} — url: ${response.url}`)
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

// ✅ [Bug Fix] Object-as-string / object-as-number safety — same pattern
// as api/live-score.js. allsportsapi2's SofaScore-style shape nests team
// names as { name: '...' } and scores as { current, display, ... }
// instead of flat strings/numbers; rendering those objects directly in
// React crashes the component. These guarantee a safe primitive either way.
function toText(val, fallback = '') {
  if (val === null || val === undefined) return fallback
  if (typeof val === 'string' || typeof val === 'number') return String(val)
  if (typeof val === 'object') return val.name ?? val.text ?? val.value ?? val.title ?? val.description ?? fallback
  return fallback
}
function scoreValue(val) {
  if (val === null || val === undefined) return null
  if (typeof val === 'number' || typeof val === 'string') return val
  if (typeof val === 'object') return val.current ?? val.display ?? val.total ?? val.value ?? null
  return null
}

// ✅ [Bug Fix] Extract the events array regardless of envelope shape.
// A "schedule" endpoint from this API family sometimes groups events by
// tournament (`{ tournaments: [{ events: [...] }] }`) instead of a flat
// top-level array — the earlier version only checked flat shapes, so a
// grouped response silently produced zero items.
function extractItems(raw) {
  if (!raw) return []
  if (Array.isArray(raw))                return raw
  if (Array.isArray(raw?.data))          return raw.data
  if (Array.isArray(raw?.results))       return raw.results
  if (Array.isArray(raw?.response))      return raw.response
  if (Array.isArray(raw?.events))        return raw.events
  if (Array.isArray(raw?.matches))       return raw.matches
  if (Array.isArray(raw?.tournaments)) {
    // grouped-by-tournament shape — flatten
    return raw.tournaments.flatMap(t => t.events || t.matches || [])
  }
  return []
}

function normalizeResults(raw, sport, alreadyExtracted = false) {
  const items = alreadyExtracted ? raw : extractItems(raw)

  if (sport === 'cricket') {
    return items.map(m => ({
      id:        m.match_id  || m.id,
      name:      m.title     || m.name || `${toText(m.team_a, 'Team 1')} vs ${toText(m.team_b, 'Team 2')}`,
      teams:     [toText(m.team_a, 'Team 1'), toText(m.team_b, 'Team 2')],
      score:     buildCricketScore(m),
      status:    toText(m.match_status || m.toss || m.need_run_ball, 'Finished'),
      format:    detectFormat(m.match_type || m.title || m.series || ''),
      matchType: toText(m.series || m.match_type, ''),
      venue:     toText(m.venue),
      date:      m.match_date || m.date || '',
    }))
  }

  return items
    .map(m => {
      let homeFromResult = null
      let awayFromResult = null
      if (typeof m.event_final_result === 'string' && m.event_final_result.includes('-')) {
        const parts = m.event_final_result.split('-').map(p => p.trim())
        homeFromResult = parts[0] || null
        awayFromResult = parts[1] || null
      }
      return {
        id:        m.event_key       || m.id,
        homeTeam:  toText(m.event_home_team || m.homeTeam || m.home?.name, 'Home'),
        awayTeam:  toText(m.event_away_team || m.awayTeam || m.away?.name, 'Away'),
        homeScore: homeFromResult ?? scoreValue(m.homeScore ?? m.home?.score),
        awayScore: awayFromResult ?? scoreValue(m.awayScore ?? m.away?.score),
        tournament:toText(m.league_name || m.tournament, ''),
        status:    toText(m.event_status || m.status, 'FT'),
        date:      m.event_date || m.date || '',
        isLive:    false,
        // raw status kept for the finished-only filter below
        _rawStatus: (typeof m.event_status === 'object' ? m.event_status?.type : m.event_status)
                    ?? (typeof m.status === 'object' ? m.status?.type : m.status) ?? '',
      }
    })
    // ✅ [Bug Fix] A "schedule" endpoint returns ALL of a day's matches —
    // scheduled, live, AND finished — mixed together. The Results tab
    // should only ever show matches that have actually finished;
    // otherwise scheduled/not-started fixtures show up with blank scores
    // looking like a bug. Keep anything that doesn't look explicitly
    // not-started/live (defaults to keeping the match if status is
    // ambiguous, rather than risking hiding genuine results).
    .filter(m => {
      const s = String(m._rawStatus || m.status || '').toLowerCase()
      const isNotStarted = /not.?started|scheduled|^ns$|^upcoming$/.test(s)
      const isLiveStatus = /inprogress|live|1st half|2nd half|halftime/.test(s)
      return !isNotStarted && !isLiveStatus
    })
    .map(({ _rawStatus, ...rest }) => rest)
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
