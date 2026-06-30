// useFavorites.js — Favorite channels hook
// Blueprint: src/hooks/useFavorites.js
// favoriteStore + channelStore কে bridge করে — component এ একটাই import

import { useCallback, useMemo } from 'react'
import { useFavoriteStore } from '../store/favoriteStore.js'
import { useChannelStore }  from '../store/channelStore.js'

/**
 * useFavorites — Favorite channels management hook
 *
 * @returns {{
 *   favorites:        number[],         — favorite channel id array
 *   favoriteChannels: object[],         — full channel objects
 *   isFavorite:       (id) => boolean,
 *   toggleFavorite:   (id) => void,
 *   addFavorite:      (id) => void,
 *   removeFavorite:   (id) => void,
 *   clearFavorites:   () => void,
 *   count:            number,
 * }}
 *
 * @example
 * const { isFavorite, toggleFavorite, favoriteChannels, count } = useFavorites()
 */
export function useFavorites() {
  const favorites      = useFavoriteStore(s => s.favorites)
  const toggleFavorite = useFavoriteStore(s => s.toggleFavorite)
  const addFavorite    = useFavoriteStore(s => s.addFavorite)
  const removeFavorite = useFavoriteStore(s => s.removeFavorite)
  const clearFavorites = useFavoriteStore(s => s.clearFavorites)

  const channels   = useChannelStore(s => s.channels)
  const bdChannels = useChannelStore(s => s.bdChannels)

  // favorite id → full channel object — useMemo দিয়ে cache করো
  const allChannels = useMemo(
    () => [...channels, ...bdChannels],
    [channels, bdChannels]
  )

  const favoriteChannels = useMemo(
    () => allChannels.filter(ch => favorites.includes(Number(ch.id))),
    [allChannels, favorites]
  )

  // (id) => boolean — stable reference (useCallback)
  const isFavorite = useCallback(
    (channelId) => favorites.includes(Number(channelId)),
    [favorites]
  )

  return {
    favorites,           // number[] — id list (localStorage persist হয়)
    favoriteChannels,    // object[] — full channel data
    isFavorite,          // (id) => boolean
    toggleFavorite,      // (id) => void
    addFavorite,         // (id) => void
    removeFavorite,      // (id) => void
    clearFavorites,      // () => void
    count: favorites.length,
  }
}
