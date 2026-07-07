// api/_lib/cricketFilters.js — Shared "is this notable cricket?" filter
// Used by: cricket-series.js, cricket-upcoming.js
//
// ⚠️ Filename starts with underscore + lives in a subfolder — Vercel does
// NOT turn this into its own /api route, it's just a shared import, same
// as a regular lib file.
//
// প্রব্লেম: CricAPI-এর ডাটাবেসে হাজার হাজার সিরিজ/ম্যাচ আছে — international
// এর পাশাপাশি অসংখ্য domestic first-class, women's domestic, youth,
// associate-nation qualifier ইত্যাদি। এগুলো সব মিলিয়ে pagination দিয়ে
// আনলেও, আসল useful (international + famous league) ডেটা বিশাল noise-এর
// মধ্যে চাপা পড়ে যায়। এই ফাইল সেই noise বাদ দিয়ে শুধু international
// ম্যাচ আর পরিচিত T20 লিগগুলো রাখে।
//
// নতুন কোনো famous league যোগ করতে চাইলে শুধু FAMOUS_LEAGUES array-তে
// একটা নতুন lowercase keyword যোগ করুন (যেমন league-টার নাম বা সংক্ষিপ্ত রূপ)।

const INTERNATIONAL_TEAMS = [
  'india', 'australia', 'england', 'pakistan', 'south africa', 'new zealand',
  'sri lanka', 'bangladesh', 'west indies', 'afghanistan', 'zimbabwe',
  'ireland', 'scotland', 'netherlands', 'u.a.e', 'uae', 'nepal',
  'united states', 'usa', 'canada', 'namibia', 'oman', 'papua new guinea',
  'kenya', 'hong kong', 'malaysia', 'singapore', 'bermuda', 'jersey',
]

// famous/well-followed T20 (and a few other) leagues — lowercase keywords,
// checked as a substring match against the series/match name
const FAMOUS_LEAGUES = [
  'indian premier league', ' ipl',
  'bangladesh premier league', ' bpl',
  'pakistan super league', ' psl',
  'big bash', ' bbl',
  'caribbean premier league', ' cpl',
  'lanka premier league', ' lpl',
  'sa20',
  'international league t20', 'ilt20',
  'major league cricket', ' mlc',
  'the hundred',
  // ⚠️ [Fix] 'T20 Blast'/'Vitality Blast' সরানো হলো — এটা ইংল্যান্ডের
  // অভ্যন্তরীণ county T20 league (আন্তর্জাতিকভাবে famous না, IPL/BPL/PSL/BBL
  // এর মতো না), user request অনুযায়ী বাদ। এই একই keyword "Women's T20
  // Blast" আর "Women's T20 Blast League Two"-কেও (আরও lower-tier) match
  // করে ফেলছিল substring match এর কারণে — দুটোই এখন বাদ পড়বে।
  'super smash',
  'world cup', 'asia cup', 'champions trophy',
  't20i tri-series', 'icc ',
]

/**
 * isNotableCricket — true হলে এই সিরিজ/ম্যাচ দেখানো হবে
 *
 * @param {string} name   সিরিজ বা ম্যাচের নাম (CricAPI's `s.name` / `m.name`)
 * @param {string} extra  বাড়তি context থাকলে (যেমন ম্যাচের `series` ফিল্ড)
 */
export function isNotableCricket(name = '', extra = '') {
  const n = `${name} ${extra}`.toLowerCase()

  // 1) পরিচিত লিগ?
  if (FAMOUS_LEAGUES.some(keyword => n.includes(keyword))) return true

  // 2) বাইলেটারাল আন্তর্জাতিক সিরিজ/ম্যাচ? CricAPI নাম দেয়
  //    "India tour of Australia, 2026" বা "India vs Australia, 3rd T20I" প্যাটার্নে —
  //    দুই ধরনের প্যাটার্নেই ইন্টারন্যাশনাল টিমের নাম থাকে।
  if (n.includes('tour of')) return true

  if (n.includes(' vs ')) {
    const hits = INTERNATIONAL_TEAMS.filter(team => n.includes(team))
    // অন্তত ২টা টিমের নামই ইন্টারন্যাশনাল হলে ধরে নিচ্ছি এটা আন্তর্জাতিক ম্যাচ
    // (শুধু ১টা মিলিলে সেটা domestic টিমের নামের সাথে কাকতালীয় মিলও হতে পারে)
    if (hits.length >= 2) return true
  }

  return false
}

// ─────────────────────────────────────────────────────────────────
// resolveSeriesDates — CricAPI's /v1/series endpoint দেয় startDate/
// endDate দুই রকম ফরম্যাটে, একটাই response এর মধ্যে mixed:
//   - পূর্ণ ISO:      "2027-03-18"
//   - শুধু month+day: "Apr 11"   ← বছর নেই!
//
// ⚠️ [Bug Fix] year-less endDate গুলো `new Date("Apr 11")` দিয়ে parse
// করলে JS চুপচাপ CURRENT YEAR ধরে নেয় — তাই 2027 সালের একটা সিরিজের
// endDate "Apr 11" আজকের (2026) হিসেবে parse হয়ে অতীতের তারিখ হয়ে
// যাচ্ছিল, ফলে সিরিজটা "শেষ হয়ে গেছে" ধরে বাদ পড়ে যাচ্ছিল — এটাই কারণ
// afterDateFilter সবসময় 0 আসছিল, নাম-ফিল্টার ঠিকভাবে কাজ করলেও।
//
// Fix: সিরিজের নাম থেকে বছর বের করে (e.g. "...2027" থেকে 2027) সেটাকে
// fallback year হিসেবে ব্যবহার করা হয়। তারপর যদি end < start হয়ে যায়
// (Dec→Jan এর মতো year-crossing সিরিজ), end-এর বছর +1 করে ঠিক করা হয়।
// ─────────────────────────────────────────────────────────────────

function extractYearFromName(name = '') {
  const m = name.match(/\d{4}/)
  return m ? parseInt(m[0], 10) : null
}

function parseFlexibleDate(dateStr, fallbackYear) {
  if (!dateStr) return null
  // পূর্ণ ISO / already has a 4-digit year in the string itself
  if (/\d{4}/.test(dateStr)) {
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? null : d
  }
  // Short form ("Apr 11") — বছর নেই, নাম থেকে পাওয়া year fallback হিসেবে ব্যবহার
  const year = fallbackYear || new Date().getFullYear()
  const d = new Date(`${dateStr} ${year}`)
  return isNaN(d.getTime()) ? null : d
}

/**
 * resolveSeriesDates — series name + raw start/end date string থেকে
 * সঠিক (year-corrected) Date object বের করে।
 *
 * @param {string} name         সিরিজের নাম (year extract করার জন্য)
 * @param {string} startDateRaw CricAPI এর raw startDate
 * @param {string} endDateRaw   CricAPI এর raw endDate
 * @returns {{ start: Date|null, end: Date|null }}
 */
export function resolveSeriesDates(name, startDateRaw, endDateRaw) {
  const nameYear = extractYearFromName(name)
  const start = parseFlexibleDate(startDateRaw, nameYear)
  let   end   = parseFlexibleDate(endDateRaw, nameYear)

  // Year-crossing সিরিজ (e.g. start Dec 2026, end "Jan 08" → আসলে 2027):
  // fallback year দিয়ে parse করার পর end যদি start এর আগে পড়ে যায়,
  // তার মানে end আসলে পরের বছরে পড়ে।
  if (start && end && end < start) {
    end = new Date(end)
    end.setFullYear(end.getFullYear() + 1)
  }

  return { start, end }
}