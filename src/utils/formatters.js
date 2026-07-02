// formatters.js — Shared utility formatters
// Blueprint: src/utils/formatters.js
// Used by: tournament components, score cards, player, pages

// ─────────────────────────────────────────────────────
// SAFETY
// ─────────────────────────────────────────────────────

/**
 * safeText — guarantees a renderable string, never an object.
 *
 * ✅ [Bug Fix] React throws a hard crash ("Objects are not valid as a
 * React child") if a raw object ever ends up in JSX like `{match.homeTeam}`.
 * Third-party sports APIs are inconsistent — the same-looking field can be
 * a plain string on one provider and a nested object (e.g. `{ name, logo }`)
 * on another, and that shape can also change without notice. Every field
 * that gets rendered as text from external API data should be passed
 * through this first, so a schema drift degrades to a blank/"—" value
 * instead of crashing the whole component.
 *
 * @param {*} val
 * @param {string} fallback
 * @returns {string}
 */
export function safeText(val, fallback = '') {
  if (val === null || val === undefined) return fallback
  if (typeof val === 'string' || typeof val === 'number') return String(val)
  if (typeof val === 'object') {
    // common nested shapes: { name }, { text }, { value }, { title }
    return val.name ?? val.text ?? val.value ?? val.title ?? fallback
  }
  return fallback
}

// ─────────────────────────────────────────────────────
// DATE / TIME
// ─────────────────────────────────────────────────────

/**
 * parseDateTime — epoch ms / ISO string / raw date string → { date, time }
 *
 * @param {string|number} rawDate
 * @param {string}        rawTime — optional fallback time string
 * @returns {{ date: string, time: string }}
 *
 * @example
 * parseDateTime(1718000000000)     // → { date: '10 Jun 2024', time: '08:13 AM' }
 * parseDateTime('2024-06-10', '')  // → { date: '2024-06-10', time: '' }
 */
export function parseDateTime(rawDate, rawTime = '') {
  if (!rawDate) return { date: '', time: rawTime }

  // Epoch milliseconds (13 digits) বা seconds (10 digits)
  const num = Number(rawDate)
  if (!isNaN(num) && String(rawDate).replace(/\D/g, '').length >= 10) {
    const ms = num < 1e12 ? num * 1000 : num   // seconds → ms
    const d  = new Date(ms)
    if (!isNaN(d)) {
      return {
        date: d.toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: rawTime || d.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit', hour12: true }),
      }
    }
  }

  // ISO string (2024-06-10T08:13:00Z)
  if (typeof rawDate === 'string' && rawDate.includes('T')) {
    const d = new Date(rawDate)
    if (!isNaN(d)) {
      return {
        date: d.toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: rawTime || d.toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit', hour12: true }),
      }
    }
  }

  // Raw string fallback ('Jun 10, 2024' etc.)
  return { date: String(rawDate), time: rawTime }
}

/**
 * formatMatchDate — match date কে short human-readable form এ দেখাও
 * UpcomingMatchCard, SeriesMatches এ ব্যবহার হয়
 *
 * @example
 * formatMatchDate('2024-06-10') // → 'Jun 10'
 */
export function formatMatchDate(rawDate) {
  if (!rawDate) return 'TBA'
  const { date } = parseDateTime(rawDate)
  // "10 Jun 2024" → "Jun 10" (short form)
  const parts = date.split(' ')
  if (parts.length === 3) return `${parts[1]} ${parts[0]}`
  return date
}

/**
 * timeAgo — কতক্ষণ আগে ছিল সেটা human-readable
 *
 * @example
 * timeAgo(new Date(Date.now() - 90000))  // → '1 min ago'
 * timeAgo(new Date(Date.now() - 7200000)) // → '2 hrs ago'
 */
export function timeAgo(date) {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return 'Just now'
  if (mins  < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`
  return `${days} day${days > 1 ? 's' : ''} ago`
}

// ─────────────────────────────────────────────────────
// VIDEO PLAYER
// ─────────────────────────────────────────────────────

/**
 * formatTime — seconds → M:SS (video player progress bar)
 *
 * @example
 * formatTime(125) // → '2:05'
 * formatTime(0)   // → '0:00'
 */
export function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m   = Math.floor(seconds / 60)
  const s   = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─────────────────────────────────────────────────────
// CRICKET
// ─────────────────────────────────────────────────────

/**
 * guessFormat — match name / type string থেকে cricket format detect করো
 *
 * @example
 * guessFormat('ICC T20 World Cup')  // → 'T20'
 * guessFormat('1st Test Match')     // → 'Test'
 * guessFormat('3rd ODI')            // → 'ODI'
 */
export function guessFormat(str = '') {
  const u = str.toUpperCase()
  if (u.includes('TEST'))                             return 'Test'
  if (u.includes('ODI') || u.includes('ONE DAY'))    return 'ODI'
  if (/T20|IPL|BPL|PSL|BBL|CPL|THE HUNDRED/i.test(u)) return 'T20'
  if (/T10/i.test(u))                                return 'T10'
  return ''
}

/**
 * formatCricketScore — innings object → "245/6 (45.2 ov)"
 *
 * @param {{ r?: number, w?: number, o?: number }} innings
 * @returns {string}
 */
export function formatCricketScore(innings) {
  if (!innings) return '—'
  const run    = innings.r  ?? innings.runs   ?? '—'
  const wicket = innings.w  ?? innings.wickets
  const over   = innings.o  ?? innings.overs
  let str = `${run}`
  if (wicket !== undefined) str += `/${wicket}`
  if (over   !== undefined) str += ` (${over} ov)`
  return str
}

/**
 * formatFootballScore — homeScore/awayScore → "2 - 1"
 */
export function formatFootballScore(homeScore, awayScore) {
  const h = homeScore ?? '—'
  const a = awayScore ?? '—'
  return `${h} - ${a}`
}

// ─────────────────────────────────────────────────────
// NUMBERS
// ─────────────────────────────────────────────────────

/**
 * compactNumber — large number → compact form
 *
 * @example
 * compactNumber(1200)     // → '1.2K'
 * compactNumber(4500000)  // → '4.5M'
 */
export function compactNumber(n) {
  if (!isFinite(n)) return '0'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

// ─────────────────────────────────────────────────────
// STRING
// ─────────────────────────────────────────────────────

/**
 * truncate — string কে max length এ কাটো
 *
 * @example
 * truncate('India vs Australia — 1st Test Match', 25) // → 'India vs Australia — 1st…'
 */
export function truncate(str = '', max = 50) {
  if (str.length <= max) return str
  return str.slice(0, max - 1) + '…'
}

/**
 * slugify — channel name → URL-safe slug
 *
 * @example
 * slugify('Star Sports 1') // → 'star-sports-1'
 */
export function slugify(str = '') {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}
