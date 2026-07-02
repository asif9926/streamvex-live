// Watch.jsx — Full channel watch page with player, tabs, mini-player
// ✅ [Fix] useTournamentMatches এ .upcoming নেই → useUpcoming hook আলাদা import করা হয়েছে
// ✅ [Fix] PageMeta import সঠিক করা হয়েছে

import { useParams, Link, useNavigate }    from 'react-router-dom'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Helmet }                           from 'react-helmet-async'
import { motion }                           from 'framer-motion'
import { useChannelStore }                  from '../store/channelStore.js'
import VideoPlayer                          from '../components/player/VideoPlayer.jsx'
import LiveBadge                            from '../components/ui/LiveBadge.jsx'
import FavoriteButton                       from '../components/ui/FavoriteButton.jsx'
import ErrorBoundary                        from '../components/ui/ErrorBoundary.jsx'
import { useTournamentMatches }             from '../hooks/useLiveScores.js'
// ✅ [Fix] useUpcoming import — Watch.jsx CricketMatchesTab ও FootballMatchesTab এ দরকার
import { useUpcoming }                      from '../hooks/useUpcoming.js'

export default function Watch() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const getById     = useChannelStore(s => s.getChannelById)
  const channels    = useChannelStore(s => s.channels)
  const bdChannels  = useChannelStore(s => s.bdChannels)
  const allChannels = useMemo(() => [...channels, ...bdChannels], [channels, bdChannels])
  const channel     = getById(id)

  const isCricket  = channel?.sport === 'cricket'  || channel?.subcategory?.toLowerCase() === 'cricket'
  const isFootball = channel?.sport === 'football' || channel?.subcategory?.toLowerCase() === 'football'
  const isSports   = isCricket || isFootball

  const [activeTab, setActiveTab] = useState('info')

  // ✅ [Fix] Hooks moved above the early `if (!channel)` return below —
  // hooks must run unconditionally on every render (Rules of Hooks).
  // Calling these AFTER an early return caused "Rendered more hooks than
  // during the previous render" crashes when navigating between a valid
  // channel and an invalid one (e.g. /watch/5 → /watch/does-not-exist).
  const playerRef  = useRef(null)
  const [isMini, setIsMini]       = useState(false)
  // ✅ [Audit Fix] miniHidden = user dismissed the floating mini-player chrome
  // (via the X button) while still scrolled past the main player. Playback
  // keeps running — this only hides the floating overlay, matching the
  // original UX intent (closing the corner widget shouldn't stop the stream).
  const [miniHidden, setMiniHidden] = useState(false)

  useEffect(() => {
    if (!channel) return   // guard: nothing to track if channel not found
    const onScroll = () => {
      if (!playerRef.current) return
      const rect = playerRef.current.getBoundingClientRect()
      const gone = rect.bottom < 56
      setIsMini(gone)
      if (!gone) setMiniHidden(false)   // reset dismiss-state once back at the top
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [channel])

  if (!channel) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-4 text-center p-8">
        <span className="text-5xl opacity-30">📺</span>
        <p className="text-white/40 text-lg font-medium">Channel not found.</p>
        <Link to="/" className="px-5 py-2.5 bg-brand-red text-white rounded-lg font-semibold text-sm hover:bg-red-700 transition-colors">
          Go Home
        </Link>
      </div>
    )
  }

  const related = allChannels
    .filter(c => c.id !== channel.id && (c.sport === channel.sport || c.subcategory === channel.subcategory))
    .slice(0, 6)

  const TABS = [
    { id: 'info',    label: isSports ? '📡 Stream Info' : 'ℹ️ About' },
    ...(isCricket  ? [{ id: 'matches', label: '🏏 Cricket Matches'  }] : []),
    ...(isFootball ? [{ id: 'matches', label: '⚽ Football Matches'  }] : []),
    { id: 'related', label: '📺 Related' },
  ]

  return (
    <div className="min-h-screen bg-brand-bg">
      <Helmet>
        <title>{channel.currentMatch || channel.name} — StreamVex</title>
        <meta name="description" content={`Watch ${channel.name} live on StreamVex. ${channel.currentMatch ? channel.currentMatch + ' — live streaming in HD.' : 'Live streaming in HD quality.'}`} />
        <meta name="robots" content="index, follow" />
        <meta property="og:type"        content="video.other" />
        <meta property="og:site_name"   content="StreamVex" />
        <meta property="og:title"       content={`${channel.currentMatch || channel.name} — Live on StreamVex`} />
        <meta property="og:description" content={`Watch ${channel.name} live on StreamVex. ${channel.currentMatch || 'Live sports streaming in HD.'}`} />
        <meta property="og:image"       content={channel.logo || 'https://streamvex.live/og-default.png'} />
        <meta property="og:image:width"  content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url"         content={`https://streamvex.live/watch/${channel.id}`} />
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content={`${channel.currentMatch || channel.name} — Live on StreamVex`} />
        <meta name="twitter:description" content={`Watch ${channel.name} live on StreamVex.`} />
        <meta name="twitter:image"       content={channel.logo || 'https://streamvex.live/og-default.png'} />
      </Helmet>

      {/* ── Top Nav ── */}
      <div className="sticky top-0 z-50 glass border-b border-brand-border h-14 flex items-center gap-3 px-4">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors p-1">
          <BackIcon />Back
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{channel.currentMatch || channel.name}</p>
          <p className="text-xs text-white/40">{channel.name}</p>
        </div>
        <FavoriteButton channelId={channel.id} />
        <Link to="/" className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-6 h-6 rounded bg-brand-red flex items-center justify-center"><TvIcon /></div>
          <span className="font-black text-sm hidden sm:block">Stream<span className="text-brand-red">Vex</span></span>
        </Link>
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-col xl:flex-row min-h-[calc(100vh-56px)]">
        <div className="flex-1 min-w-0 p-4 xl:p-6 xl:pr-3">

          {/* ── Video player ──────────────────────────────────────────
              ✅ [Audit Fix — Critical] Previously this rendered a SECOND,
              independent <VideoPlayer> for the floating mini view, which
              meant two simultaneous HLS sessions playing the same stream
              at once — double audio, double bandwidth/CPU. Now there is
              exactly one <VideoPlayer> instance; only its CSS position
              changes between "inline" and "floating corner" as the user
              scrolls, so playback never restarts or duplicates. */}
          <div ref={playerRef}>
            {/* Placeholder — keeps this spot's height reserved once the
                real player switches to `position: fixed` below, so the
                rest of the page doesn't jump. */}
            {isMini && <div className="w-full rounded-xl bg-black/40" style={{ aspectRatio: '16/9' }} />}

            <motion.div
              initial={{ opacity: 0, scale: 0.99 }}
              // ✅ [Bug Fix] opacity is now driven ONLY through this `animate` prop.
              // Previously a Tailwind `opacity-0` class was applied via `className`
              // while this prop kept a hardcoded `opacity: 1` — Framer Motion writes
              // opacity as an inline style, which always wins over a CSS class, so
              // the X (dismiss) button visually did nothing even though it *was*
              // correctly flipping `miniHidden` and disabling pointer-events.
              animate={{ opacity: isMini && miniHidden ? 0 : 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className={
                isMini
                  ? `fixed bottom-5 right-4 z-[999] w-72 sm:w-80 shadow-2xl shadow-black/60 rounded-xl overflow-hidden border border-white/10 ${
                      miniHidden ? 'pointer-events-none' : ''
                    }`
                  : ''
              }
            >
              {isMini && (
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-brand-elevated border-b border-white/10">
                  <div className="flex items-center gap-2 min-w-0">
                    {channel.isLive && (
                      <span className="flex items-center gap-1 text-[9px] font-black text-brand-red shrink-0">
                        <span className="w-1.5 h-1.5 bg-brand-red rounded-full animate-ping" />LIVE
                      </span>
                    )}
                    <p className="text-xs font-semibold text-white truncate">{channel.currentMatch || channel.name}</p>
                  </div>
                  <button
                    onClick={() => { setIsMini(false); playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                    className="shrink-0 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    aria-label="Expand player"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-white/70 rotate-180">
                      <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button onClick={() => setMiniHidden(true)}
                    className="shrink-0 w-6 h-6 rounded-full bg-white/10 hover:bg-red-500/40 flex items-center justify-center transition-colors"
                    aria-label="Hide mini player">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-white/60">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                    </svg>
                  </button>
                </div>
              )}
              <ErrorBoundary label="Video Player">
                <VideoPlayer streamUrl={channel.streamUrl} backupUrl={channel.backupUrl} title={channel.currentMatch} skipReferer={channel.skipReferer} />
              </ErrorBoundary>
            </motion.div>
          </div>

          {/* Channel info bar */}
          <div className="flex items-center gap-4 mt-4 pb-4 border-b border-brand-border">
            <div className="w-12 h-12 rounded-xl bg-brand-elevated flex items-center justify-center border border-brand-border overflow-hidden flex-shrink-0">
              <img src={channel.logo} alt={channel.name} className="w-10 h-10 object-contain"
                onError={e => { e.target.style.display = 'none' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-white">{channel.currentMatch || channel.name}</h1>
                {channel.isLive && <LiveBadge small />}
                {channel.isPremium && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500 text-black uppercase">Premium</span>
                )}
              </div>
              <p className="text-sm text-white/40 mt-0.5">{channel.name} · {channel.subcategory}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 mt-4 border-b border-brand-border overflow-x-auto scrollbar-hide">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px whitespace-nowrap
                  ${activeTab === tab.id ? 'border-brand-red text-white' : 'border-transparent text-white/40 hover:text-white/60'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-5">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              {activeTab === 'info'    && <InfoTab channel={channel} isSports={isSports} />}
              {activeTab === 'matches' && isCricket  && <CricketMatchesTab />}
              {activeTab === 'matches' && isFootball && <FootballMatchesTab />}
              {activeTab === 'related' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {related.length > 0
                    ? related.map(ch => <RelatedCard key={ch.id} channel={ch} />)
                    : <p className="text-white/30 text-sm py-8 col-span-2 text-center">No related channels found.</p>
                  }
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden xl:flex flex-col w-80 flex-shrink-0 border-l border-brand-border p-4 gap-3 overflow-y-auto max-h-[calc(100vh-56px)] sticky top-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-1">Related Channels</p>
          {related.length > 0
            ? related.map(ch => <RelatedCard key={ch.id} channel={ch} />)
            : <p className="text-white/30 text-sm text-center py-8">No related channels.</p>
          }
        </div>
      </div>
    </div>
  )
}

// ── Info Tab ──────────────────────────────────────────
function InfoTab({ channel, isSports }) {
  const infoItems = [
    { label: 'Channel',   value: channel.name },
    { label: 'Category',  value: channel.subcategory || channel.category },
    { label: 'Status',    value: channel.isLive ? '🔴 Live Now' : '⚫ Offline' },
    { label: 'Quality',   value: 'Auto (up to HD)' },
    { label: 'Access',    value: channel.isPremium ? '⭐ Premium' : '✅ Free' },
    { label: 'Language',  value: channel.language || 'Multi' },
  ]
  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {infoItems.map(item => (
          <div key={item.label} className="bg-brand-elevated rounded-xl px-4 py-3 border border-brand-border">
            <dt className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">{item.label}</dt>
            <dd className="text-sm font-semibold text-white">{item.value}</dd>
          </div>
        ))}
      </dl>
      <div className="bg-brand-surface border border-brand-border rounded-xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3">About this channel</h3>
        <p className="text-sm text-white/60 leading-relaxed">
          {channel.description || (isSports
            ? `${channel.name} is a premium sports broadcasting channel delivering live matches, highlights, expert commentary and analysis around the clock.`
            : `${channel.name} is a general entertainment channel offering news, drama, and lifestyle programming.`
          )}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {[
          { icon: '📶', text: 'For best experience use a stable internet connection (5 Mbps+)' },
          { icon: '🔊', text: 'Use headphones or external speakers for better audio quality' },
          { icon: '🖥️', text: 'Switch to fullscreen for an immersive viewing experience' },
        ].map(tip => (
          <div key={tip.text} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-brand-elevated/50 border border-brand-border">
            <span className="text-base mt-0.5">{tip.icon}</span>
            <p className="text-xs text-white/40 leading-relaxed">{tip.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Cricket Matches Tab ───────────────────────────────
// ✅ [Fix] useUpcoming hook আলাদাভাবে call করা হয়েছে — useTournamentMatches এ .upcoming নেই
function CricketMatchesTab() {
  const { results,  loading: rLoading } = useTournamentMatches('cricket')
  const { upcoming, loading: uLoading } = useUpcoming('cricket', { limit: 5 })
  const loading = rLoading || uLoading

  if (loading) return (
    <div className="flex flex-col gap-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-28 bg-brand-elevated/50 rounded-xl animate-pulse" />
      ))}
    </div>
  )

  return (
    <div className="flex flex-col gap-8">
      <Section label="✅ Recent Results" linkTo="/tournament">
        {results.length > 0 ? (
          <div className="flex flex-col gap-3">
            {results.slice(0, 2).map((m, i) => <CricketMatchRow key={m.id ?? i} match={m} isLive={false} />)}
          </div>
        ) : (
          <p className="text-white/30 text-sm py-6 text-center">No recent results available</p>
        )}
      </Section>
      {upcoming.length > 0 && (
        <Section label="📅 Upcoming Matches" linkTo="/tournament">
          <div className="flex flex-col gap-2">
            {upcoming.map((m, i) => <UpcomingCricketRow key={m.id ?? i} match={m} />)}
          </div>
        </Section>
      )}
    </div>
  )
}

// ── Football Matches Tab ──────────────────────────────
// ✅ [Fix] same fix — useUpcoming separately
function FootballMatchesTab() {
  const { results,  loading: rLoading } = useTournamentMatches('football')
  const { upcoming, loading: uLoading } = useUpcoming('football', { limit: 5 })
  const loading = rLoading || uLoading

  if (loading) return (
    <div className="flex flex-col gap-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-20 bg-brand-elevated/50 rounded-xl animate-pulse" />
      ))}
    </div>
  )

  return (
    <div className="flex flex-col gap-8">
      <Section label="✅ Recent Results" linkTo="/tournament">
        {results.length > 0 ? (
          <div className="flex flex-col gap-3">
            {results.slice(0, 2).map((m, i) => <FootballMatchRow key={m.id ?? i} match={m} isLive={false} />)}
          </div>
        ) : (
          <p className="text-white/30 text-sm py-6 text-center">No recent results available</p>
        )}
      </Section>
      {upcoming.length > 0 && (
        <Section label="📅 Upcoming Fixtures" linkTo="/tournament">
          <div className="flex flex-col gap-2">
            {upcoming.map((m, i) => <UpcomingFootballRow key={m.id ?? i} match={m} />)}
          </div>
        </Section>
      )}
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────
function Section({ label, linkTo, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">{label}</h3>
        {linkTo && <Link to={linkTo} className="text-[11px] text-brand-red hover:text-red-400 font-bold transition-colors">See All →</Link>}
      </div>
      {children}
    </div>
  )
}

function CricketMatchRow({ match, isLive }) {
  const fmtStyle = {
    T20:  'bg-purple-500/15 text-purple-400 border-purple-500/20',
    Test: 'bg-amber-500/10  text-amber-400  border-amber-500/20',
    ODI:  'bg-blue-500/15   text-blue-400   border-blue-500/20',
  }[match.format?.toUpperCase()] || 'bg-white/5 text-white/30 border-white/10'

  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl px-4 py-3 flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-white/30 truncate">{match.matchType}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {match.format && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${fmtStyle}`}>{match.format}</span>}
          {isLive
            ? <span className="flex items-center gap-1 text-[9px] font-black text-brand-red bg-brand-red/10 border border-brand-red/20 px-2 py-0.5 rounded-full"><span className="w-1 h-1 bg-brand-red rounded-full animate-ping" />LIVE</span>
            : <span className="text-[9px] font-bold text-white/20 bg-white/5 border border-white/8 px-2 py-0.5 rounded-full">FT</span>
          }
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center gap-2">
          <span className="text-sm font-bold text-white truncate">{match.teams?.[0]}</span>
          <span className="text-sm font-black text-white tabular-nums shrink-0">{match.score?.[0]?.r || '—'}</span>
        </div>
        <div className="flex justify-between items-center gap-2">
          <span className="text-sm font-medium text-white/50 truncate">{match.teams?.[1]}</span>
          <span className="text-sm font-black text-white/50 tabular-nums shrink-0">{match.score?.[1]?.r || '—'}</span>
        </div>
      </div>
      {match.status && (
        <p className={`text-[11px] font-medium truncate pt-1 border-t border-brand-border ${isLive ? 'text-green-400/80' : 'text-white/30'}`}>
          {match.status}
        </p>
      )}
    </div>
  )
}

function UpcomingCricketRow({ match }) {
  const fmtStyle = {
    T20:  'bg-purple-500/15 text-purple-400 border-purple-500/20',
    Test: 'bg-amber-500/10  text-amber-400  border-amber-500/20',
    ODI:  'bg-blue-500/15   text-blue-400   border-blue-500/20',
  }[match.format] || 'bg-white/5 text-white/30 border-white/10'

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-surface border border-brand-border">
      <div className="flex flex-col items-center shrink-0 w-12 text-center">
        <span className="text-[10px] font-bold text-white/50 leading-tight">{match.date?.split(',')[0]}</span>
        <span className="text-[9px] text-white/25 mt-0.5">{match.time}</span>
      </div>
      <div className="w-px h-8 bg-brand-border shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{match.name}</p>
        <p className="text-[10px] text-white/30 mt-0.5 truncate">{match.matchType} · {match.venue}</p>
      </div>
      {match.format && <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border shrink-0 ${fmtStyle}`}>{match.format}</span>}
    </div>
  )
}

function FootballMatchRow({ match, isLive }) {
  const hWin = !isLive && parseInt(match.homeScore) > parseInt(match.awayScore)
  const aWin = !isLive && parseInt(match.awayScore) > parseInt(match.homeScore)
  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl px-4 py-3 flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-white/30 truncate">{match.tournament}</span>
        {isLive
          ? <span className="flex items-center gap-1 text-[9px] font-black text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full shrink-0"><span className="w-1 h-1 bg-green-400 rounded-full animate-ping" />{match.minute ? `${match.minute}'` : 'LIVE'}</span>
          : <span className="text-[9px] font-bold text-white/20 bg-white/5 border border-white/8 px-2 py-0.5 rounded-full shrink-0">FT</span>
        }
      </div>
      <div className="flex items-center gap-3">
        <span className={`flex-1 text-sm font-bold truncate ${hWin ? 'text-white' : 'text-white/60'}`}>{match.homeTeam}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-lg font-black tabular-nums ${hWin ? 'text-white' : 'text-white/50'}`}>{match.homeScore}</span>
          <span className="text-white/20 text-xs">—</span>
          <span className={`text-lg font-black tabular-nums ${aWin ? 'text-white' : 'text-white/50'}`}>{match.awayScore}</span>
        </div>
        <span className={`flex-1 text-sm font-bold truncate text-right ${aWin ? 'text-white' : 'text-white/60'}`}>{match.awayTeam}</span>
      </div>
    </div>
  )
}

function UpcomingFootballRow({ match }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-surface border border-brand-border">
      <div className="flex flex-col items-center shrink-0 w-12 text-center">
        <span className="text-[10px] font-bold text-white/50 leading-tight">{match.date?.split(',')[0]}</span>
        <span className="text-[9px] text-white/25 mt-0.5">{match.time}</span>
      </div>
      <div className="w-px h-8 bg-brand-border shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{match.name}</p>
        <p className="text-[10px] text-white/30 mt-0.5 truncate">{match.tournament} · {match.venue}</p>
      </div>
    </div>
  )
}

function RelatedCard({ channel }) {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate(`/watch/${channel.id}`)}
      className="flex items-center gap-3 p-3 rounded-xl bg-brand-surface hover:bg-brand-elevated border border-brand-border hover:border-white/20 transition-all text-left group w-full">
      <div className="w-10 h-10 rounded-lg bg-brand-elevated flex items-center justify-center overflow-hidden flex-shrink-0 border border-brand-border">
        <img src={channel.logo} alt={channel.name} className="w-8 h-8 object-contain"
          loading="lazy" decoding="async"
          onError={e => { e.target.style.display = 'none' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white group-hover:text-brand-red transition-colors truncate">{channel.name}</p>
        <p className="text-xs text-white/40 truncate">{channel.currentMatch}</p>
      </div>
      {channel.isLive && <LiveBadge small />}
    </button>
  )
}

function BackIcon() { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" /></svg> }
function TvIcon()   { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5"><path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06Z" /></svg> }
