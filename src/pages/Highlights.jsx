// Highlights.jsx — Match highlights, event videos, best performances, player skills
// Blueprint: src/pages/Highlights.jsx
// Data: src/data/highlights.js (plain JS array — site owner edits this directly,
//       no backend/CMS needed; see comments in that file for how to add videos)

import { useState, useMemo } from 'react'
import PageMeta          from '../components/ui/PageMeta.jsx'
import SectionHeader     from '../components/ui/SectionHeader.jsx'
import VideoCard         from '../components/highlights/VideoCard.jsx'
import VideoModal        from '../components/highlights/VideoModal.jsx'
import highlightsData    from '../data/highlights.js'

export default function Highlights() {
  const [playing, setPlaying] = useState(null)   // { videoId, title } | null

  // নতুনটা আগে — addedDate অনুযায়ী sort, owner যেই ক্রমে JS ফাইলে লিখুক না কেন
  const videos = useMemo(
    () => [...highlightsData].sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate)),
    []
  )

  return (
    <>
      <PageMeta
        title="Highlights & Videos"
        description="Match highlights, event videos, best performances, and player skills — watch on StreamVex Live."
      />

      <SectionHeader
        title="🎬 Highlights & Videos"
        subtitle={
          videos.length > 0
            ? `${videos.length} video${videos.length !== 1 ? 's' : ''}`
            : 'কোনো ভিডিও যুক্ত করা হয়নি'
        }
      />

      {videos.length === 0 ? (
        /* ── Empty state ── */
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-20 h-20 rounded-full bg-brand-elevated border border-brand-border flex items-center justify-center mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 text-white/20">
              <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <h3 className="text-white/50 font-semibold mb-2">এখনো কোনো ভিডিও যুক্ত করা হয়নি</h3>
          <p className="text-white/30 text-sm max-w-xs leading-relaxed">
            src/data/highlights.js ফাইলে নতুন ভিডিও যুক্ত করুন — এখানে দেখা যাবে।
          </p>
        </div>
      ) : (
        /* ── Video grid ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video, i) => (
            <VideoCard
              key={video.id}
              video={video}
              index={i}
              onPlay={(videoId) => setPlaying({ videoId, title: video.title })}
            />
          ))}
        </div>
      )}

      <VideoModal
        videoId={playing?.videoId}
        title={playing?.title}
        onClose={() => setPlaying(null)}
      />
    </>
  )
}
