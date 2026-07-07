// api/_lib/cricapi.js — Shared CricAPI series_info fetch + mapping
//
// আগে এই fetch+map লজিক শুধু series-matches.js এ ছিল। এখন
// cricket-upcoming.js ও একই সোর্স (per-series match list) থেকে data
// নেয় (কারণ CricAPI'র generic /v1/matches ফিড ongoing bilateral tour
// এর matches অনেক সময় বাদই রাখে — দেখুন cricket-upcoming.js এর top
// কমেন্ট)। তাই এই fetch+map ফাংশনটা shared করে দুই জায়গায় duplicate
// code এড়ানো হলো, এবং দুইটা endpoint-ই একই per-series KV cache key
// ব্যবহার করে (`series-matches:v2:<id>`) — একই সিরিজ একবার fetch হলে
// দুই ফিচারই সেই cache থেকে উপকৃত হয়, ডুপ্লিকেট CricAPI call লাগে না।

const CRICAPI_SERIES_INFO = 'https://api.cricapi.com/v1/series_info'

export function detectFormat(str = '') {
  const u = str.toUpperCase()
  if (u.includes('TEST'))              return 'Test'
  if (u.includes('ODI'))               return 'ODI'
  if (/T20|IPL|BPL|PSL|BBL/i.test(u)) return 'T20'
  if (/T10/i.test(u))                  return 'T10'
  return ''
}

export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d) ? iso : d.toLocaleDateString('en-BD', { day: '2-digit', month: 'short' })
}

export function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d) ? '' : d.toLocaleTimeString('en-BD', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka',
  })
}

/**
 * fetchSeriesMatches — CricAPI series_info থেকে একটা সিরিজের সম্পূর্ণ
 * ম্যাচ লিস্ট আনে এবং consistent shape এ map করে দেয়।
 *
 * @param {string} seriesId
 * @param {string} apiKey
 * @returns {Promise<{ data: object[], seriesName: string }>}
 */
export async function fetchSeriesMatches(seriesId, apiKey) {
  const url = `${CRICAPI_SERIES_INFO}?apikey=${apiKey}&id=${encodeURIComponent(seriesId)}`
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error(`CricAPI ${response.status}`)

  const raw = await response.json()
  if (raw.status !== 'success') throw new Error(raw.reason || 'CricAPI error')

  const seriesInfo = raw.data?.info      || {}
  const matchList  = raw.data?.matchList || []
  const now = Date.now()

  const data = matchList.map(m => {
    const startMs    = m.dateTimeGMT ? new Date(m.dateTimeGMT).getTime() : null
    const isUpcoming = startMs ? startMs > now : false
    const isLive     = m.matchStarted && !m.matchEnded

    return {
      id:         m.id,
      name:       m.name,
      matchType:  m.matchType,
      format:     detectFormat(m.matchType || m.name || ''),
      status:     m.status,
      venue:      m.venue || '',
      date:       formatDate(m.dateTimeGMT),
      time:       formatTime(m.dateTimeGMT),
      startDate:  m.dateTimeGMT || null,
      teams:      m.teams || [],
      score:      m.score || [],
      isLive,
      isUpcoming,
      isFinished: m.matchEnded || false,
      seriesId,
      seriesName: seriesInfo.name || '',
    }
  })

  // Live আগে → upcoming (কাছেরটা আগে) → finished (সাম্প্রতিকটা আগে)
  data.sort((a, b) => {
    const rank = (x) => x.isLive ? 0 : x.isUpcoming ? 1 : 2
    const ra = rank(a), rb = rank(b)
    if (ra !== rb) return ra - rb
    if (a.startDate && b.startDate) {
      const diff = new Date(a.startDate) - new Date(b.startDate)
      return ra === 2 ? -diff : diff
    }
    return 0
  })

  return { data, seriesName: seriesInfo.name || '' }
}