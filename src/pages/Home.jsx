// Home.jsx — StreamVex Live homepage
// Blueprint: src/pages/Home.jsx
// Imports: ChannelGrid, SectionHeader, LiveBadge, PageMeta
// Data: channelStore (static), useTournamentMatches (recent results)

import { Link }                    from 'react-router-dom'
import { motion }                  from 'framer-motion'
import { useChannelStore }         from '../store/channelStore.js'
import { useTournamentMatches }    from '../hooks/useLiveScores.js'
import ChannelGrid                 from '../components/channels/ChannelGrid.jsx'
import SectionHeader               from '../components/ui/SectionHeader.jsx'
import LiveBadge                   from '../components/ui/LiveBadge.jsx'
import PageMeta                    from '../components/ui/PageMeta.jsx'
import { SkeletonCard }            from '../components/ui/Skeleton.jsx'
import MatchResultCard             from '../components/tournament/MatchResultCard.jsx'
import FootballScoreCard           from '../components/scoring/FootballScoreCard.jsx'

// ── Animation helper ──────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 20 },
  animate:    { opacity: 1, y: 0  },
  transition: { duration: 0.4, delay, ease: 'easeOut' },
})

// ── Explore cards config ──────────────────────────────
const EXPLORE_CARDS = [
  { to: '/live-score',    label: 'Live Scores', emoji: '⚡', from: 'from-green-900/40',  live: true  },
  { to: '/sports',        label: 'Sports',      emoji: '⚽', from: 'from-blue-900/40',   live: false },
  { to: '/bangladesh-tv', label: 'BD TV',       emoji: '📺', from: 'from-teal-900/40',   live: false },
  { to: '/tournament',    label: 'Tournaments', emoji: '🏆', from: 'from-yellow-900/40', live: false },
  { to: '/favorites',     label: 'Favorites',   emoji: '⭐', from: 'from-purple-900/40', live: false },
]

