// api/cricket-series.js — Cricket series/tournament list
// Blueprint: CricAPI → Vercel KV (24hr cache)
// ✅ [Update #1] Edge Cache: s-maxage=86400, stale-while-revalidate=172800
//
// Env vars required:
//   CRICAPI_KEY — cricapi.com থেকে free API key নাও

import { kv } from '@vercel/kv'
import { isNotableCricket, resolveSeriesDates } from './_lib/cricketFilters.js'

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

  // ✅ [Debug] ?debug=1 — বাস্তবে CricAPI কী ডেটা দিচ্ছে সেটা সরাসরি দেখার
  // জন্য। ক্যাশ বাইপাস করে, filter-এর প্রতিটা ধাপে কতগুলো টিকল তার sample
  // দেখায়। ব্রাউজারে খুলুন: yoursite.vercel.app/api/cricket-series?debug=1
  const debugMode = req.query.debug === '1'
  // ✅ [Fix] v6 → v7: v6 এর KV cache-এ ভুল date-filter এর কারণে empty []
  // ফলাফল 24hr এর জন্য stuck হয়ে ছিল। version bump না করলে deploy করার
  // পরও পুরনো empty cache-ই serve হতো যতক্ষণ না TTL নিজে থেকে expire হয়।
  // ✅ [Fix] v7 → v8: FAMOUS_LEAGUES থেকে T20 Blast/Vitality Blast বাদ
  // দেওয়া হয়েছে (domestic county league, internationally famous না) —
  // version bump না করলে পুরনো cache-এ এখনো সেগুলো থেকে যেত 24hr পর্যন্ত।
  const cacheKey  = 'cricket-series:v8'

  try {
    // ── 1. KV Cache (24hr) ────────────────────────────
    const cached = debugMode ? null : await kv.get(cacheKey)
    if (cached) {
      res.setHeader('Cache-Control', EDGE_CACHE)
      return res.status(200).json({ source: 'cache', data: cached._data || cached })
    }

    if (!process.env.CRICAPI_KEY) {
      return res.status(503).json({ error: 'CRICAPI_KEY not configured' })
    }

    // এই endpoint দিনে মাত্র ১ বার refresh হয় (২৪ ঘণ্টা cache), তাই বেশি
    // পেজ fetch করাও সস্তা (৩০ পেজ = দিনে মাত্র ≤৩০ call)।
    const MAX_PAGES = 30
    let all      = []
    let pageSize = null
    for (let page = 0; page < MAX_PAGES; page++) {
      const offset = page * (pageSize || 25)
      const url = `${CRICAPI_URL}?apikey=${process.env.CRICAPI_KEY}&offset=${offset}`
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
      if (!response.ok) {
        if (page === 0) throw new Error(`CricAPI ${response.status}`)
        break
      }
      const raw = await response.json()
      if (raw.status !== 'success') {
        if (page === 0) throw new Error(raw.reason || 'CricAPI error')
        break
      }
      const batch = raw.data || []
      if (pageSize === null) pageSize = batch.length || 25
      all = all.concat(batch)
      if (batch.length === 0 || batch.length < pageSize) break
    }

    // ✅ [Debug] filter-এর প্রতিটা ধাপ আলাদা করে রাখা হলো যাতে debug mode-এ
    // প্রতিটা ধাপে কতগুলো টিকল তা আলাদাভাবে দেখানো যায়।
    const byName = all.filter(s => isNotableCricket(s.name))
    const now    = Date.now()
    // ⚠️ [Bug Fix] আগে সরাসরি `new Date(s.endDate)` করা হতো — কিন্তু CricAPI
    // অনেক সিরিজের endDate বছর ছাড়া পাঠায় (e.g. "Apr 11"), যেটা JS
    // চুপচাপ current year ধরে নিয়ে ভুল (প্রায়ই অতীত) তারিখ বানিয়ে ফেলত,
    // ফলে সব future সিরিজও "শেষ হয়ে গেছে" ধরে বাদ পড়ে যাচ্ছিল
    // (afterDateFilter সবসময় 0)। resolveSeriesDates() সিরিজের নাম থেকে
    // আসল বছর বের করে সেটা দিয়ে সঠিকভাবে parse করে।
    const byDate = byName.filter(s => {
      if (!s.endDate) return true
      const { end } = resolveSeriesDates(s.name, s.startDate, s.endDate)
      return !end || end.getTime() >= now
    })

    if (debugMode) {
      const sample = (arr) => arr.slice(0, 20).map(s => ({ name: s.name, startDate: s.startDate, endDate: s.endDate }))
      return res.status(200).json({
        debug: true,
        totalRawFetched:  all.length,
        afterNameFilter:  byName.length,
        afterDateFilter:  byDate.length,
        sampleRaw:        sample(all),
        sampleAfterName:  sample(byName),
        sampleAfterDate:  sample(byDate),
      })
    }

    const data = byDate
      .map(s => ({
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

    // Sort: চলমান আগে, তারপর আসন্ন (কাছের তারিখ আগে)
    // ⚠️ [Bug Fix] এখানেও একই year-less date সমস্যা ছিল — সরাসরি
    // `new Date(s.startDate/endDate)` না করে resolveSeriesDates() দিয়ে
    // year-corrected তারিখ ব্যবহার করা হচ্ছে, নাহলে "ongoing" চেক আর
    // sort order ভুল হয়ে যেত।
    data.sort((a, b) => {
      const rank = (s) => {
        const { start, end } = resolveSeriesDates(s.name, s.startDate, s.endDate)
        if (start && end && start.getTime() <= now && now <= end.getTime()) return 0  // ongoing
        return 1   // upcoming
      }
      const ra = rank(a), rb = rank(b)
      if (ra !== rb) return ra - rb
      const da = resolveSeriesDates(a.name, a.startDate, a.endDate).start?.getTime() || 0
      const db = resolveSeriesDates(b.name, b.startDate, b.endDate).start?.getTime() || 0
      return da - db
    })

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