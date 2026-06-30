// ScoreGrid.jsx — [Update #3] ErrorBoundary wrap করা
// ✅ [Fix] match.id undefined হলে index fallback

import ErrorBoundary    from '../ui/ErrorBoundary.jsx'
import CricketScoreCard  from './CricketScoreCard.jsx'
import FootballScoreCard from './FootballScoreCard.jsx'
import ScoreSkeleton     from './ScoreSkeleton.jsx'
import { useLiveScores } from '../../hooks/useLiveScores.js'

function ScoreGridInner({ sport = 'cricket' }) {
  const { liveMatches, loading, hasLive } = useLiveScores(sport)

  if (loading) return <ScoreSkeleton />

  if (!hasLive) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-brand-surface border border-dashed border-brand-border rounded-2xl gap-3">
        <span className="text-4xl opacity-20">{sport === 'cricket' ? '🏏' : '⚽'}</span>
        <p className="text-white/40 text-sm font-medium">No Live Matches Right Now</p>
        <p className="text-white/20 text-xs">Auto-checks every 2 minutes</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {liveMatches.map((match, i) =>
        sport === 'cricket'
          // ✅ [Fix] match.id ?? i — undefined id হলে index ব্যবহার করো
          ? <CricketScoreCard  key={match.id ?? `cricket-${i}`} match={match} />
          : <FootballScoreCard key={match.id ?? `football-${i}`} match={match} />
      )}
    </div>
  )
}

export default function ScoreGrid(props) {
  return (
    <ErrorBoundary label="Score Grid">
      <ScoreGridInner {...props} />
    </ErrorBoundary>
  )
}
