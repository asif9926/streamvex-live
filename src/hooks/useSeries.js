// useSeries.js — Cricket series + Football leagues hook
// Blueprint: src/hooks/useSeries.js
// Cricket API:  /api/cricket-series  → CricAPI     → Vercel KV (24hr cache)
// Football API: /api/football-series → football-data.org → Vercel KV (24hr cache)
// Used by: Tournament page (Series tab), SeriesList component

import useSWR from 'swr'

const fetcher = (url) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  })

function normalizeArray(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.data)) return raw.data
  if (Array.isArray(raw?.series)) return raw.series
  if (Array.isArray(raw?.competitions)) return raw.competitions  // football-data.org format
  return []
}

/**
 * useSeries — Cricket series or Football league list
 *
 * @param {'cricket'|'football'} sport
 * @param {object} options
 *   @param {string}  league — Football league code (default: 'CL' = Champions League)
 *   @param {boolean} pause  — true হলে fetch করবে না
 *
 * @returns {{
 *   series:    object[],   — series/league list
 *   loading:   boolean,
 *   isError:   boolean,
 *   refresh:   () => void,
 * }}
 *
 * @example
 * // Cricket series
 * const { series, loading } = useSeries('cricket')
 *
 * // Football leagues
 * const { series: leagues, loading } = useSeries('football', { league: 'PL' })
 */
export function useSeries(sport = 'cricket', { league = 'CL', pause = false } = {}) {
  // Blueprint exact endpoints:
  // cricket  → /api/cricket-series
  // football → /api/football-series?league=CL
  const endpoint = sport === 'cricket'
    ? '/api/cricket-series'
    : `/api/football-series?league=${encodeURIComponent(league)}`

  const { data, error, isLoading, mutate } = useSWR(
    pause ? null : endpoint,
    fetcher,
    {
      // Blueprint: Vercel KV 24hr cache → client এ বেশি frequent না
      revalidateOnFocus:  false,
      refreshWhenHidden:  false,
      refreshWhenOffline: false,
      dedupingInterval:   3_600_000,   // 1hr — series fixtures দিনে একবার বদলায়
      errorRetryCount:    2,
    }
  )

  return {
    series:    normalizeArray(data),
    loading:   isLoading,
    isLoading,
    isError:   !!error,
    error,
    hasSeries: normalizeArray(data).length > 0,
    refresh:   mutate,
  }
}
