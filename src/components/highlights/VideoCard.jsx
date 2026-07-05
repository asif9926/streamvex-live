// VideoCard.jsx — Highlight video thumbnail card
// Used by: Highlights.jsx

import { motion } from 'framer-motion'
import { getYouTubeId, getYouTubeThumbnail, timeAgo } from '../../utils/formatters.js'

export default function VideoCard({ video, index = 0, onPlay }) {
  const videoId   = getYouTubeId(video.youtubeUrl)
  const thumbnail = getYouTubeThumbnail(videoId)

  if (!videoId) return null   // ভুল/অসম্পূর্ণ youtubeUrl হলে card না দেখানোই ভালো, ভাঙা thumbnail এর চেয়ে

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onClick={() => onPlay(videoId)}
      className="group relative rounded-xl bg-brand-surface border border-brand-border overflow-hidden
                 card-glow transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5 text-left"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-brand-elevated overflow-hidden">
        <img
          src={thumbnail}
          alt={video.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
          <div className="w-12 h-12 rounded-full bg-brand-red/90 flex items-center justify-center shadow-lg shadow-black/30 group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white" className="w-5 h-5 ml-0.5">
              <path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5">
        <p className="text-sm font-semibold text-white leading-snug line-clamp-2">{video.title}</p>
        {video.addedDate && (
          <p className="text-[11px] text-white/35 mt-1.5">{timeAgo(video.addedDate)}</p>
        )}
      </div>
    </motion.button>
  )
}
