// Tournament.jsx — Tournaments, series, results & upcoming fixtures
// Blueprint: src/pages/Tournament.jsx
// Hooks: useSeries, useMatchResults, useUpcoming, useSeriesMatches
// Components: TournamentTabs, SeriesList, MatchResultCard, UpcomingMatchCard, PageMeta

import { useState }                 from 'react'
import { motion, AnimatePresence }  from 'framer-motion'
import { useSeries }                from '../hooks/useSeries.js'
import { useFootballLeagues }       from '../hooks/useFootballLeagues.js'
import { useMatchResults }          from '../hooks/useMatchResults.js'
import { useUpcoming }              from '../hooks/useUpcoming.js'
import PageMeta                     from '../components/ui/PageMeta.jsx'
import SectionHeader                from '../components/ui/SectionHeader.jsx'
import TournamentTabs               from '../components/tournament/TournamentTabs.jsx'
import SeriesList                   from '../components/tournament/SeriesList.jsx'
import MatchResultCard              from '../components/tournament/MatchResultCard.jsx'
import UpcomingMatchCard            from '../components/tournament/UpcomingMatchCard.jsx'
import FootballScoreCard            from '../components/scoring/FootballScoreCard.jsx'
import { SkeletonCard }             from '../components/ui/Skeleton.jsx'


// ── Tab configs ───────────────────────────────────────
const SPORT_TABS = [
  { id: 'cricket',  label: '🏏 Cricket'  },
  { id: 'football', label: '⚽ Football' },
]

const CONTENT_TABS = [
  { id: 'series',   label: 'Series',   icon: '🏆' },
  { id: 'results',  label: 'Results',  icon: '✅' },
  { id: 'upcoming', label: 'Upcoming', icon: '📅' },
]

export default function Tournament() {
  const [sport,  setSport]  = useState('cricket')
  const [subTab, setSubTab] = useState('series')
  const [league] = useState('CL')  // fixed default — used only by football Upcoming tab filter

  // Reset subTab when sport changes
  const handleSportChange = (s) => {
    setSport(s)
    setSubTab('series')
  }

  return (
    <>
      <PageMeta
        title="Tournaments"
        description="Live cricket & football tournament data — series, results, and upcoming fixtures."
      />

      <SectionHeader title="🏆 Tournaments" subtitle="Series, results & upcoming fixtures" />

      {/* Sport tabs — pill style */}
      <div className="flex gap-2 mb-5">
        {SPORT_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => handleSportChange(t.id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border
              ${sport === t.id
                ? 'bg-brand-red text-white border-brand-red shadow-lg shadow-brand-red/20'
                : 'bg-brand-surface text-white/50 border-brand-border hover:text-white hover:border-white/20'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content sub-tabs — pill style */}
      <TournamentTabs
        tabs={CONTENT_TABS}
        active={subTab}
        onChange={setSubTab}
        className="mb-6"
      />

      {/* Animated content switch */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${sport}-${subTab}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {/* ── SERIES TAB ── */}
          {subTab === 'series' && sport === 'cricket' && (
            <CricketSeriesTab />
          )}
          {subTab === 'series' && sport === 'football' && (
            <FootballSeriesTab />
          )}

          {/* ── RESULTS TAB ── */}
          {subTab === 'results' && (
            <ResultsTab sport={sport} />
          )}

          {/* ── UPCOMING TAB ── */}
          {subTab === 'upcoming' && (
            <UpcomingTab sport={sport} league={league} />
          )}
        </motion.div>
      </AnimatePresence>
    </>
  )
}

// ── Cricket Series Tab ────────────────────────────────
function CricketSeriesTab() {
  const { series, loading, isError } = useSeries('cricket')

  if (isError) return <ErrorState label="series" />

  return <SeriesList series={series} loading={loading} />
}

// ── Football Series Tab ───────────────────────────────
// ✅ [Update] football-data.org has no single "all leagues" endpoint — it's
// one competition per request. So each league is shown as its own
// series-style card (same accordion UI as cricket); clicking one fetches
// and expands that league's fixtures inline, right under the card.
function FootballSeriesTab() {
  const { leagues, loading, isError } = useFootballLeagues()

  if (isError) return <ErrorState label="leagues" />

  return (
    <SeriesList
      series={leagues}
      loading={loading}
      renderMatches={(series) => <FootballLeagueMatches league={series.id} />}
    />
  )
}

function FootballLeagueMatches({ league }) {
  const { series: matches, loading, isError } = useSeries('football', { league })

  if (isError) {
    return <p className="text-red-400/60 text-sm py-6 text-center">Failed to load fixtures. Please try again later.</p>
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} className="h-24" />)}
      </div>
    )
  }

  if (!matches.length) {
    return <p className="text-white/40 text-sm py-6 text-center">No fixtures found for this league right now.</p>
  }

  return (
    <div className="max-h-[420px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-brand-border">
      {matches.map((match, i) => (
        <FootballScoreCard key={match.id ?? i} match={match} />
      ))}
    </div>
  )
}

// ── Results Tab ───────────────────────────────────────
function ResultsTab({ sport }) {
  const { results, loading, isError, hasResults } = useMatchResults(sport, { limit: 18 })

  if (isError) return <ErrorState label="results" />

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <SkeletonCard key={i} className="h-52" />)}
      </div>
    )
  }

  if (!hasResults) {
    return (
      <div className="py-14 text-center border border-dashed border-brand-border rounded-2xl text-white/30 text-sm">
        No recent {sport} results found.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {results.map((match, i) =>
        sport === 'cricket'
          ? <MatchResultCard   key={match.id ?? i} match={match} />
          : <FootballScoreCard key={match.id ?? i} match={match} />
      )}
    </div>
  )
}

// ── Upcoming Tab ──────────────────────────────────────
function UpcomingTab({ sport, league }) {
  const { upcoming, loading, isError, hasUpcoming } = useUpcoming(sport, {
    league,
    limit: 20,
  })

  if (isError) return <ErrorState label="upcoming fixtures" />

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(8)].map((_, i) => <SkeletonCard key={i} className="h-16" />)}
      </div>
    )
  }

  if (!hasUpcoming) {
    return (
      <div className="py-14 text-center border border-dashed border-brand-border rounded-2xl text-white/30 text-sm">
        No upcoming {sport} fixtures found.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {upcoming.map((match, i) => (
        <UpcomingMatchCard key={match.id ?? i} match={match} />
      ))}
    </div>
  )
}

// ── Error State ───────────────────────────────────────
function ErrorState({ label }) {
  return (
    <div className="py-14 text-center border border-dashed border-red-500/20 rounded-2xl bg-red-500/5">
      <p className="text-red-400/60 text-sm">Failed to load {label}. Please try again later.</p>
    </div>
  )
}
