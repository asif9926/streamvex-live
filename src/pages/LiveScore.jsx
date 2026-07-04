// LiveScoring.jsx — Live scores page (cricket + football)
// Blueprint: src/pages/LiveScoring.jsx  ← was MISSING
// Hooks: useLiveScores (SWR, [Update #2] tab-visibility)
// Components: ScoreGrid, ScoreSkeleton, Tabs, SectionHeader, PageMeta

import { useState }         from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveScores }    from '../hooks/useLiveScores.js'
import PageMeta             from '../components/ui/PageMeta.jsx'
import SectionHeader        from '../components/ui/SectionHeader.jsx'
import Tabs                 from '../components/ui/Tabs.jsx'
import ErrorBoundary        from '../components/ui/ErrorBoundary.jsx'
import ScoreSkeleton        from '../components/scoring/ScoreSkeleton.jsx'
import CricketScoreCard     from '../components/scoring/CricketScoreCard.jsx'
import FootballScoreCard    from '../components/scoring/FootballScoreCard.jsx'
// ✅ [Audit Fix] AIChatPanel was built but never wired into any page —
// surfacing it here per the original blueprint (AI Match Analyst on Live Score)
import AIChatPanel          from '../components/scoring/AIChatPanel.jsx'

const SPORT_TABS = [
  { id: 'cricket',  label: '🏏 Cricket'  },
  { id: 'football', label: '⚽ Football' },
]

export default function LiveScoring() {
  const [sport, setSport] = useState('cricket')

  const {
    liveMatches,
    loading,
    isError,
    hasLive,
    refresh,
    lastUpdated,
    source,
  } = useLiveScores(sport)

  return (
    <>
      <PageMeta
        title="Live Scores"
        description="Real-time cricket and football live scores — ball-by-ball updates, match status and more."
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <SectionHeader
          title="⚡ Live Scores"
          subtitle={
            loading
              ? 'Fetching latest scores…'
              : hasLive
                ? `${liveMatches.length} match${liveMatches.length !== 1 ? 'es' : ''} live now`
                : 'No live matches right now'
          }
        />

        {/* Refresh button + source badge */}
        <div className="flex items-center gap-2 shrink-0">
          {source === 'cache' && (
            <span className="text-[10px] text-white/25 border border-white/10 px-2 py-0.5 rounded-full">
              cached
            </span>
          )}
          <button
            onClick={() => refresh()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-border text-white/50 hover:text-white hover:border-white/20 text-xs font-semibold transition-all disabled:opacity-40"
          >
            <RefreshIcon className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Sport tabs */}
      <Tabs
        tabs={SPORT_TABS}
        active={sport}
        onChange={setSport}
        variant="pill"
        className="mb-6 max-w-xs"
      />

      {/* Last updated */}
      {lastUpdated && !loading && (
        <p className="text-[11px] text-white/25 mb-4">
          Updated: {new Date(lastUpdated).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      {/* Score content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={sport}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {/* Error state */}
          {isError && !loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 border border-dashed border-red-500/20 rounded-2xl bg-red-500/5">
              <p className="text-red-400/70 font-semibold text-sm">Failed to load scores</p>
              <button
                onClick={() => refresh()}
                className="px-4 py-2 bg-brand-surface border border-brand-border rounded-lg text-sm text-white/60 hover:text-white hover:border-white/20 transition-all"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && !isError && <ScoreSkeleton count={6} />}

          {/* ✅ [Fix] AI Match Analyst moved ABOVE the score grid — it was
              previously stuck at the very bottom of the page where most
              users would never scroll far enough to notice it. This is a
              standout feature; it now gets first billing. */}
          {!loading && !isError && hasLive && (
            <ErrorBoundary label="AI Match Analyst">
              <AIChatPanel matchContext={liveMatches} />
            </ErrorBoundary>
          )}

          {/* Live matches grid */}
          {!loading && !isError && hasLive && (
            <ErrorBoundary label="Live Score Grid">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {liveMatches.map((match, i) =>
                  sport === 'cricket'
                    ? <CricketScoreCard  key={match.id ?? i} match={match} />
                    : <FootballScoreCard key={match.id ?? i} match={match} />
                )}
              </div>
            </ErrorBoundary>
          )}

          {/* Empty state */}
          {!loading && !isError && !hasLive && (
            <EmptyState sport={sport} onRefresh={refresh} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Auto-refresh notice */}
      <p className="mt-8 text-center text-[11px] text-white/20">
        Scores auto-update every 2 minutes · Tab must be active
      </p>
    </>
  )
}

// ── Empty State ───────────────────────────────────────
function EmptyState({ sport, onRefresh }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-brand-border rounded-2xl gap-4 bg-brand-surface/50">
      <span className="text-5xl opacity-20">{sport === 'cricket' ? '🏏' : '⚽'}</span>
      <div className="text-center">
        <p className="text-white/40 font-semibold text-sm mb-1">No Live Matches Right Now</p>
        <p className="text-white/25 text-xs">Check back during match hours</p>
      </div>
      <button
        onClick={onRefresh}
        className="mt-2 px-4 py-2 bg-brand-surface border border-brand-border rounded-xl text-sm text-white/50 hover:text-white hover:border-white/20 transition-all"
      >
        Check Again
      </button>
    </div>
  )
}

// ── Icon ─────────────────────────────────────────────
function RefreshIcon({ className = '' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 ${className}`}>
      <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
    </svg>
  )
}
