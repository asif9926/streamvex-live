// [Update #6] AIChatPanel.jsx — AI Match Analyst powered by Groq
// ✅ [Fix] conversation history এখন API-তে পাঠানো হয় → multi-turn chat কাজ করে
// ✅ [Bug Fix] Previous "suggestion chips" sent generic questions like
// "কে এগিয়ে আছে এখন?" against ALL live matches bundled together as
// context — with more than one live match, the AI had no way to know
// which match the person actually meant, so answers felt like it "didn't
// understand." Fixed by replacing generic suggestions with an explicit
// MATCH PICKER: the person taps which live match they mean first, and
// only THAT match's data is sent as context from then on — every
// question is now unambiguous.
// ✅ [Premium/scope upgrade] The AI was hard-restricted to only the live
// score JSON ("Never make up specific statistics — only use the data
// provided"), so it couldn't answer anything outside that narrow slice
// (e.g. "who might get Man of the Match", squad questions). The backend
// prompt now explicitly allows general cricket/football knowledge for
// things live-score data doesn't cover, while staying honest about the
// difference between "confirmed from live data" and "general knowledge."

import { useState, useRef, useEffect } from 'react'

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
  const liveMatches = Array.isArray(matchContext) ? matchContext : (matchContext ? [matchContext] : [])

  const [selectedMatch, setSelectedMatch] = useState(liveMatches.length === 1 ? liveMatches[0] : null)
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const scrollRef = useRef(null)

  // নতুন message এলে auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

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
          // ✅ [Bug Fix] Only the ONE selected match now — not every live
          // match bundled together — so the AI always knows exactly which
          // match is being discussed.
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
  const changeMatch = () => { setSelectedMatch(null); setMessages([]) }

  const selected = selectedMatch ? describeMatch(selectedMatch) : null

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
                : 'শুরু করতে নিচে থেকে একটা ম্যাচ বেছে নিন'}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-[10px] text-white/25 hover:text-white/50 transition-colors shrink-0 mt-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Match picker (shown until a match is selected) ── */}
      {!selectedMatch && (
        <div className="relative mt-3 flex flex-wrap gap-2">
          {liveMatches.map((match, i) => {
            const { label, sub } = describeMatch(match)
            return (
              <button
                key={match.id ?? i}
                onClick={() => setSelectedMatch(match)}
                className="flex items-center gap-2 text-left px-3 py-2 rounded-xl bg-brand-elevated border border-brand-border hover:border-brand-blue/40 hover:bg-brand-blue/5 transition-all"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 animate-pulse" />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-white/80 truncate max-w-[220px]">{label}</span>
                  {sub && <span className="block text-[10px] text-white/30 truncate max-w-[220px]">{sub}</span>}
                </span>
              </button>
            )
          })}
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