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
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://streamvex-live.vercel.app'
  res.setHeader('Access-Control-Allow-Origin',  allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' })

  const sport = (req.query.sport || 'cricket').toLowerCase()
  if (!['cricket', 'football'].includes(sport)) {
    return res.status(400).json({ error: 'Invalid sport. Use cricket or football.' })
  }

  // ✅ [Debug aid] ?nocache=1 skips BOTH the KV read and the edge
  // Cache-Control header, so a stale cached (e.g. pre-fix) response can't
  // hide a real fix behind a 1-hour TTL. Handy for verifying a deploy
  // directly from the browser: /api/match-results?sport=football&nocache=1
  const bypassCache = req.query.nocache === '1' || req.query.nocache === 'true'
  const cacheHeader = bypassCache ? 'no-store' : EDGE_CACHE   // ✅ don't let a diagnostic call get cached either

  // ✅ [Debug aid] ?probe=1 (football only) tries several plausible
  // endpoint URL patterns in parallel and reports status + response shape
  // for each — so instead of guessing one endpoint per deploy-and-test
  // cycle, we get several data points from a single request:
  // /api/match-results?sport=football&probe=1
  if (req.query.probe === '1' && sport === 'football') {
    if (!process.env.RAPIDAPI_KEY) {
      return res.status(503).json({ error: 'RAPIDAPI_KEY not configured' })
    }
    const d = new Date()
    const day = d.getUTCDate(), month = d.getUTCMonth() + 1, year = d.getUTCFullYear()
    const pad = (n) => String(n).padStart(2, '0')
    const headers = { 'x-rapidapi-key': process.env.RAPIDAPI_KEY, 'x-rapidapi-host': FOOTBALL_HOST }
    const base = 'https://allsportsapi2.p.rapidapi.com'
    const candidates = [
      { label: 'matches/d/m/y',          url: `${base}/api/matches/${day}/${month}/${year}` },
      { label: 'matches/dd/mm/y',        url: `${base}/api/matches/${pad(day)}/${pad(month)}/${year}` },
      { label: 'scheduled-events/d/m/y', url: `${base}/api/scheduled-events/${day}/${month}/${year}` },
      { label: 'events/d/m/y',           url: `${base}/api/events/${day}/${month}/${year}` },
      { label: 'matches/date-iso',       url: `${base}/api/matches/${year}-${pad(month)}-${pad(day)}` },
      { label: 'matches/live (control)', url: `${base}/api/matches/live` },
    ]
    const results = await Promise.all(candidates.map(async (c) => {
      try {
        const r    = await fetch(c.url, { headers, signal: AbortSignal.timeout(8000) })
        const text = await r.text()
        let json = null, parseError = null
        try { json = JSON.parse(text) } catch (e) { parseError = e.message }
        return {
          label:  c.label,
          url:    c.url,
          status: r.status,
          topLevelKeys: json && typeof json === 'object' ? Object.keys(json) : null,
          isArray: Array.isArray(json),
          arrayLength: Array.isArray(json) ? json.length : (Array.isArray(json?.events) ? json.events.length : null),
          bodyPreview: text.slice(0, 300),
        }
      } catch (e) {
        return { label: c.label, url: c.url, error: e.message }
      }
    }))
    return res.status(200).json({ probe: true, results })
  }

  const cacheKey = `match-results:${sport}`

  try {
    // ── 1. KV Cache ───────────────────────────────────
    const cached = bypassCache ? null : await kv.get(cacheKey)
    if (cached) {
      res.setHeader('Cache-Control', cacheHeader)
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
      // ✅ [Bug Fix — v3] Confirmed via probe: `/api/matches/{d}/{m}/{y}`
      // IS the correct endpoint (200 OK, real array shape) — the earlier
      // 404s were from wrong paths, now fixed. But firing 2 requests in
      // parallel (today + yesterday) triggered a 429 "rate limit per
      // second exceeded" on the RapidAPI Basic plan. Also, July is
      // off-season for most major leagues (confirmed: /matches/live only
      // showed "Club Friendly Games"), so a single day is often genuinely
      // empty — not a bug, just sparse fixtures. Fix: fetch sequentially
      // (one at a time, never parallel) with a small delay, and look back
      // up to MAX_DAYS_BACK days, stopping as soon as we find results — this
      // respects the rate limit AND meaningfully improves the odds of
      // "recent results" actually having something to show.
      const toPath = (d) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`
      const headers = {
        'x-rapidapi-key':  process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': host,
      }
      const sleep = (ms) => new Promise(r => setTimeout(r, ms))

      const MAX_DAYS_BACK = 3   // keeps worst-case (all timeouts) comfortably under Vercel's 15s function limit
      let collected  = []
      let lastRes    = null
      let daysChecked = []

      for (let i = 0; i < MAX_DAYS_BACK; i++) {
        const d   = new Date(Date.now() - i * 86400000)
        const url = `${fetchUrl}/${toPath(d)}`
        let r
        try {
          r = await fetch(url, { headers, signal: AbortSignal.timeout(4000) })
        } catch {
          continue
        }
        lastRes = r
        daysChecked.push({ url, status: r.status })

        if (r.status === 429) {
          // Rate limited — back off a bit longer before the next attempt
          await sleep(600)
          continue
        }
        if (!r.ok) continue

        const json  = await r.json().catch(() => null)
        const items = extractItems(json)
        if (items.length) collected = collected.concat(items)

        // Stop early once we have a reasonable amount — saves API quota
        if (collected.length >= 12) break
        await sleep(250)   // small gap between sequential calls, stays well under per-second limits
      }

      response = lastRes

      if (collected.length || (lastRes && lastRes.ok)) {
        const beforeFilterN = collected.length
        const data = normalizeResults(collected, sport, /* alreadyExtracted */ true)

        await kv.set(cacheKey, { _data: data, _updatedAt: new Date().toISOString() }, { ex: CACHE_TTL })
        res.setHeader('Cache-Control', cacheHeader)

        // ✅ [Debug aid] With ?nocache=1, show exactly how many days were
        // checked and what each returned — no more guessing blind.
        const payload = { source: 'api', data }
        if (bypassCache) {
          payload._debug = {
            daysChecked,
            rawItemCount:     beforeFilterN,
            afterFilterCount: data.length,
            sampleRawItem:    collected[0] ?? null,
          }
        }
        return res.status(200).json(payload)
      }
    }

    if (!response.ok) {
      // ✅ [Debug aid] Log the exact URL attempted — if this endpoint
      // guess also turns out wrong, the Vercel log will show precisely
      // which path 404'd instead of just a bare status code.
      console.error(`[match-results] RapidAPI ${response.status} for ${sport} — url: ${response.url}`)
      const stale = await kv.get(cacheKey).catch(() => null)
      if (stale) {
        res.setHeader('Cache-Control', cacheHeader)
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
