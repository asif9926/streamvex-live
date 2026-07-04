// [Update #7] AIChatPanel.jsx — AI Match Analyst powered by Groq
// ✅ [Fix] conversation history এখন API-তে পাঠানো হয় → multi-turn chat কাজ করে
// ✅ [Bug Fix] "suggestion chips" used to send generic questions against
// ALL live matches bundled together — the AI couldn't tell which match
// was meant. Replaced with an explicit match picker so every question is
// scoped to one specific match.
// ✅ [Premium/scope upgrade] Backend now allows general cricket/football
// knowledge (squads, Man-of-the-Match analysis, history) alongside the
// live data, instead of being hard-restricted to only the score JSON.
// ✅ [Critical UX Fix] The match picker previously rendered EVERY live
// match (this API can return 40-50+ minor-league fixtures) as an
// unbounded grid, which completely buried the actual Live Score cards —
// the whole point of this page — below a wall of AI-picker buttons.
// Fixed with two changes:
//   1. The panel is now COLLAPSED by default — a single compact bar.
//      Score cards are the first thing visible on the page again; the AI
//      feature is one tap away for anyone who wants it, not forced on
//      everyone who just wants to check scores.
//   2. When expanded, the match list is a SEARCHABLE, height-capped,
//      scrollable list (not a page-length grid) — it can hold 50 matches
//      without ever pushing surrounding content around.

import { useState, useRef, useEffect, useMemo } from 'react'

const SUGGESTIONS = [
  'কে এগিয়ে আছে এখন?',
  'সংক্ষেপে ম্যাচের অবস্থা বলো',
  'Man of the Match কে হতে পারে?',
  'দুই দলের স্কোয়াড সম্পর্কে বলো',
]

// Build a short human label + subtitle for one match, regardless of
// whether it's a cricket or football match object.
function describeMatch(match) {
  const isCricket = Array.isArray(match.teams)
  const label = isCricket
    ? `${match.teams?.[0] ?? 'Team 1'} vs ${match.teams?.[1] ?? 'Team 2'}`
    : `${match.homeTeam ?? 'Home'} vs ${match.awayTeam ?? 'Away'}`
  const sub = isCricket
    ? (match.matchType || match.series || '')
    : (match.tournament || '')
  return { label, sub }
}

