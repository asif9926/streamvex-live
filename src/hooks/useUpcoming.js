// useUpcoming.js — Upcoming matches hook
// Blueprint: src/hooks/useUpcoming.js
// Cricket API:  /api/cricket-upcoming  → CricAPI          → Vercel KV (6hr cache)
// Football API: /api/football-upcoming → football-data.org → Vercel KV (6hr cache)
// Used by: Tournament page (Upcoming tab), UpcomingMatchCard component

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
  if (Array.isArray(raw?.matches)) return raw.matches
  if (Array.isArray(raw?.fixtures)) return raw.fixtures    // football-data.org format
  return []
}

/**
 * useUpcoming — Upcoming cricket matches or football fixtures
 *
 * @param {'cricket'|'football'} sport
 * @param {object} options
 *   @param {string}  league — Football league code (default: 'CL')
 *   @param {number}  limit  — max items to return (default: 0 = all)
 *   @param {boolean} pause  — true হলে fetch করবে না
 *
 * @returns {{
 *   upcoming:    object[],
 *   loading:     boolean,
 *   isError:     boolean,
 *   hasUpcoming: boolean,
 *   refresh:     () => void,
 * }}
 *
 * @example
 * // Cricket upcoming
 * const { upcoming, loading } = useUpcoming('cricket')
 *
 * // Football fixtures
 * const { upcoming: fixtures } = useUpcoming('football', { league: 'PL', limit: 10 })
 */
export function useUpcoming(sport = 'cricket', { league = 'CL', limit = 0, pause = false } = {}) {
  // Blueprint exact endpoints:
  // cricket  → /api/cricket-upcoming
  // football → /api/football-upcoming?league=CL
  const endpoint = sport === 'cricket'
    ? '/api/cricket-upcoming'
    : `/api/football-upcoming?league=${encodeURIComponent(league)}`

  const { data, error, isLoading, mutate } = useSWR(
    pause ? null : endpoint,
    fetcher,
    {
      // Blueprint: Vercel KV 6hr cache → client এ revalidate কম
      revalidateOnFocus:  false,
      refreshWhenHidden:  false,
      refreshWhenOffline: false,
      dedupingInterval:   1_800_000,   // 30 min client-side dedup
      errorRetryCount:    2,
    }
  )

  const allUpcoming = normalizeArray(data)
  const upcoming    = limit > 0 ? allUpcoming.slice(0, limit) : allUpcoming

  return {
    upcoming,
    loading:     isLoading,
    isLoading,
    isError:     !!error,
    error,
    hasUpcoming: upcoming.length > 0,
    total:       allUpcoming.length,
    refresh:     mutate,
  }
}
