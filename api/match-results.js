// api/match-results.js
// ✅ Added Debug Mode & URL Auto-Fallback

import { kv } from '@vercel/kv'

const CRICKET_RESULTS_API  = 'https://cricket-live-line1.p.rapidapi.com/recentMatches'
const CRICKET_HOST         = 'cricket-live-line1.p.rapidapi.com'
const FOOTBALL_HOST        = 'allsportsapi2.p.rapidapi.com'

const CACHE_TTL  = 3600  
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
  const isDebug     = req.query.debug === '1'
  const cacheHeader = bypassCache ? 'no-store' : EDGE_CACHE
  const cacheKey = `match-results:${sport}`

  try {
    const cached = bypassCache ? null : await kv.get(cacheKey)
    if (cached && !isDebug) {
      res.setHeader('Cache-Control', cacheHeader)
      return res.status(200).json({ source: 'cache', data: cached._data || cached })
    }

    if (!process.env.RAPIDAPI_KEY) {
      return res.status(503).json({ error: 'RAPIDAPI_KEY not configured' })
    }

    let response
    let data = []

    if (sport === 'cricket') {
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
        data = normalizeResults(raw, sport)
      }
      
    } else {
      const pad = (n) => String(n).padStart(2, '0')
      const headers = {
        'x-rapidapi-key':  process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': FOOTBALL_HOST,
      }
      const sleep = (ms) => new Promise(r => setTimeout(r, ms))

      const MAX_DAYS_BACK = 3
      let collected  = []
      let lastRes    = null

      for (let i = 0; i < MAX_DAYS_BACK; i++) {
        const d = new Date(Date.now() - (i * 86400000)) 
        const dateDDMMYYYY = `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
        
        // 1. AllSportsAPI2 Endpoint Format (Path)
        let url = `https://allsportsapi2.p.rapidapi.com/api/football/matches/${dateDDMMYYYY}`
        
        let r
        try {
          r = await fetch(url, { headers, signal: AbortSignal.timeout(4000) })
          if(r.status === 404) {
             // 2. Fallback to Query Parameter if Path fails
             const dateYYYYMMDD = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
             url = `https://allsportsapi2.p.rapidapi.com/api/football/matches?date=${dateYYYYMMDD}`
             r = await fetch(url, { headers, signal: AbortSignal.timeout(4000) })
          }
        } catch {
          continue
        }
        
        lastRes = r

        if (r.status === 429) {
          await sleep(600)
          continue
        }
        if (!r.ok) continue

        const json  = await r.json().catch(() => null)

        // ✨✨✨ DEBUG MODE (র-ডাটা দেখার জন্য) ✨✨✨
        if (isDebug) {
           return res.status(200).json({ 
             source: 'debug_mode', 
             attemptedUrl: url, 
             apiStatus: r.status, 
             rawData: json 
           })
        }

        const items = extractItems(json)
        if (items.length) collected = collected.concat(items)
        if (collected.length >= 12) break
        await sleep(250) 
      }

      response = lastRes
      if (collected.length) {
        data = normalizeResults(collected, sport, true)
      }
    }

    if (!response || !response.ok) {
      if(isDebug) return res.status(200).json({ source: 'error', status: response?.status })
      const stale = await kv.get(cacheKey).catch(() => null)
      if (stale) {
        res.setHeader('Cache-Control', cacheHeader)
        return res.status(200).json({ source: 'stale_cache', data: stale._data || stale })
      }
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ source: 'error_fallback', data: [], error: 'Failed to fetch' })
    }

    if (data.length > 0 && !isDebug) {
      await kv.set(cacheKey, { _data: data, _updatedAt: new Date().toISOString() }, { ex: CACHE_TTL })
    }

    res.setHeader('Cache-Control', cacheHeader)
    return res.status(200).json({ source: 'api', data })

  } catch (error) {
    if (isDebug) return res.status(200).json({ source: 'catch_error', error: error.message })
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

function scoreValue(val) {
  if (val === null || val === undefined) return null
  if (typeof val === 'number' || typeof val === 'string') return val
  if (typeof val === 'object') return val.current ?? val.display ?? val.total ?? val.value ?? null
  return null
}

function extractItems(raw) {
  if (!raw) return []
  if (Array.isArray(raw))                return raw
  if (Array.isArray(raw?.data))          return raw.data
  if (Array.isArray(raw?.results))       return raw.results
  if (Array.isArray(raw?.response))      return raw.response
  if (Array.isArray(raw?.events))        return raw.events
  if (Array.isArray(raw?.matches))       return raw.matches
  if (Array.isArray(raw?.tournaments)) {
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
        _rawStatus: (typeof m.event_status === 'object' ? m.event_status?.type : m.event_status)
                    ?? (typeof m.status === 'object' ? m.status?.type : m.status) ?? '',
      }
    })
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