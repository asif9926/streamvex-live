// useMatchResults.js — Completed match results hook
// Blueprint: src/hooks/useMatchResults.js
// API: /api/match-results → RapidAPI → Vercel KV (30-60 min cache)
// Used by: Tournament page (Results tab)

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
  if (Array.isArray(raw?.results)) return raw.results
  return []
}

/**
 * useMatchResults — Fetch completed match results
 *
 * @param {'cricket'|'football'} sport — sport type
 * @param {object} options
 *   @param {number}  limit  — max results to return (default: 20)
 *   @param {boolean} pause  — true হলে fetch করবে না
 *
 * @returns {{
 *   results:    object[],
 *   loading:    boolean,
 *   isError:    boolean,
 *   hasResults: boolean,
 *   refresh:    () => void,
 * }}
 *
 * @example
 * const { results, loading } = useMatchResults('cricket')
 * const { results } = useMatchResults('football', { limit: 10 })
 */
export function useMatchResults(sport = 'cricket', { limit = 20, pause = false } = {}) {
  const { data, error, isLoading, mutate } = useSWR(
    pause ? null : `/api/match-results?sport=${sport}`,
    fetcher,
    {
      // Blueprint: 30-60 min server cache → client এ 30 min
      revalidateOnFocus:  false,
      refreshWhenHidden:  false,
      refreshWhenOffline: false,
      dedupingInterval:   1_800_000,   // 30 min
      errorRetryCount:    2,
    }
  )

  const allResults = normalizeArray(data)
  const results    = limit > 0 ? allResults.slice(0, limit) : allResults

  return {
    results,
    loading:    isLoading,
    isLoading,
    isError:    !!error,
    error,
    hasResults: results.length > 0,
    total:      allResults.length,   // limit আগে কতটা ছিল
    refresh:    mutate,
  }
}
