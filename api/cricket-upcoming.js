// api/cricket-upcoming.js — Upcoming cricket matches
// Blueprint: notable-series aggregation → Vercel KV (12hr cache)
//
// ⚠️ [Architecture Change] আগে এই endpoint CricAPI'র generic
// `/v1/matches` ফিড থেকে raw matches টেনে filter করত। কিন্তু ধরা পড়েছে
// (ব্যবহারকারীর debug output দিয়ে) যে ওই ফিড এর কভারেজ সীমিত — মোট মাত্র
// ~200 entry, বেশিরভাগই recently-added domestic/franchise league (Syed
// Mushtaq Ali Trophy, Lanka Premier League), আর ইতিমধ্যে চলমান bilateral
// tour (যেমন Bangladesh tour of Zimbabwe, 2026) এর matches ওই ফিডে
// থাকেই না — MAX_PAGES বাড়িয়েও লাভ হতো না, কারণ ডেটা নিজেই নেই।
//
// Fix: এখন এই endpoint নিজে raw match ফিড থেকে filter করে না। বরং
// cricket-series.js যে already-notable-filtered series list বানায়
// (30-page পূর্ণ কভারেজ সহ, 24hr cache) সেটা পড়ে, তার মধ্যে চলমান/আসন্ন
// সিরিজগুলো বেছে নেয়, আর প্রতিটার আসল match list আনে series_info দিয়ে
// (api/_lib/cricapi.js — series-matches.js এর সাথে SHARED cache key,
// তাই একই সিরিজ দুই ফিচারে লাগলে দ্বিতীয়বার আলাদা call লাগে না)।
// ফলাফল: World Cup, bilateral tour, franchise league — সবকিছুর matches
// এখন নির্ভরযোগ্যভাবে দেখা যাবে, শুধু যেটা CricAPI'র সীমিত /matches ফিডে
// কাকতালীয়ভাবে ছিল তা না।
//
// Env vars required:
//   CRICAPI_KEY

import { kv } from '@vercel/kv'
import { resolveSeriesDates } from './_lib/cricketFilters.js'
import { fetchSeriesMatches } from './_lib/cricapi.js'

const SERIES_CACHE_KEY          = 'cricket-series:v9'   // cricket-series.js এর cache — এখানে re-fetch করা হয় না, শুধু পড়া হয়
const SERIES_MATCH_CACHE_PREFIX = 'series-matches:v2:'  // series-matches.js এর সাথে SHARED prefix
const SERIES_MATCH_TTL          = 3600                  // series-matches.js এর TTL এর সাথে সমান রাখা হলো

// ⚠️ [Budget] প্রতি candidate series এ (cache miss হলে) 1 CricAPI call।
// cricket-series.js (~30/day, 24hr cache) এর সাথে এই বাজেট মিলিয়ে 100/day
// এর নিচে রাখতে 15 এ cap করা হলো — 2 refresh/day (12hr TTL) হিসেবে
// worst-case ~30/day, যা series-matches.js এর on-demand call এর জন্যও
// যথেষ্ট headroom রাখে।
const MAX_SERIES_TO_SCAN = 15

// ⚠️ [Fix] 6hr → 12hr — same quota reasoning হিসেবে
const CACHE_TTL   = 43200   // 12 hours
const EDGE_CACHE  = 's-maxage=43200, stale-while-revalidate=86400'

