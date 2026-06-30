// useSearch.js — Live search + filter hook with debounce
// Blueprint: src/hooks/useSearch.js
// Header search bar + Sports/BangladeshiTV page filter এ ব্যবহার হয়

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useChannelStore } from '../store/channelStore.js'

/**
 * useSearch — Sports channels search + subcategory filter
 *
 * Header search এবং Sports page দুটোই এই hook ব্যবহার করে।
 * Debounce built-in → টাইপ করার সাথে সাথে অপ্রয়োজনীয় re-render বন্ধ।
 *
 * @param {number} debounceMs — debounce delay in ms (default: 250)
 *
 * @example
 * const { query, setQuery, clearQuery, filteredChannels, isSearching } = useSearch()
 */
export function useSearch(debounceMs = 250) {
  const setStoreSearch      = useChannelStore(s => s.setSearch)
  const getFilteredChannels = useChannelStore(s => s.getFilteredChannels)
  const searchQuery         = useChannelStore(s => s.searchQuery)
  const activeSubcategory   = useChannelStore(s => s.activeSubcategory)
  const setSubcategory      = useChannelStore(s => s.setSubcategory)

  const [localQuery, setLocalQuery] = useState(searchQuery)
  const [isSearching, setIsSearching] = useState(false)

  // Debounce — localQuery বদলালে debounceMs পরে store sync হয়
  useEffect(() => {
    setIsSearching(localQuery.trim().length > 0)
    const timer = setTimeout(() => {
      setStoreSearch(localQuery.trim())
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [localQuery, debounceMs, setStoreSearch])

  const setQuery = useCallback((value) => {
    setLocalQuery(typeof value === 'string' ? value : value?.target?.value ?? '')
  }, [])

  const clearQuery = useCallback(() => {
    setLocalQuery('')
    setStoreSearch('')
    setIsSearching(false)
  }, [setStoreSearch])

  const filteredChannels = getFilteredChannels()

  return {
    query:            localQuery,
    setQuery,
    clearQuery,
    filteredChannels,
    isSearching,
    resultCount:      filteredChannels.length,
    activeSubcategory,
    setSubcategory,
  }
}

/**
 * useBdSearch — Bangladesh TV channels search + filter
 *
 * BangladeshiTV page এ ব্যবহার করো।
 * Store এর getFilteredBdChannels() ব্যবহার করে।
 *
 * @example
 * const { query, setQuery, activeFilter, setActiveFilter, filteredBdChannels } = useBdSearch()
 */
export function useBdSearch() {
  const bdChannels        = useChannelStore(s => s.bdChannels)
  const [query, setLocalQuery]     = useState('')
  const [activeFilter, setFilter]  = useState('All')

  const setQuery = useCallback(
    (value) => setLocalQuery(typeof value === 'string' ? value : value?.target?.value ?? ''),
    []
  )
  const clearQuery     = useCallback(() => setLocalQuery(''), [])
  const setActiveFilter = useCallback((f) => setFilter(f), [])

  // BD channels filter — useMemo দিয়ে unnecessary recalculation বন্ধ
  const filteredBdChannels = useMemo(() => {
    const q = query.trim().toLowerCase()
    return bdChannels.filter(ch => {
      const matchSearch = !q ||
        ch.name.toLowerCase().includes(q) ||
        ch.currentMatch?.toLowerCase().includes(q)
      const matchFilter = activeFilter === 'All' || ch.subcategory === activeFilter
      return matchSearch && matchFilter
    })
  }, [bdChannels, query, activeFilter])

  // BD channel unique subcategories — filter pills এর জন্য
  const bdSubcategories = useMemo(() => {
    const subs = [...new Set(bdChannels.map(ch => ch.subcategory).filter(Boolean))]
    return ['All', ...subs]
  }, [bdChannels])

  return {
    query,
    setQuery,
    clearQuery,
    activeFilter,
    setActiveFilter,
    filteredBdChannels,
    bdSubcategories,
    resultCount: filteredBdChannels.length,
  }
}
