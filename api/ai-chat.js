// api/ai-chat.js — [Update #5] AI Match Analyst Backend
// Blueprint: Groq API (llama3-70b-8192) → fast AI response
// Used by: src/components/scoring/AIChatPanel.jsx
//
// Env vars required:
//   GROQ_API_KEY  — groq.com থেকে free key নাও (blazing fast, free tier)
//   ALLOWED_ORIGIN — production domain (e.g. https://streamvex-live.vercel.app)
//
// ✅ [Fix #1] history[] now processed — multi-turn conversation works
// ✅ [Fix #2] rateLimiter Map cleanup — unbounded memory leak fixed
// ✅ [Fix #3] matchContext size capped — prompt injection + cost protection
// ✅ [Fix #4] CORS locked to ALLOWED_ORIGIN env var

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions'
// ✅ [Audit Fix — Critical] 'llama3-70b-8192' was fully decommissioned by Groq
// (May 2025) — every request was returning HTTP 400 invalid_request_error.
// 'llama-3.3-70b-versatile' (the direct successor) has since also been
// deprecated (June 2026 notice). Using Groq's current recommended
// production model instead.
const MODEL      = 'openai/gpt-oss-120b'
// ✅ [Scope upgrade] 200 tokens was tuned for terse live-score updates only.
// Squad lists and multi-point analysis (now explicitly allowed) need more
// room — 350 still keeps answers concise (well under a short paragraph)
// while not truncating mid-list.
const MAX_TOKENS = 350

// ── Rate limiter ──────────────────────────────────────
// ✅ [Fix #2] cleanup: Map এ 500+ IP জমলে পুরনোগুলো মুছে ফেলো
// Vercel serverless এ cold start-এ এমনিও reset হয়, কিন্তু warm instance এ leak ঠেকাতে হবে
const rateLimiter  = new Map()
const RL_WINDOW    = 60_000   // 1 minute
const RL_LIMIT     = 10       // 10 req/min per IP
const RL_MAP_LIMIT = 500      // max unique IPs to track before cleanup

function checkRateLimit(clientIp) {
  const now = Date.now()

  // ✅ [Fix #2] Map too large → purge expired entries
  if (rateLimiter.size > RL_MAP_LIMIT) {
    for (const [ip, rec] of rateLimiter.entries()) {
      if (now - rec.start > RL_WINDOW) rateLimiter.delete(ip)
    }
  }

  const record = rateLimiter.get(clientIp) || { count: 0, start: now }
  if (now - record.start > RL_WINDOW) {
    record.count = 0
    record.start = now
  }
  record.count++
  rateLimiter.set(clientIp, record)
  return record.count > RL_LIMIT
}

export default async function handler(req, res) {
  // ── CORS ─────────────────────────────────────────────
  // ✅ [Fix #4] ALLOWED_ORIGIN env var — না থাকলে same-origin fallback
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://streamvex-live.vercel.app'
  res.setHeader('Access-Control-Allow-Origin',  allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // ── Method check ─────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ answer: 'Method not allowed' })
  }

  // ── Rate limiting ─────────────────────────────────────
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'
  if (checkRateLimit(clientIp)) {
    return res.status(429).json({ answer: 'অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন। (Rate limit exceeded)' })
  }

  // ── Input validation ─────────────────────────────────
  // ✅ [Fix #1] history[] destructure করা হয়েছে
  const { question, matchContext, history } = req.body || {}

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ answer: 'প্রশ্ন লিখুন।' })
  }
  if (question.length > 500) {
    return res.status(400).json({ answer: 'প্রশ্ন ৫০০ অক্ষরের বেশি হওয়া যাবে না।' })
  }

  // ✅ [Fix #3] matchContext size cap — 2000 chars max
  const MAX_CONTEXT_LEN = 2000
  let safeContext = ''
  if (matchContext) {
    const raw = typeof matchContext === 'string'
      ? matchContext
      : JSON.stringify(matchContext, null, 2)
    safeContext = raw.slice(0, MAX_CONTEXT_LEN)
    if (raw.length > MAX_CONTEXT_LEN) safeContext += '\n[...truncated]'
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({ answer: 'AI সার্ভিস কনফিগার করা হয়নি।' })
  }

  // ── Build conversation messages ───────────────────────
  // ✅ [Fix #1] history[] → Groq messages format এ convert করো
  // ✅ [Scope upgrade] Previously the prompt said "Never make up specific
  // statistics — only use the data provided," which accidentally blocked
  // the AI from answering ANYTHING outside the narrow live-score JSON —
  // including things it genuinely knows from training (typical squads,
  // player backgrounds, team history) or reasonable analysis (who's
  // favoured for Man of the Match based on current performance). The
  // restriction now applies specifically to LIVE, IN-PROGRESS facts
  // (current score, wickets, minute, events) — general cricket/football
  // knowledge is explicitly allowed, with a requirement to be clear about
  // which is which so the person isn't misled into thinking a knowledge-
  // based guess is confirmed live data.
  const systemPrompt =
`You are a knowledgeable cricket and football analyst for StreamVex Live, with strong general knowledge of both sports — teams, squads, players, history, and records — in addition to the live match data provided below.
${safeContext ? `Live match data (authoritative for anything happening in THIS match right now):\n${safeContext}\n` : 'No live match data was provided for this conversation.'}

How to answer:
- For the current score, wickets/goals, overs/minute, or anything about what's happening in this specific match right now: rely ONLY on the live match data above. Never invent live numbers that aren't there.
- For everything else the live data doesn't cover — squads, player backgrounds, team history, past head-to-head, who's statistically in form, who might be a Man of the Match contender based on the current situation — freely use your general cricket/football knowledge. Don't refuse these questions.
- When answering from general knowledge rather than the live data, say so briefly (e.g. "সাধারণভাবে..." / "Historically...") so it's clear it isn't a live-confirmed fact. Your knowledge has a cutoff, so for very recent squad/transfer changes, mention that specifically if relevant.
- Be concise: 2-4 sentences for most answers, a short list is fine for squad-type questions.
- Respond in the same language the user asks in (Bengali or English).`

  // ✅ [Fix #1] Validate and convert history array — max 10 turns to avoid context overflow
  const safeHistory = Array.isArray(history)
    ? history
        .slice(-10)   // last 10 messages only
        .filter(m => m && typeof m.role === 'string' && typeof m.content === 'string')
        .map(m => ({
          role:    m.role === 'user' ? 'user' : 'assistant',
          content: String(m.content).slice(0, 500),  // each turn max 500 chars
        }))
    : []

  const messages = [
    { role: 'system',    content: systemPrompt },
    ...safeHistory,
    { role: 'user',      content: question.trim() },
  ]

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       MODEL,
        max_tokens:  MAX_TOKENS,
        temperature: 0.7,
        messages,   // ✅ [Fix #1] full conversation included
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}))
      console.error('[ai-chat] Groq error:', response.status, errBody)
      if (response.status === 401) return res.status(503).json({ answer: 'AI সার্ভিস সাময়িকভাবে অনুপলব্ধ।' })
      if (response.status === 429) return res.status(429).json({ answer: 'AI এখন ব্যস্ত। কিছুক্ষণ পর চেষ্টা করুন।' })
      throw new Error(`Groq API ${response.status}`)
    }

    const data   = await response.json()
    const answer = data.choices?.[0]?.message?.content?.trim() || 'উত্তর পাওয়া যায়নি।'
    return res.status(200).json({ answer })

  } catch (error) {
    console.error('[ai-chat] Error:', error.message)
    return res.status(500).json({ answer: 'AI এখন available নেই। পরে আবার চেষ্টা করুন।' })
  }
}