export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://streamvex-live.vercel.app'
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' })

  // ✅ [Debug] ?debug=1 — cache বাইপাস করে candidate series selection ও
  // aggregation এর প্রতিটা ধাপ দেখায়। ব্যবহার:
  // yoursite.vercel.app/api/cricket-upcoming?debug=1
  const debugMode = req.query.debug === '1'
  // ✅ v4 → v5: SERIES_CACHE_KEY v8→v9 (qualifier-exclusion filter বদলেছে)
  const cacheKey  = 'cricket-upcoming:v5'

  try {
    // ── 1. KV Cache (12hr) ─────────────────────────────
    const cached = debugMode ? null : await kv.get(cacheKey)
    if (cached) {
      res.setHeader('Cache-Control', EDGE_CACHE)
      return res.status(200).json({ source: 'cache', data: cached._data || cached })
    }

    if (!process.env.CRICAPI_KEY) {
      return res.status(503).json({ error: 'CRICAPI_KEY not configured' })
    }

    // ── 2. cricket-series.js এর cache পড়ো (re-fetch না, শুধু read) ──
    const seriesCache   = await kv.get(SERIES_CACHE_KEY)
    const notableSeries = seriesCache?._data || seriesCache || []

    if (!notableSeries.length) {
      // fresh deploy এ cricket-series.js এখনো একবারও চলেনি — graceful empty,
      // error না। series তালিকা populate হলে পরের refresh এ ঠিক হয়ে যাবে।
      return res.status(200).json({ source: 'no_series_cache', data: [] })
    }

    // ── 3. চলমান/আসন্ন সিরিজ বেছে নাও, শুরুর তারিখ অনুযায়ী কাছেরটা আগে ──
    const now = Date.now()
    const candidates = notableSeries
      .map(s => ({ series: s, ...resolveSeriesDates(s.name, s.startDate, s.endDate) }))
      .filter(s => !s.end || s.end.getTime() >= now)
      .sort((a, b) => (a.start?.getTime() ?? Infinity) - (b.start?.getTime() ?? Infinity))
      .slice(0, MAX_SERIES_TO_SCAN)
      .map(s => s.series)

    // ── 4. প্রতিটা candidate series এর match list আনো ────────────
    let allMatches = []
    let cricapiCallsMade = 0
    for (const s of candidates) {
      const perSeriesKey = `${SERIES_MATCH_CACHE_PREFIX}${s.id}`
      let seriesMatchData = await kv.get(perSeriesKey)

      if (!seriesMatchData) {
        try {
          const { data } = await fetchSeriesMatches(s.id, process.env.CRICAPI_KEY)
          seriesMatchData = { _data: data, _updatedAt: new Date().toISOString() }
          await kv.set(perSeriesKey, seriesMatchData, { ex: SERIES_MATCH_TTL })
          cricapiCallsMade++
        } catch (err) {
          // এক সিরিজ fail করলে বাকি সব বাদ দেওয়ার দরকার নেই — skip করে এগোও
          console.error(`[cricket-upcoming] fetchSeriesMatches(${s.id}) failed:`, err.message)
          continue
        }
      }

      const matches = (seriesMatchData?._data || []).filter(m => m.isUpcoming)
      allMatches.push(...matches)
    }

    allMatches.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))

    if (debugMode) {
      return res.status(200).json({
        debug: true,
        notableSeriesTotal:  notableSeries.length,
        candidatesScanned:   candidates.length,
        cricapiCallsMade,
        totalUpcomingMatches: allMatches.length,
        candidateSeriesSample: candidates.slice(0, 15).map(s => ({ id: s.id, name: s.name })),
        sample: allMatches.slice(0, 20).map(m => ({
          name: m.name, seriesName: m.seriesName, startDate: m.startDate,
        })),
      })
    }

    const data = allMatches.map(m => ({
      id:        m.id,
      name:      m.name,
      matchType: m.matchType,
      format:    m.format,
      status:    m.status,
      venue:     m.venue,
      date:      m.date,
      time:      m.time,
      startDate: m.startDate,
      teams:     m.teams || [],
      series:    m.seriesName || '',
    }))

    // ── 5. KV save (12hr) ──────────────────────────────
    await kv.set(cacheKey, { _data: data, _updatedAt: new Date().toISOString() }, { ex: CACHE_TTL })

    res.setHeader('Cache-Control', EDGE_CACHE)
    return res.status(200).json({ source: 'api', data })

  } catch (error) {
    console.error('[cricket-upcoming] Error:', error.message)
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