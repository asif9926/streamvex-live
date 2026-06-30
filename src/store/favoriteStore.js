// favoriteStore.js — Zustand store for user favorite channels
// Blueprint: src/store/favoriteStore.js
// State management: Zustand + persist middleware (localStorage)
// Used by: FavoriteButton, Favorites page, useFavorites hook

import { create }  from 'zustand'
import { persist } from 'zustand/middleware'

export const useFavoriteStore = create(
  persist(
    (set, get) => ({

      // ── State ──────────────────────────────────────────
      // favorites: channel id array — persist middleware localStorage এ save করে
      favorites: [],

      // ── Actions ────────────────────────────────────────

      // favorite toggle — আগে থাকলে remove, না থাকলে add
      toggleFavorite: (channelId) => {
        const { favorites } = get()
        const id = Number(channelId)
        set({
          favorites: favorites.includes(id)
            ? favorites.filter(f => f !== id)
            : [...favorites, id],
        })
      },

      // add করো (duplicate check সহ)
      addFavorite: (channelId) => {
        const { favorites } = get()
        const id = Number(channelId)
        if (!favorites.includes(id)) {
          set({ favorites: [...favorites, id] })
        }
      },

      // remove করো
      removeFavorite: (channelId) => {
        const id = Number(channelId)
        set({ favorites: get().favorites.filter(f => f !== id) })
      },

      // নির্দিষ্ট channel favorite কিনা check করো
      isFavorite: (channelId) => {
        return get().favorites.includes(Number(channelId))
      },

      // সব favorite clear করো
      clearFavorites: () => set({ favorites: [] }),

      // total count
      count: () => get().favorites.length,
    }),
    {
      // localStorage key — blueprint: 'streamvex-favorites'
      name:    'streamvex-favorites',
      // শুধু favorites array টাই persist করো — অন্য কিছু নয়
      partialize: (state) => ({ favorites: state.favorites }),
    }
  )
)
