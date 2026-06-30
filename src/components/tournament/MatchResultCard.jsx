// MatchResultCard.jsx — Completed match result display card

const FORMAT_COLORS = {
  Test: 'bg-amber-500/10  text-amber-400  border-amber-500/20',
  ODI:  'bg-blue-500/10   text-blue-400   border-blue-500/20',
  T20:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  T10:  'bg-pink-500/10   text-pink-400   border-pink-500/20',
}

export default function MatchResultCard({ match }) {
  if (!match) return null
  const fmtCls = FORMAT_COLORS[match.format] || 'bg-white/5 text-white/30 border-white/10'

  return (
    <div className="rounded-xl bg-brand-surface border border-brand-border overflow-hidden hover:border-white/20 transition-all">
      {/* Card header */}
      <div className="px-4 py-3 border-b border-brand-border flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-white truncate leading-snug">{match.name}</p>
          {match.venue && (
            <p className="text-[10px] text-white/30 mt-0.5 truncate">📍 {match.venue}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          {match.format && (
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${fmtCls}`}>
              {match.format}
            </span>
          )}
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/35 uppercase tracking-wider">
            FT
          </span>
        </div>
      </div>

      {/* Innings scores */}
      {(match.score || []).slice(0, 2).map((inn, idx) => (
        <div key={idx} className="px-4 py-3 border-b border-brand-border last:border-b-0 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1 truncate">
              {inn.inning || match.teams?.[idx] || `Innings ${idx + 1}`}
            </p>
            <div className="flex items-baseline gap-1">
              {/* font-sports = Teko — consistent with ScoreCard numbers */}
              <span className="font-sports text-2xl font-black text-white tabular-nums">{inn.r ?? '—'}</span>
              {inn.w !== undefined && <span className="text-white/50 font-bold">/{inn.w}</span>}
              {inn.o !== undefined && (
                <span className="text-white/25 text-xs ml-1">({inn.o} ov)</span>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Result status */}
      <div className="px-4 py-2.5 bg-brand-elevated/50 border-t border-brand-border">
        <p className="text-[11px] text-white/40 text-center truncate">{match.status || 'Finished'}</p>
      </div>
    </div>
  )
}
