// UpcomingMatchCard.jsx — Upcoming match row card

const FORMAT_COLORS = {
  Test: 'bg-amber-500/10  text-amber-400  border-amber-500/20',
  ODI:  'bg-blue-500/10   text-blue-400   border-blue-500/20',
  T20:  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  T10:  'bg-pink-500/10   text-pink-400   border-pink-500/20',
}

export default function UpcomingMatchCard({ match }) {
  if (!match) return null

  // date/time parsing — flexible (string or ISO)
  let dateStr = match.date || ''
  let timeStr = match.time || ''
  if (!dateStr && match.startDate) {
    const d = new Date(match.startDate)
    if (!isNaN(d)) {
      dateStr = d.toLocaleDateString('en-BD', { day: '2-digit', month: 'short' })
      timeStr = timeStr || d.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit', hour12: true })
    } else {
      dateStr = match.startDate
    }
  }

  const fmtCls = FORMAT_COLORS[match.format] || ''

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-surface border border-brand-border hover:border-white/20 transition-all">
      {/* Date/time pill */}
      <div className="flex flex-col items-center shrink-0 w-14 text-center">
        <span className="text-[11px] font-bold text-white/55 leading-tight">{dateStr || 'TBA'}</span>
        {timeStr && <span className="text-[9px] text-white/30 mt-0.5">{timeStr}</span>}
      </div>

      <div className="w-px h-9 bg-brand-border shrink-0" />

      {/* Match info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{match.name}</p>
        {(match.matchType || match.tournament || match.venue || match.round) && (
          <p className="text-[10px] text-white/30 mt-0.5 truncate">
            {[match.matchType, match.tournament, match.venue, match.round].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {/* Format badge */}
      {match.format && fmtCls && (
        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border shrink-0 ${fmtCls}`}>
          {match.format}
        </span>
      )}
    </div>
  )
}