export default function AIChatPanel({ matchContext }) {
  // ✅ [Lint Fix] Memoized so this has a stable reference across renders
  // (avoids the array literal `matchContext ? [matchContext] : []` being
  // treated as "always new" by the filteredMatches useMemo below).
  const liveMatches = useMemo(
    () => (Array.isArray(matchContext) ? matchContext : (matchContext ? [matchContext] : [])),
    [matchContext]
  )

  // ✅ [UX Fix] Collapsed by default — this used to auto-render (and with
  // one match, auto-select it) every time the page loaded, forcing the AI
  // panel's full height on everyone. Now it only opens when someone
  // actually wants it.
  const [expanded, setExpanded]           = useState(false)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [matchSearch, setMatchSearch]     = useState('')
  const [messages, setMessages]           = useState([])
  const [input, setInput]                 = useState('')
  const [loading, setLoading]             = useState(false)
  const scrollRef = useRef(null)

  // নতুন message এলে auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // ✅ [UX Fix] Filter matches by team/tournament name so a 50-match list
  // is actually usable instead of endless scrolling.
  const filteredMatches = useMemo(() => {
    const described = liveMatches.map((m, i) => ({ match: m, i, ...describeMatch(m) }))
    if (!matchSearch.trim()) return described
    const q = matchSearch.trim().toLowerCase()
    return described.filter(({ label, sub }) =>
      label.toLowerCase().includes(q) || sub.toLowerCase().includes(q)
    )
  }, [liveMatches, matchSearch])

  const sendMessage = async (overrideText) => {
    const question = (overrideText ?? input).trim()
    if (!question || loading || !selectedMatch) return
    setInput('')

    const userMsg = { role: 'user', text: question }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          matchContext: selectedMatch,
          history: messages.map(m => ({
            role:    m.role === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { answer } = await res.json()
      setMessages(prev => [...prev, { role: 'ai', text: answer }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'সংযোগ সমস্যা। আবার চেষ্টা করুন।' }])
    } finally {
      setLoading(false)
    }
  }

  const clearChat   = () => setMessages([])
  const changeMatch = () => { setSelectedMatch(null); setMessages([]); setMatchSearch('') }
  const collapse    = () => setExpanded(false)

  const selected = selectedMatch ? describeMatch(selectedMatch) : null

  // ── Collapsed state: one compact bar, tap to open ─────
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-between gap-3 bg-brand-surface border border-brand-blue/25 rounded-2xl px-4 py-3 mb-5 hover:border-brand-blue/40 transition-all group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-brand-blue to-purple-500 flex items-center justify-center text-[11px] font-black text-white shadow-lg shadow-brand-blue/20">
            AI
          </span>
          <div className="min-w-0 text-left">
            <p className="text-sm font-bold text-white flex items-center gap-2">
              AI Match Analyst
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-brand-blue/20 to-purple-500/20 text-brand-blue border border-brand-blue/25 uppercase tracking-wider">
                Pro
              </span>
            </p>
            <p className="text-[11px] text-white/35 truncate">যেকোনো ম্যাচ, স্কোয়াড বা খেলোয়াড় নিয়ে প্রশ্ন করুন</p>
          </div>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
          className="w-4 h-4 text-white/30 group-hover:text-white/60 shrink-0 transition-colors">
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
    )
  }

  // ── Expanded state ─────────────────────────────────────
  return (
    <div className="relative bg-brand-surface border border-brand-blue/25 rounded-2xl p-4 mb-5 overflow-hidden">
      {/* Subtle glow — premium/featured feel */}
      <div className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 bg-brand-blue/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />

      <div className="relative flex items-start justify-between mb-1 gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-brand-blue to-purple-500 flex items-center justify-center text-[11px] font-black text-white shadow-lg shadow-brand-blue/20">
            AI
          </span>
          <div>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              AI Match Analyst
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-brand-blue/20 to-purple-500/20 text-brand-blue border border-brand-blue/25 uppercase tracking-wider">
                Pro
              </span>
            </p>
            <p className="text-[11px] text-white/35 mt-0.5">
              {selectedMatch
                ? 'ম্যাচ, দল, খেলোয়াড় — যেকোনো প্রশ্ন করুন'
                : 'নিচে থেকে একটা ম্যাচ বেছে নিন'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 mt-1">
          {messages.length > 0 && (
            <button onClick={clearChat} className="text-[10px] text-white/25 hover:text-white/50 transition-colors">
              Clear
            </button>
          )}
          {/* ✅ [UX Fix] Minimize — always available so the score grid below
              never stays hidden longer than the person wants. */}
          <button onClick={collapse} aria-label="Minimize" className="text-white/25 hover:text-white/50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M14.78 11.78a.75.75 0 0 1-1.06 0L10 8.06l-3.72 3.72a.75.75 0 1 1-1.06-1.06l4.25-4.25a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Match picker (shown until a match is selected) ──
          ✅ [UX Fix] Height-capped + scrollable + searchable — holds 50
          matches without ever growing past ~4 rows of visible height,
          so it can never push the score grid out of view. */}
      {!selectedMatch && (
        <div className="relative mt-3">
          {liveMatches.length > 6 && (
            <input
              type="text"
              value={matchSearch}
              onChange={e => setMatchSearch(e.target.value)}
              placeholder="দল বা লিগের নাম দিয়ে খুঁজুন..."
              className="w-full mb-2 bg-brand-elevated text-white text-xs rounded-lg px-3 py-2
                border border-brand-border focus:outline-none focus:border-brand-blue
                transition-colors placeholder-white/20"
            />
          )}
          <div className="max-h-56 overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-brand-border">
            {filteredMatches.length === 0 && (
              <p className="text-xs text-white/25 text-center py-4">কোনো ম্যাচ পাওয়া যায়নি।</p>
            )}
            {filteredMatches.map(({ match, i, label, sub }) => (
              <button
                key={match.id ?? i}
                onClick={() => setSelectedMatch(match)}
                className="flex items-center gap-2 text-left px-3 py-2 rounded-lg bg-brand-elevated border border-brand-border hover:border-brand-blue/40 hover:bg-brand-blue/5 transition-all"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 animate-pulse" />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-white/80 truncate">{label}</span>
                  {sub && <span className="block text-[10px] text-white/30 truncate">{sub}</span>}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Selected match indicator ── */}
      {selectedMatch && (
        <div className="relative mt-3 flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-brand-blue/10 border border-brand-blue/20">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 animate-pulse" />
            <span className="text-xs font-semibold text-white/70 truncate">{selected.label}</span>
            {selected.sub && <span className="text-[10px] text-white/30 truncate hidden sm:inline">· {selected.sub}</span>}
          </div>
          {liveMatches.length > 1 && (
            <button
              onClick={changeMatch}
              className="text-[10px] text-brand-blue/70 hover:text-brand-blue shrink-0 font-medium transition-colors"
            >
              ম্যাচ পরিবর্তন করুন
            </button>
          )}
        </div>
      )}

      {/* Message list */}
      {selectedMatch && (
        <div
          ref={scrollRef}
          className="relative space-y-2 max-h-48 overflow-y-auto my-3 pr-1"
        >
          {messages.length === 0 && (
            <div className="py-2">
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-[11px] px-2.5 py-1.5 rounded-lg bg-brand-elevated border border-brand-border text-white/50 hover:text-white hover:border-brand-blue/40 transition-colors text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`text-sm px-3 py-2 rounded-lg ${
              msg.role === 'user'
                ? 'bg-brand-blue/20 text-white ml-8 text-right'
                : 'bg-brand-elevated text-white/70 mr-8'
            }`}>
              {msg.text}
            </div>
          ))}
          {loading && (
            <div className="text-sm text-white/30 animate-pulse px-3 py-2 bg-brand-elevated rounded-lg mr-8">
              AI বিশ্লেষণ করছে…
            </div>
          )}
        </div>
      )}

      {/* Input — only usable once a match is selected */}
      {selectedMatch && (
        <div className="relative flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="ম্যাচ নিয়ে প্রশ্ন করুন..."
            className="flex-1 bg-brand-elevated text-white text-sm rounded-lg px-3 py-2
              border border-brand-border focus:outline-none focus:border-brand-blue
              transition-colors placeholder-white/20"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-brand-blue text-white text-sm font-semibold rounded-lg
              hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      )}
    </div>
  )
}