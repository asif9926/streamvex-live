// api/football-upcoming.js — Upcoming football fixtures
// Blueprint: football-data.org → Vercel KV (6hr cache)
// ✅ [Update #1] Edge Cache: s-maxage=21600, stale-while-revalidate=43200
//
// Env vars required:
//   FOOTBALL_DATA_API_KEY

import { kv } from '@vercel/kv'

const FD_BASE    = 'https://api.football-data.org/v4'
const CACHE_TTL  = 21600   // 6 hours
const EDGE_CACHE = 's-maxage=21600, stale-while-revalidate=43200'  // ✅ [Update #1]

const SUPPORTED_LEAGUES = {
  CL:  2001, WC: 2000, PL: 2021,
  PD:  2014, BL1: 2002, SA: 2019,
  FL1: 2015, PPL: 2017, DED: 2003, BSA: 2013,
}

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://streamvex-live.vercel.app'
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' })

  const leagueCode    = (req.query.league || 'CL').toUpperCase()
  const competitionId = SUPPORTED_LEAGUES[leagueCode]
  if (!competitionId) {
    return res.status(400).json({ error: `Unknown league: ${leagueCode}` })
  }

  const cacheKey = `football-upcoming:${leagueCode}`

  try {
    // ── 1. KV Cache (6hr) ─────────────────────────────
    const cached = await kv.get(cacheKey)
    if (cached) {
      res.setHeader('Cache-Control', EDGE_CACHE)
      return res.status(200).json({ source: 'cache', data: cached._data || cached })
    }

    if (!process.env.FOOTBALL_DATA_API_KEY) {
      return res.status(503).json({ error: 'FOOTBALL_DATA_API_KEY not configured' })
    }

    // ── 2. football-data.org — SCHEDULED fixtures ────
    const response = await fetch(`${FD_BASE}/competitions/${competitionId}/matches?status=SCHEDULED`, {
      headers: {
        'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY,
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      if (response.status === 429) {
        const stale = await kv.get(cacheKey).catch(() => null)
        if (stale) {
          res.setHeader('Cache-Control', EDGE_CACHE)
          return res.status(200).json({ source: 'stale_cache', data: stale._data || stale })
        }
      }
      throw new Error(`football-data.org ${response.status}`)
    }

    const raw = await response.json()

    // Sort by date ASC — next match first
    const sorted = (raw.matches || []).sort(
      (a, b) => new Date(a.utcDate) - new Date(b.utcDate)
    )

    const data = sorted.map(m => ({
      id:        m.id,
      name:      `${m.homeTeam?.name || '?'} vs ${m.awayTeam?.name || '?'}`,
      homeTeam:  m.homeTeam?.name || '',
      awayTeam:  m.awayTeam?.name || '',
      status:    m.status,
      date:      formatDate(m.utcDate),
      time:      formatTime(m.utcDate),
      startDate: m.utcDate,
      tournament:raw.competition?.name || leagueCode,
      league:    leagueCode,
      venue:     m.venue || '',
      round:     m.matchday ? `Matchday ${m.matchday}` : '',
      isLive:    false,
    }))

    // ── 3. KV save ────────────────────────────────────
    await kv.set(cacheKey, { _data: data, _updatedAt: new Date().toISOString() }, { ex: CACHE_TTL })

    res.setHeader('Cache-Control', EDGE_CACHE)
    return res.status(200).json({ source: 'api', data })

  } catch (error) {
    console.error('[football-upcoming] Error:', error.message)
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
  return isNaN(d) ? '' : d.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })
}
