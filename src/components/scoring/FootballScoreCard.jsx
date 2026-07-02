// FootballScoreCard.jsx — [Update #4] Teko font for score numbers
// ✅ [Bug Fix] Wrapped with its own ErrorBoundary (CricketScoreCard already
// had this, FootballScoreCard didn't) — previously if even one match in
// the list had an unexpected data shape, the whole "Live Score Grid"
// crashed for every match, because they all shared a single ErrorBoundary
// one level up. Now each card fails independently.

import ErrorBoundary from '../ui/ErrorBoundary.jsx'
import { safeText }  from '../../utils/formatters.js'

function FootballScoreCardInner({ match }) {
  if (!match) return null

  // ✅ [Bug Fix] String(...) coercion before parseInt — homeScore/awayScore
  // could arrive as number, string, or null depending on API response
  // shape; parseInt on a non-string/non-number could throw in edge cases.
  const hScore = parseInt(String(match.homeScore ?? match.goals?.[0] ?? ''), 10)
  const aScore = parseInt(String(match.awayScore ?? match.goals?.[1] ?? ''), 10)
  const hWin = !match.isLive && !isNaN(hScore) && !isNaN(aScore) && hScore > aScore
  const aWin = !match.isLive && !isNaN(hScore) && !isNaN(aScore) && aScore > hScore

  // ✅ [Bug Fix — root cause of the football-only crash] Previously these
  // were rendered directly as `{match.homeTeam}` etc. React hard-crashes
  // if that value is ever an object instead of a string — which is exactly
  // what allsportsapi2 returns for some fields (nested `{ name, ... }`
  // shapes), while cricket-live-line1's fields happened to always be flat
  // strings. safeText() guarantees a renderable string either way.
  const homeTeam   = safeText(match.homeTeam, 'Home')
  const awayTeam   = safeText(match.awayTeam, 'Away')
  const tournament = safeText(match.tournament || match.league, 'Football')
  const status     = safeText(match.status)
  const minute     = safeText(match.minute)

  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl p-5 flex flex-col gap-4 hover:border-white/20 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-white/40 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full truncate max-w-[65%]">
          {tournament}
        </span>
        {match.isLive ? (
          <span className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/25 text-green-400 text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" />
            {minute ? `${minute}'` : 'LIVE'}
          </span>
        ) : (
          <span className="text-[10px] font-bold text-white/25 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full shrink-0">FT</span>
        )}
      </div>

      {/* Score block — [Update #4] font-sports */}
      <div className="flex items-center justify-between gap-3 py-1">
        <p className={`text-sm font-bold flex-1 truncate text-left leading-snug
          ${hWin ? 'text-white' : 'text-white/55'}`}>
          {homeTeam}
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
          {awayTeam}
        </p>
      </div>

      {/* Status */}
      {status && (
        <div className="pt-3 border-t border-brand-border">
          <p className="text-[11px] text-center text-white/30 font-medium truncate">{status}</p>
        </div>
      )}
    </div>
  )
}

export default function FootballScoreCard(props) {
  return (
    <ErrorBoundary label="Football Score Card">
      <FootballScoreCardInner {...props} />
    </ErrorBoundary>
  )
}
