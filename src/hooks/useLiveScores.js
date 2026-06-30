// useLiveScores.js — Live score, tournament matches, series hooks
// Blueprint: src/hooks/useLiveScores.js
// ✅ [Update #2] SWR tab-visibility optimization applied
// ✅ [Fix] isVisible → isPaused (correct SWR API)

import useSWR from 'swr'

// ── Shared fetcher ────────────────────────────────────
const fetcher = (url) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  })

// ── [Update #2] Tab Visibility check ─────────────────
// ✅ SWR এ সঠিক option হলো isPaused — isVisible নয়
// ইউজার অন্য ট্যাবে গেলে polling বন্ধ → প্রতি ঘণ্টায় ৩০টি অপ্রয়োজনীয় API call বাঁচে
const isTabHidden = () =>
  typeof document !== 'undefined' && document.visibilityState === 'hidden'

// ── Normalize helper ──────────────────────────────────
// API response structure ভিন্ন হতে পারে — সব case handle করো
function normalizeArray(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (Array.isArray(raw?.data)) return raw.data
  if (Array.isArray(raw?.matches)) return raw.matches
  if (Array.isArray(raw?.results)) return raw.results
  return []
}

// ─────────────────────────────────────────────────────
// 1. useLiveScores — Live match scores (cricket / football)
//    Blueprint: /api/live-score → RapidAPI → Vercel KV (90s cache)
//    SWR refreshInterval: 120s (client এ ২ মিনিট)
// ─────────────────────────────────────────────────────
export function useLiveScores(sport = 'cricket') {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/live-score?sport=${sport}`,
    fetcher,
    {
      refreshInterval:    120_000,   // [Update #2] 2 min polling
      revalidateOnFocus:  true,      // ট্যাবে ফিরলে তাৎক্ষণিক refresh
      // ✅ [Fix] isPaused = ট্যাব hidden থাকলে polling বন্ধ (সঠিক SWR API)
      isPaused:           isTabHidden,
      refreshWhenHidden:  false,
      refreshWhenOffline: false,
      dedupingInterval:   60_000,    // 1 min এর মধ্যে duplicate call নেই
      errorRetryCount:    3,
      errorRetryInterval: 10_000,
      onErrorRetry: (err, _key, _cfg, revalidate, { retryCount }) => {
        if (retryCount >= 3) return
        setTimeout(() => revalidate({ retryCount }), 10_000)
      },
    }
  )

  const liveMatches = normalizeArray(data)

  return {
    liveMatches,                          // match object array
    loading:     isLoading,
    isLoading,
    isError:     !!error,
    error,
    hasLive:     liveMatches.length > 0,
    source:      data?.source ?? null,    // 'cache' | 'live' — Vercel KV থেকে আসে
    lastUpdated: data?.updatedAt ?? null,
    refresh:     mutate,                  // manual refresh করতে চাইলে
  }
}

// ─────────────────────────────────────────────────────
// 2. useTournamentMatches — Completed match results (Tournament page)
//    Blueprint: /api/match-results → RapidAPI → Vercel KV (30-60 min cache)
//    ✅ [Fix] Watch.jsx এ .upcoming ব্যবহার হচ্ছিল কিন্তু এই hook দিত না
//    এখন useUpcoming hook আলাদাভাবে ব্যবহার করতে হবে
// ─────────────────────────────────────────────────────
export function useTournamentMatches(sport = 'cricket') {
  const { data: resultsData, error: resErr, isLoading: resLoading } = useSWR(
    `/api/match-results?sport=${sport}`,
    fetcher,
    {
      revalidateOnFocus:  false,
      refreshWhenHidden:  false,
      refreshWhenOffline: false,
      dedupingInterval:   300_000,   // 5 min — results এত ঘন ঘন বদলায় না
      // ✅ [Fix] isPaused (not isVisible)
      isPaused:           isTabHidden,
    }
  )

  const results = normalizeArray(resultsData)

  return {
    results,
    loading:    resLoading,
    isLoading:  resLoading,
    isError:    !!resErr,
    error:      resErr,
    hasResults: results.length > 0,
  }
}

// ─────────────────────────────────────────────────────
// 3. useSeriesMatches — একটি নির্দিষ্ট series এর match list
//    Blueprint: /api/series-matches?seriesId=xxx
//    SeriesList component এ expand করলে call হয়
// ─────────────────────────────────────────────────────
export function useSeriesMatches(seriesId) {
  const { data, error, isLoading } = useSWR(
    // seriesId না থাকলে null → SWR fetch করবে না
    seriesId ? `/api/series-matches?seriesId=${encodeURIComponent(seriesId)}` : null,
    fetcher,
    {
      revalidateOnFocus:  false,
      refreshWhenHidden:  false,
      refreshWhenOffline: false,
      dedupingInterval:   600_000,   // 10 min — series fixtures খুব কম বদলায়
    }
  )

  return {
    seriesMatches: normalizeArray(data),
    loading:       isLoading,
    isLoading,
    isError:       !!error,
    error,
  }
}
