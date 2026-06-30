// [Update #5] AIChatPanel.jsx — AI Match Analyst powered by Groq
// ✅ [Fix] conversation history এখন API-তে পাঠানো হয় → multi-turn chat কাজ করে

import { useState, useRef, useEffect } from 'react'

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

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const question = input.trim()
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
    <div className="bg-brand-surface border border-brand-border rounded-xl p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40 flex items-center gap-2">
          <span className="w-4 h-4 rounded-full bg-brand-blue/20 border border-brand-blue/30 flex items-center justify-center text-[8px]">AI</span>
          AI Match Analyst
        </p>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="space-y-2 max-h-48 overflow-y-auto mb-3 pr-1"
      >
        {messages.length === 0 && (
          <p className="text-xs text-white/20 text-center py-4">
            ম্যাচ নিয়ে যেকোনো প্রশ্ন করুন…
          </p>
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
      <div className="flex gap-2">
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
          onClick={sendMessage}
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
