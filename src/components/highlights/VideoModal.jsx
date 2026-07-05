// VideoModal.jsx — Full-screen overlay YouTube player
// Used by: Highlights.jsx

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getYouTubeEmbedUrl } from '../../utils/formatters.js'

export default function VideoModal({ videoId, title, onClose }) {
  // Escape key দিয়ে বন্ধ করা যাবে
  useEffect(() => {
    if (!videoId) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    // মডাল খোলা থাকলে পিছনের পেজ scroll বন্ধ
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [videoId, onClose])

  return (
    <AnimatePresence>
      {videoId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close video"
              className="absolute -top-10 right-0 sm:-right-2 text-white/60 hover:text-white transition-colors p-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>

            <div className="rounded-xl overflow-hidden border border-brand-border bg-black aspect-video">
              <iframe
                key={videoId}
                src={getYouTubeEmbedUrl(videoId)}
                title={title || 'YouTube video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            {title && (
              <p className="text-sm font-semibold text-white/80 mt-3 text-center px-2">{title}</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
