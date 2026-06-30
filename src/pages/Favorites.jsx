// Favorites.jsx — User's saved favorite channels
// Blueprint: src/pages/Favorites.jsx
// Hooks: useFavorites (bridge hook — favoriteStore + channelStore)
// Components: ChannelGrid, SectionHeader, PageMeta

import { Link }         from 'react-router-dom'
import { useFavorites } from '../hooks/useFavorites.js'
import ChannelGrid      from '../components/channels/ChannelGrid.jsx'
import SectionHeader    from '../components/ui/SectionHeader.jsx'
import PageMeta         from '../components/ui/PageMeta.jsx'

export default function Favorites() {
  const { favoriteChannels, clearFavorites, count } = useFavorites()

  const liveCount = favoriteChannels.filter(c => c.isLive).length

  return (
    <>
      <PageMeta
        title="My Favorites"
        description="Your saved channels on StreamVex Live."
      />

      <SectionHeader
        title="⭐ My Favorites"
        subtitle={
          count > 0
            ? `${count} saved channel${count !== 1 ? 's' : ''}${liveCount > 0 ? ` · ${liveCount} live` : ''}`
            : 'No saved channels yet'
        }
      >
        {count > 0 && (
          <button
            onClick={clearFavorites}
            className="text-xs text-white/30 hover:text-white/60 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-brand-border"
          >
            Clear All
          </button>
        )}
      </SectionHeader>

      {count === 0 ? (
        /* ── Empty state ── */
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-20 h-20 rounded-full bg-brand-elevated border border-brand-border flex items-center justify-center mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 text-white/20">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg>
          </div>
          <h3 className="text-white/50 font-semibold mb-2">No favorites yet</h3>
          <p className="text-white/30 text-sm mb-6 max-w-xs leading-relaxed">
            Hover over any channel card and click the{' '}
            <HeartIcon className="inline w-3.5 h-3.5 text-brand-red/70" />{' '}
            icon to save it here.
          </p>
          <Link
            to="/sports"
            className="px-5 py-2.5 bg-brand-red text-white font-semibold rounded-xl text-sm hover:bg-red-700 transition-colors shadow-lg shadow-brand-red/20"
          >
            Browse Channels
          </Link>
        </div>
      ) : (
        /* ── Favorites grid ── */
        <ChannelGrid
          channels={favoriteChannels}
          emptyMessage="No matching channels found."
        />
      )}
    </>
  )
}

// ── Icon ─────────────────────────────────────────────
function HeartIcon({ className = '' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-2.184C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 0 1 8-2.828A4.5 4.5 0 0 1 18 7.5c0 2.852-2.044 5.233-3.885 6.936a22.049 22.049 0 0 1-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 0 1-.69.001l-.002-.001Z" />
    </svg>
  )
}