export default function Home() {
  const channels   = useChannelStore(s => s.channels)
  const bdChannels = useChannelStore(s => s.bdChannels)

  const liveChannels = channels.filter(c => c.isLive).slice(0, 8)
  const bdLive       = bdChannels.filter(c => c.isLive).slice(0, 4)
  const totalChannels = channels.length + bdChannels.length

  return (
    <>
      <PageMeta
        title="Home"
        description="Watch live sports streaming — cricket, football, and Bangladesh TV channels. Free HD streaming."
      />

      {/* ── Announcement ticker ── */}
      <motion.div {...fadeUp(0)}
        className="mb-8 relative overflow-hidden rounded-xl bg-gradient-to-r from-brand-surface via-brand-elevated to-brand-surface border border-brand-border"
      >
        <div className="absolute left-0 top-0 bottom-0 w-14 bg-gradient-to-r from-brand-surface to-transparent z-10 flex items-center justify-center border-r border-white/5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-red opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-red shadow-[0_0_8px_#E50914]" />
          </span>
        </div>
        <div className="py-3.5 pl-16 pr-4 overflow-hidden">
          <div className="animate-marquee whitespace-nowrap text-[13px] font-semibold text-white/80 tracking-wide inline-block">
            <span className="text-brand-red font-black mr-3">🔥 LIVE:</span>
            Welcome to StreamVex Live! Premium Ad-Free Sports Streaming.&nbsp;&nbsp;
            <span className="text-green-400 mx-4">🏏 ICC Tournaments &amp; Franchise Cricket</span>
            <span className="text-blue-400 mx-4">⚽ Top Football Leagues &amp; World Cup</span>
            <span className="text-yellow-400 mx-4">📺 Bangladesh TV Channels Live</span>
            Real-Time Scores · HD Quality · No Registration Required.
          </div>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-brand-surface to-transparent z-10 pointer-events-none" />
      </motion.div>

      {/* ── Hero ── */}
      <motion.div {...fadeUp(0.05)}
        className="relative rounded-2xl overflow-hidden mb-10 bg-brand-elevated border border-brand-border"
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 bg-gradient-radial from-brand-red/15 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-bg/80 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-brand-red/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 right-36 w-48 h-48 bg-purple-500/8 rounded-full blur-2xl pointer-events-none" />

        <div className="relative px-6 py-12 sm:px-10 sm:py-16 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          {/* Left — copy */}
          <div className="max-w-lg">
            <div className="flex items-center gap-2 mb-4">
              <LiveBadge />
              <span className="text-white/50 text-sm">{liveChannels.length} channels live now</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight mb-3 tracking-tight">
              Watch Live Sports{' '}
              <span className="gradient-text">Anytime.</span>
            </h1>
            <p className="text-white/50 text-base leading-relaxed max-w-md">
              Cricket, football, motorsport and more — all in one place.
              No registration. No ads. No hassle.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <Link to="/sports"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-red hover:bg-red-700 text-white font-semibold rounded-xl transition-colors text-sm shadow-lg shadow-brand-red/25">
                <PlayIcon /> Browse Channels
              </Link>
              <Link to="/live-score"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/25 text-green-400 font-semibold rounded-xl transition-all text-sm">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-ping" /> Live Scores
              </Link>
              <Link to="/bangladesh-tv"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-brand-border text-white font-medium rounded-xl transition-colors text-sm">
                🇧🇩 Bangladesh TV
              </Link>
            </div>
          </div>

          {/* Right — stats */}
          <div className="flex flex-row sm:flex-col gap-5 sm:gap-6 shrink-0">
            {[
              { value: `${totalChannels}+`, label: 'Total Channels' },
              { value: `${liveChannels.length}`,  label: 'Live Now'       },
              { value: 'HD',                       label: 'Stream Quality' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-black gradient-text">{stat.value}</p>
                <p className="text-xs text-white/40 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Live Sports ── */}
      {liveChannels.length > 0 && (
        <motion.section {...fadeUp(0.1)} className="mb-10">
          <SectionHeader title="🔴 Live Sports" subtitle="Currently streaming channels">
            <Link to="/sports" className="text-sm text-brand-red hover:text-red-400 font-semibold transition-colors">
              View All →
            </Link>
          </SectionHeader>
          <ChannelGrid channels={liveChannels} />
        </motion.section>
      )}

      {/* ── Bangladesh TV ── */}
      {bdLive.length > 0 && (
        <motion.section {...fadeUp(0.15)} className="mb-10">
          <SectionHeader title="🇧🇩 Bangladesh TV" subtitle="Local channels live now">
            <Link to="/bangladesh-tv" className="text-sm text-brand-red hover:text-red-400 font-semibold transition-colors">
              View All →
            </Link>
          </SectionHeader>
          <ChannelGrid channels={bdLive} />
        </motion.section>
      )}

      {/* ── Recent Results — Cricket + Football ── */}
      <motion.section {...fadeUp(0.2)} className="mb-10">
        <SectionHeader title="🕒 Recent Results" subtitle="Latest completed matches">
          <Link to="/tournament" className="text-sm text-brand-red hover:text-red-400 font-semibold transition-colors">
            All Results →
          </Link>
        </SectionHeader>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentResultsPanel sport="cricket"  label="🏏 Cricket" />
          <RecentResultsPanel sport="football" label="⚽ Football" />
        </div>
      </motion.section>

      {/* ── Explore cards ── */}
      <motion.section {...fadeUp(0.25)}>
        <SectionHeader title="Explore" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {EXPLORE_CARDS.map(card => (
            <Link key={card.to} to={card.to}
              className={`group relative flex flex-col items-center justify-center gap-2.5
                py-8 rounded-xl border border-brand-border
                bg-gradient-to-br ${card.from} to-transparent
                hover:border-white/20 hover:-translate-y-0.5 transition-all overflow-hidden`}
            >
              {card.live && (
                <span className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[9px] font-black text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded-full">
                  <span className="w-1 h-1 bg-green-400 rounded-full animate-ping" /> LIVE
                </span>
              )}
              <span className="text-3xl">{card.emoji}</span>
              <span className="text-xs font-bold text-white/60 group-hover:text-white transition-colors">{card.label}</span>
            </Link>
          ))}
        </div>
      </motion.section>
    </>
  )
}

// ── Recent Results Panel ──────────────────────────────
function RecentResultsPanel({ sport, label }) {
  const { results, loading } = useTournamentMatches(sport)
  const shown = results.slice(0, 3)

  return (
    <div className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border">
        <span className="text-sm font-bold text-white/80">{label}</span>
        <Link to="/tournament" className="text-[11px] text-white/40 hover:text-white transition-colors">
          See All →
        </Link>
      </div>
      <div className="p-4 flex flex-col gap-3 min-h-[140px]">
        {loading ? (
          [...Array(3)].map((_, i) => <SkeletonCard key={i} className="h-20" />)
        ) : shown.length > 0 ? (
          sport === 'cricket'
            ? shown.map((m, i) => <MatchResultCard key={m.id ?? i} match={m} />)
            : shown.map((m, i) => <FootballScoreCard key={m.id ?? i} match={m} />)
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/25 text-sm">No recent results</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────
function PlayIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" />
    </svg>
  )
}
