import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import LiveBadge from '../ui/LiveBadge.jsx'
import FavoriteButton from '../ui/FavoriteButton.jsx'

const SPORT_COLORS = {
  cricket:    'from-green-900/40',
  football:   'from-blue-900/40',
  motorsport: 'from-orange-900/40',
  boxing:     'from-red-900/40',
  default:    'from-zinc-900/40',
}

export default function ChannelCard({ channel, index = 0 }) {
  const navigate = useNavigate()
  const gradientClass = SPORT_COLORS[channel.sport] || SPORT_COLORS.default

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={() => navigate(`/watch/${channel.id}`)}
      className={`group relative cursor-pointer rounded-xl bg-brand-surface border border-brand-border
                  overflow-hidden card-glow transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5`}
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} to-transparent pointer-events-none`} />

      {/* Premium badge */}
      {channel.isPremium && (
        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500 text-black uppercase tracking-wider">
          Premium
        </div>
      )}

      {/* Favorite */}
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <FavoriteButton channelId={channel.id} />
      </div>

      <div className="relative p-4 flex flex-col gap-3">
        {/* Logo + Name */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-brand-elevated flex items-center justify-center overflow-hidden flex-shrink-0 border border-brand-border">
            <img
              src={channel.logo}
              alt={channel.name}
              className="w-10 h-10 object-contain"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-white truncate">{channel.name}</p>
            <p className="text-xs text-white/40 mt-0.5">{channel.subcategory}</p>
          </div>
        </div>

        {/* Match info */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-white/60 truncate flex-1">{channel.currentMatch}</p>
          {channel.isLive ? <LiveBadge small /> : (
            <span className="text-[9px] font-semibold text-white/30 uppercase tracking-widest">Offline</span>
          )}
        </div>

        {/* Watch button */}
        <div className="flex items-center justify-between pt-1 border-t border-brand-border">
          <span className="text-[11px] text-white/40">{channel.category}</span>
          <button className="flex items-center gap-1 text-[11px] font-semibold text-brand-red group-hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" />
            </svg>
            Watch Now
          </button>
        </div>
      </div>
    </motion.div>
  )
}
