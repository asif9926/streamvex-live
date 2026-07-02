// CricketScoreCard.jsx — [Update #3] ErrorBoundary wrap + [Update #4] Teko/font-sports numbers

import ErrorBoundary from '../ui/ErrorBoundary.jsx'
import { safeText }  from '../../utils/formatters.js'

// ✅ [Bug Fix] Previously this manually did `${s1.r}/${s1.w}`, which
// rendered "203-7/undefined" whenever the API's wicket field (`w`) was
// missing — RapidAPI's cricket-live-line1 actually returns the score
// already combined (e.g. r: "203-7") with no separate wickets field.
// Only append "/{wicket}" when that field genuinely exists, so this
// renders correctly regardless of which shape the API sends.
function formatRuns(s) {
  if (!s) return '—'
  const wicket = s.w ?? s.wickets
  return wicket !== undefined && wicket !== null ? `${s.r}/${wicket}` : `${s.r ?? '—'}`
}

function CricketScoreCardInner({ match }) {
  if (!match) return null

  // ✅ [Bug Fix — defense-in-depth] Same object-as-child protection as
  // FootballScoreCard — guards against any future upstream schema drift
  // that nests team/status/matchType fields as objects instead of strings.
  const t1 = safeText(match.teams?.[0], 'Team 1')
  const t2 = safeText(match.teams?.[1], 'Team 2')
  const matchType = safeText(match.matchType || match.series, 'Cricket')
  const status = safeText(match.status)
  const s1 = match.score?.[0]
  const s2 = match.score?.[1]
  const score1 = formatRuns(s1)
  const score2 = formatRuns(s2)
  const overs1 = s1?.o ? `(${s1.o} ov)` : ''
  const overs2 = s2?.o ? `(${s2.o} ov)` : ''

  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl p-5 flex flex-col gap-4 hover:border-white/20 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-white/40 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full truncate max-w-[60%]">
          {matchType}
        </span>
        {match.isLive ? (
          <span className="flex items-center gap-1 bg-brand-red/10 border border-brand-red/25 text-brand-red text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">
            <span className="w-1.5 h-1.5 bg-brand-red rounded-full animate-ping" /> LIVE
          </span>
        ) : (
          <span className="text-[10px] font-bold text-white/25 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">FT</span>
        )}
      </div>

      {/* Team 1 row */}
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-bold text-white flex-1 truncate">{t1}</span>
        {/* [Update #4] font-sports = Teko — sporty score numbers */}
        <span className="font-sports text-4xl font-semibold text-white tabular-nums shrink-0">{score1}</span>
        <span className="font-sports text-base text-white/40 shrink-0">{overs1}</span>
      </div>

      <div className="relative flex items-center">
        <div className="flex-1 h-px bg-brand-border" />
        <span className="mx-3 text-[9px] font-black text-white/20 uppercase tracking-widest">vs</span>
        <div className="flex-1 h-px bg-brand-border" />
      </div>

      {/* Team 2 row */}
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-bold text-white/55 flex-1 truncate">{t2}</span>
        {/* [Update #4] Teko font */}
        <span className="font-sports text-4xl font-semibold text-white/55 tabular-nums shrink-0">{score2}</span>
        <span className="font-sports text-base text-white/30 shrink-0">{overs2}</span>
      </div>

      {/* Status */}
      {status && (
        <div className="pt-3 border-t border-brand-border">
          <p className={`text-[11px] text-center font-medium truncate leading-snug
            ${match.isLive ? 'text-green-400/80' : 'text-white/35'}`}>
            {status}
          </p>
        </div>
      )}
    </div>
  )
}

export default function CricketScoreCard(props) {
  return (
    <ErrorBoundary label="Cricket Score Card">
      <CricketScoreCardInner {...props} />
    </ErrorBoundary>
  )
}
