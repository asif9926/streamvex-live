// api/cricket-series.js — Cricket series/tournament list
// Blueprint: CricAPI → Vercel KV (24hr cache)
// ✅ [Update #1] Edge Cache: s-maxage=86400, stale-while-revalidate=172800
//
// Env vars required:
//   CRICAPI_KEY — cricapi.com থেকে free API key নাও

import { kv } from '@vercel/kv'

const CRICAPI_URL = 'https://api.cricapi.com/v1/series'
const CACHE_TTL   = 86400   // 24 hours
const EDGE_CACHE  = 's-maxage=86400, stale-while-revalidate=172800'  // ✅ [Update #1]

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://streamvex-live.vercel.app'
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' })

  const cacheKey = 'cricket-series'

  try {
    // ── 1. KV Cache (24hr) ────────────────────────────
    const cached = await kv.get(cacheKey)
    if (cached) {
      res.setHeader('Cache-Control', EDGE_CACHE)
      return res.status(200).json({ source: 'cache', data: cached._data || cached })
    }

    if (!process.env.CRICAPI_KEY) {
      return res.status(503).json({ error: 'CRICAPI_KEY not configured' })
    }

    // ── 2. CricAPI call ──────────────────────────────
    const url = `${CRICAPI_URL}?apikey=${process.env.CRICAPI_KEY}&offset=0`
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) throw new Error(`CricAPI ${response.status}`)

    const raw  = await response.json()

    if (raw.status !== 'success') {
      throw new Error(raw.reason || 'CricAPI error')
    }

    const data = (raw.data || []).map(s => ({
      id:         s.id,
      name:       s.name,
      startDate:  s.startDate,
      endDate:    s.endDate,
      odi:        s.odi  || 0,
      t20:        s.t20  || 0,
      test:       s.test || 0,
      squads:     s.squads || 0,
      matches:    s.matches || 0,
      matchCount: (s.odi || 0) + (s.t20 || 0) + (s.test || 0),
    }))

    // ── 3. KV save (24hr) ────────────────────────────
    await kv.set(cacheKey, { _data: data, _updatedAt: new Date().toISOString() }, { ex: CACHE_TTL })

    res.setHeader('Cache-Control', EDGE_CACHE)
    return res.status(200).json({ source: 'api', data })

  } catch (error) {
    console.error('[cricket-series] Error:', error.message)
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
