import ChannelCard from './ChannelCard.jsx'
import Skeleton from '../ui/Skeleton.jsx'

export default function ChannelGrid({
  channels,
  loading      = false,
  emptyMessage = 'No channels found',
}) {
  // Loading state — skeleton cards
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    )
  }

  // Empty state
  if (!channels || channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-brand-elevated flex items-center justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-8 h-8 text-white/20"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        </div>
        <p className="text-white/40 text-sm">{emptyMessage}</p>
      </div>
    )
  }

  // Channel grid
  // mobile:  2 columns  (যথেষ্ট compact, scroll করতে হয় না)
  // sm:      3 columns  (tablet portrait)
  // lg:      4 columns  (laptop)
  // xl:      5 columns  (desktop / widescreen)
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {channels.map((ch, i) => (
        <ChannelCard key={ch.id} channel={ch} index={i} />
      ))}
    </div>
  )
}
