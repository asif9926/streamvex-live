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
  't20 blast', 'vitality blast',
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
