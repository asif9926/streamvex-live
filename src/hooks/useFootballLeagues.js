// useFootballLeagues.js — Dynamic list of available football competitions
// Blueprint: src/hooks/useFootballLeagues.js
// API: /api/football-leagues → football-data.org /v4/competitions → Vercel KV (24hr cache)
// Used by: Tournament page (Football Series tab) — mirrors useSeries('cricket')
//          so football's series list behaves exactly like cricket's: one
//          dynamic API call returns everything, no hardcoded league picker.

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
  return []
}

export function useFootballLeagues() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/football-leagues',
    fetcher,
    {
      revalidateOnFocus:  false,
      refreshWhenHidden:  false,
      refreshWhenOffline: false,
      dedupingInterval:   3_600_000,   // 1hr — competition list rarely changes
      errorRetryCount:    2,
    }
  )

  return {
    leagues:    normalizeArray(data),
    loading:    isLoading,
    isLoading,
    isError:    !!error,
    error,
    hasLeagues: normalizeArray(data).length > 0,
    refresh:    mutate,
  }
}
