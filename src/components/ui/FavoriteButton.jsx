// FavoriteButton.jsx — Heart toggle button for saving channels
// Used by: ChannelCard.jsx (required import)
// blueprint: src/components/ui/FavoriteButton.jsx
// Depends on: ../../hooks/useFavorites.js → favoriteStore (localStorage persist)

import { useFavorites } from '../../hooks/useFavorites.js'

export default function FavoriteButton({ channelId, className = '', size = 'md' }) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const fav = isFavorite(channelId)

  const sizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); toggleFavorite(channelId) }}
      aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={fav}
      className={`
        ${sizes[size] ?? sizes.md}
        flex items-center justify-center rounded-full
        transition-all duration-200 border
        ${fav
          ? 'bg-brand-red/10 border-brand-red/30 text-brand-red hover:bg-brand-red/20'
          : 'bg-black/30 border-white/10 text-white/40 hover:text-white/80 hover:border-white/25'
        }
        ${className}
      `}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill={fav ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={fav ? 0 : 1.5}
        className={`w-4 h-4 transition-transform duration-200 ${fav ? 'scale-110' : 'scale-100'}`}
      >
        <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-2.184C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 0 1 8-2.828A4.5 4.5 0 0 1 18 7.5c0 2.852-2.044 5.233-3.885 6.936a22.049 22.049 0 0 1-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 0 1-.69.001l-.002-.001Z" />
      </svg>
    </button>
  )
}
