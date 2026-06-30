// FootballScoreCard.jsx — [Update #4] Teko font for score numbers

export default function FootballScoreCard({ match }) {
  if (!match) return null

  const hScore = parseInt(match.homeScore ?? match.goals?.[0] ?? '')
  const aScore = parseInt(match.awayScore ?? match.goals?.[1] ?? '')
  const hWin = !match.isLive && !isNaN(hScore) && !isNaN(aScore) && hScore > aScore
  const aWin = !match.isLive && !isNaN(hScore) && !isNaN(aScore) && aScore > hScore

  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl p-5 flex flex-col gap-4 hover:border-white/20 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-white/40 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full truncate max-w-[65%]">
          {match.tournament || match.league || 'Football'}
        </span>
        {match.isLive ? (
          <span className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/25 text-green-400 text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" />
            {match.minute ? `${match.minute}'` : 'LIVE'}
          </span>
        ) : (
          <span className="text-[10px] font-bold text-white/25 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full shrink-0">FT</span>
        )}
      </div>

      {/* Score block — [Update #4] font-sports */}
      <div className="flex items-center justify-between gap-3 py-1">
        <p className={`text-sm font-bold flex-1 truncate text-left leading-snug
          ${hWin ? 'text-white' : 'text-white/55'}`}>
          {match.homeTeam}
        </p>

        <div className="flex items-center gap-2 shrink-0">
          {/* [Update #4] Teko font — sporty score numbers */}
          <span className={`font-sports text-5xl font-bold tabular-nums leading-none
            ${hWin ? 'text-white' : 'text-white/50'}`}>
            {isNaN(hScore) ? '—' : hScore}
          </span>
          <span className="font-sports text-3xl text-white/20 leading-none">:</span>
          <span className={`font-sports text-5xl font-bold tabular-nums leading-none
            ${aWin ? 'text-white' : 'text-white/50'}`}>
            {isNaN(aScore) ? '—' : aScore}
          </span>
        </div>

        <p className={`text-sm font-bold flex-1 truncate text-right leading-snug
          ${aWin ? 'text-white' : 'text-white/55'}`}>
          {match.awayTeam}
        </p>
      </div>

      {/* Status */}
      {match.status && (
        <div className="pt-3 border-t border-brand-border">
          <p className="text-[11px] text-center text-white/30 font-medium truncate">{match.status}</p>
        </div>
      )}
    </div>
  )
}
