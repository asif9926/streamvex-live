// api/series-matches.js — Match list for a specific cricket series
// Blueprint: CricAPI → Vercel KV (1hr cache)
// Used by: src/hooks/useLiveScores.js → useSeriesMatches(seriesId)
//          src/components/tournament/SeriesMatches.jsx
//          api/cricket-upcoming.js (shares this SAME per-series cache key —
//          see api/_lib/cricapi.js for why)
//
// Env vars required:
//   CRICAPI_KEY
//   ALLOWED_ORIGIN

import { kv } from '@vercel/kv'
import { fetchSeriesMatches } from './_lib/cricapi.js'

// ⚠️ [Fix] 10 min → 30 min → এখন 1hr — CRICAPI_KEY এর 100 req/day limit
// cricket-series.js + cricket-upcoming.js এর সাথেও শেয়ার হয়। এই cache key
// (series-matches:v2:<id>) এখন cricket-upcoming.js ও ব্যবহার করে (একই
// সিরিজ দুই ফিচারেই লাগলে দ্বিতীয়বার আলাদা CricAPI call লাগে না)।
const CACHE_TTL           = 3600   // 1 hour
const EDGE_CACHE          = 's-maxage=3600, stale-while-revalidate=7200'

export default async function handler(req, res) {
  // ── CORS ─────────────────────────────────────────────
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://streamvex-live.vercel.app'
  res.setHeader('Access-Control-Allow-Origin',  allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' })

  // ── seriesId validation ───────────────────────────────
  const seriesId = req.query.seriesId
  if (!seriesId || typeof seriesId !== 'string' || seriesId.trim().length === 0) {
    return res.status(400).json({ error: 'seriesId query param required' })
  }

  // Basic sanity check — prevent injection via URL
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(seriesId)) {
    return res.status(400).json({ error: 'Invalid seriesId format' })
  }

  const cacheKey = `series-matches:v2:${seriesId}`

  try {
    // ── 1. KV Cache (1hr) ──────────────────────────────
    const cached = await kv.get(cacheKey)
    if (cached) {
      res.setHeader('Cache-Control', EDGE_CACHE)
      return res.status(200).json({ source: 'cache', data: cached._data || cached })
    }

    if (!process.env.CRICAPI_KEY) {
      return res.status(503).json({ error: 'CRICAPI_KEY not configured' })
    }

    // ── 2. CricAPI — series_info gives match list (shared helper) ──
    const { data, seriesName } = await fetchSeriesMatches(seriesId, process.env.CRICAPI_KEY)

    // ── 3. KV save (1hr) ───────────────────────────────
    await kv.set(cacheKey, { _data: data, _updatedAt: new Date().toISOString() }, { ex: CACHE_TTL })

    res.setHeader('Cache-Control', EDGE_CACHE)
    return res.status(200).json({ source: 'api', seriesName, data })

  } catch (error) {
    console.error('[series-matches] Error:', error.message)
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