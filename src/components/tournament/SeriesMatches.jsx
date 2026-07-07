// SeriesMatches.jsx — Match list for a selected series (cricket/football)

import Skeleton from '../ui/Skeleton.jsx'
import { useSeriesMatches } from '../../hooks/useLiveScores.js'

const FORMAT_COLORS = {
  Test: 'bg-amber-500/10  text-amber-400  border-amber-500/20',
  ODI:  'bg-blue-500/10   text-blue-400   border-blue-500/20',
  T20:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  T10:  'bg-pink-500/10   text-pink-400   border-pink-500/20',
}

// ✅ [Fix] Compact score summary for a finished match, e.g. "245/8 · 210/9"
// — used instead of the full MatchResultCard so every row in this list
// stays the same height (see note in the main component below).
function scoreLine(match) {
  const innings = (match.score || []).slice(0, 2)
  if (!innings.length) return match.status || ''
  return innings
    .map(inn => `${inn.r ?? '—'}${inn.w !== undefined ? '/' + inn.w : ''}`)
    .join('  ·  ')
}

export default function SeriesMatches({ seriesId }) {
  const { seriesMatches, loading } = useSeriesMatches(seriesId)

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    )
  }

  if (!seriesMatches?.length) {
    return (
      <p className="text-white/40 text-sm py-6 text-center">No matches found for this series.</p>
    )
  }

  return (
    <div className="max-h-[420px] overflow-y-auto flex flex-col gap-2 pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-brand-border">
      {seriesMatches.map((match, i) => {
        const fmtCls = FORMAT_COLORS[match.format] || 'bg-white/5 text-white/30 border-white/10'

        // ⚠️ [Bug Fix] আগে finished match গুলো পুরো-সাইজ MatchResultCard
        // (innings breakdown সহ, ~150px+) দিয়ে render হতো, বাকি সব upcoming
        // row ছিল compact (~64px)। একই list এ mixed height থাকায় scroll
        // এর নিচের দিকে বড় card টা মাঝপথে কাটা পড়ে "ভাঙা" দেখাচ্ছিল।
        // এখন finished match-ও একই compact row style — শুধু score/FT badge
        // সহ — তাই পুরো list uniform height থাকে, cut-off ভাব থাকে না।
        return (
          <div
            key={match.id || i}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-surface border border-brand-border hover:border-white/15 transition-colors"
          >
            {/* Date/time */}
            <div className="flex flex-col items-center shrink-0 w-14 text-center">
              <span className="text-[10px] font-bold text-white/50 leading-tight">
                {match.date?.split(',')[0] || 'TBA'}
              </span>
              {match.time && !match.isFinished && (
                <span className="text-[9px] text-white/25 mt-0.5">{match.time}</span>
              )}
            </div>
            <div className="w-px h-8 bg-brand-border shrink-0" />
            {/* Match info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{match.name}</p>
              {match.isFinished ? (
                <p className="text-[10px] text-white/40 mt-0.5 truncate font-sports tabular-nums">
                  {scoreLine(match)}
                </p>
              ) : match.venue && (
                <p className="text-[10px] text-white/30 mt-0.5 truncate">📍 {match.venue}</p>
              )}
            </div>
            {match.isLive && (
              <span className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/25 text-green-400 text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" />
                LIVE
              </span>
            )}
            {match.isFinished && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/35 uppercase tracking-wider shrink-0">
                FT
              </span>
            )}
            {match.format && (
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border shrink-0 ${fmtCls}`}>
                {match.format}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}