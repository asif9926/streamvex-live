// [Update #5] AIChatPanel.jsx — AI Match Analyst powered by Groq
// ✅ [Fix] conversation history এখন API-তে পাঠানো হয় → multi-turn chat কাজ করে
// ✅ [UX Fix] Moved to the top of LiveScore.jsx (was buried at the bottom,
// most users never scrolled far enough to find it). Added a clearer
// header + one-line description + quick-suggestion chips so first-time
// visitors immediately understand what this does and how to use it,
// instead of facing a bare empty input box.

import { useState, useRef, useEffect } from 'react'

const SUGGESTIONS = [
  'কে এগিয়ে আছে এখন?',
  'সংক্ষেপে ম্যাচের অবস্থা বলো',
  'এই মুহূর্তে সবচেয়ে গুরুত্বপূর্ণ ঘটনা কী?',
]

export default function AIChatPanel({ matchContext }) {
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
    if (!question || loading) return
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
          matchContext,
          // ✅ [Fix] conversation history পাঠাও → AI context মনে রাখবে
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

  const clearChat = () => setMessages([])

  return (
    <div className="relative bg-brand-surface border border-brand-blue/25 rounded-2xl p-4 mb-5 overflow-hidden">
      {/* ✅ [UX Fix] Subtle glow so this card visually stands out as a
          featured/premium capability now that it's the first thing users see */}
      <div className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 bg-brand-blue/10 rounded-full blur-3xl" />

      <div className="relative flex items-start justify-between mb-1 gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-brand-blue to-purple-500 flex items-center justify-center text-[11px] font-black text-white shadow-lg shadow-brand-blue/20">
            AI
          </span>
          <div>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              AI Match Analyst
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-brand-blue/15 text-brand-blue border border-brand-blue/25 uppercase tracking-wider">
                Beta
              </span>
            </p>
            {/* ✅ [UX Fix] One-line description — explains what this does
                before the user has to guess from an empty chat box */}
            <p className="text-[11px] text-white/35 mt-0.5">
              লাইভ ম্যাচ নিয়ে যেকোনো প্রশ্ন করুন — সাথে সাথে AI বিশ্লেষণ পাবেন
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

      {/* Message list */}
      <div
        ref={scrollRef}
        className="relative space-y-2 max-h-48 overflow-y-auto my-3 pr-1"
      >
        {messages.length === 0 && (
          <div className="py-2">
            {/* ✅ [UX Fix] Suggestion chips — one tap starts a conversation
                instead of staring at a blank input not knowing what to ask */}
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

      {/* Input */}
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
    </div>
  )
}
