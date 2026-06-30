// channelStore.js — Zustand store for channels, search, and filtering
// Blueprint: src/store/channelStore.js
// State management: Zustand
// Used by: Header, Sports, BangladeshiTV, Home, Watch, Favorites pages + useSearch hook

import { create } from 'zustand'
import channelsData   from '../data/channels.json'
import bdChannelsData from '../data/bdChannels.json'

export const useChannelStore = create((set, get) => ({

  // ── State ────────────────────────────────────────────
  channels:          channelsData,       // Sports channels (Star Sports, ESPN etc.)
  bdChannels:        bdChannelsData,     // Bangladesh TV channels (BTV, Channel i etc.)
  searchQuery:       '',
  activeCategory:    'All',             // Sports | Bangladesh TV | All
  activeSubcategory: 'All',             // Cricket | Football | Tennis | All

  // ── Actions ───────────────────────────────────────────
  setSearch: (query) => set({ searchQuery: query }),

  setCategory: (cat) => set({
    activeCategory:    cat,
    activeSubcategory: 'All',           // category বদলালে subcategory reset
  }),

  setSubcategory: (sub) => set({ activeSubcategory: sub }),

  clearFilters: () => set({
    searchQuery:       '',
    activeCategory:    'All',
    activeSubcategory: 'All',
  }),

  // ── Derived / Selectors ───────────────────────────────

  // Sports channels filtered by search + category + subcategory
  getFilteredChannels: () => {
    const { channels, searchQuery, activeCategory, activeSubcategory } = get()
    const q = searchQuery.toLowerCase().trim()

    return channels.filter(ch => {
      const matchSearch = !q ||
        ch.name.toLowerCase().includes(q) ||
        ch.currentMatch?.toLowerCase().includes(q) ||
        ch.subcategory?.toLowerCase().includes(q)

      const matchCat = activeCategory === 'All' || ch.category === activeCategory
      const matchSub = activeSubcategory === 'All' || ch.subcategory === activeSubcategory

      return matchSearch && matchCat && matchSub
    })
  },

  // BD channels filtered by search + subcategory
  getFilteredBdChannels: () => {
    const { bdChannels, searchQuery, activeSubcategory } = get()
    const q = searchQuery.toLowerCase().trim()

    return bdChannels.filter(ch => {
      const matchSearch = !q ||
        ch.name.toLowerCase().includes(q) ||
        ch.currentMatch?.toLowerCase().includes(q)

      const matchSub = activeSubcategory === 'All' || ch.subcategory === activeSubcategory

      return matchSearch && matchSub
    })
  },

  // id দিয়ে যেকোনো channel খোঁজো (sports + bd দুটোতেই)
  getChannelById: (id) => {
    const { channels, bdChannels } = get()
    const numId = Number(id)
    return (
      channels.find(ch => ch.id === numId) ||
      bdChannels.find(ch => ch.id === numId) ||
      null
    )
  },

  // Live channels only
  getLiveChannels: () => {
    const { channels, bdChannels } = get()
    return [...channels, ...bdChannels].filter(ch => ch.isLive)
  },

  // All unique categories from channels data
  getCategories: () => {
    const { channels } = get()
    const cats = [...new Set(channels.map(ch => ch.category).filter(Boolean))]
    return ['All', ...cats]
  },

  // All unique subcategories (optionally filtered by category)
  getSubcategories: (forCategory = 'All') => {
    const { channels } = get()
    const filtered = forCategory === 'All'
      ? channels
      : channels.filter(ch => ch.category === forCategory)
    const subs = [...new Set(filtered.map(ch => ch.subcategory).filter(Boolean))]
    return ['All', ...subs]
  },
}))
