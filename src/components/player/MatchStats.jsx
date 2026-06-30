// MatchStats.jsx — Match statistics panel for Watch page
// blueprint: src/components/player/MatchStats.jsx

import { useTournamentMatches } from '../../hooks/useLiveScores.js'
import Skeleton from '../ui/Skeleton.jsx'

export default function MatchStats({ sport = 'cricket', channelName: _channelName = '' }) {
  const { results, loading } = useTournamentMatches(sport)
  const recentMatches = results.slice(0, 4)

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!recentMatches.length) {
    return (
      <p className="text-white/30 text-sm py-8 text-center">
        No {sport} stats available right now.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-bold uppercase tracking-widest text-white/30">
        Recent {sport === 'cricket' ? '🏏 Cricket' : '⚽ Football'} Results
      </p>
      <div className="flex flex-col gap-3">
        {recentMatches.map((match, i) => (
          <div
            key={match.id || i}
            className="px-4 py-3 rounded-xl bg-brand-surface border border-brand-border"
          >
            <p className="text-sm font-semibold text-white truncate mb-1">
              {match.name || (match.teams?.join(' vs '))}
            </p>
            <p className="text-xs text-white/40 truncate">{match.status || 'Finished'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
