// About.jsx — About the developer + about StreamVex Live
// ✅ [New] Requested by client: footer credit + dedicated About page

import PageMeta      from '../components/ui/PageMeta.jsx'
import SectionHeader from '../components/ui/SectionHeader.jsx'

// ── Developer info ─────────────────────────────────────
// 🔧 TODO: এই তথ্যগুলো নিজের মতো করে বদলে নিন
const DEVELOPER = {
  name:      'Asif Ul Haque',
  role:      'Full Stack Developer',
  bio:       'React আর modern web technology দিয়ে fast, reliable web application বানাতে পছন্দ করি। StreamVex Live এই passion-এরই একটা প্রজেক্ট — sports fans-দের জন্য একটা জায়গায় live score আর streaming নিয়ে আসার চেষ্টা।',
  avatarText:'AH',
  socials: [
    {
      name: 'GitHub',
      // 🔧 TODO: নিজের GitHub প্রোফাইল লিংক বসান
      url:  'https://github.com/your-username',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.833.092-.647.35-1.088.636-1.338-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.271.098-2.649 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      name: 'Portfolio',
      // 🔧 TODO: নিজের পোর্টফোলিও ওয়েবসাইট লিংক বসান
      url:  'https://your-portfolio.com',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      name: 'Facebook',
      // 🔧 TODO: নিজের Facebook প্রোফাইল/পেজ লিংক বসান
      url:  'https://facebook.com/your-username',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12Z" clipRule="evenodd" />
        </svg>
      ),
    },
  ],
}

const TECH_STACK = [
  { group: 'Frontend',  items: ['React 18', 'Vite', 'Tailwind CSS', 'Framer Motion', 'Zustand', 'SWR', 'HLS.js'] },
  { group: 'Backend',   items: ['Vercel Serverless Functions', 'Vercel KV (Upstash Redis)', 'Cloudflare Worker'] },
  { group: 'Data',      items: ['CricAPI (RapidAPI)', 'AllSportsAPI2 (RapidAPI)', 'football-data.org'] },
]

export default function About() {
  return (
    <>
      <PageMeta title="About — StreamVex Live" />

      <div className="p-4 xl:p-6 max-w-3xl mx-auto">
        {/* ── Developer card ────────────────────────── */}
        <SectionHeader title="যিনি বানিয়েছেন" subtitle="Developer" />

        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-red to-red-700 flex items-center justify-center text-3xl font-black text-white shrink-0 shadow-lg shadow-brand-red/20">
              {DEVELOPER.avatarText}
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white">{DEVELOPER.name}</h2>
              <p className="text-sm text-brand-red font-semibold mb-3">{DEVELOPER.role}</p>
              <p className="text-sm text-white/50 leading-relaxed mb-5">{DEVELOPER.bio}</p>

              <div className="flex items-center justify-center sm:justify-start gap-2">
                {DEVELOPER.socials.map(s => (
                  <a
                    key={s.name}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.name}
                    title={s.name}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-brand-border flex items-center justify-center text-white/50 hover:text-white hover:border-white/20 hover:bg-white/10 transition-all"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── About the website ─────────────────────── */}
        <SectionHeader title="StreamVex Live সম্পর্কে" subtitle="Mission" />

        <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 sm:p-8 mb-8">
          <p className="text-sm text-white/50 leading-relaxed">
            StreamVex Live তৈরি হয়েছে এক জায়গায় live cricket ও football score, উপকোমিং ম্যাচের সময়সূচি,
            আর জনপ্রিয় Bangladeshi TV চ্যানেল একসাথে দেখানোর জন্য — যাতে বারবার আলাদা আলাদা অ্যাপ বা ওয়েবসাইট
            ঘাঁটতে না হয়। Sports fans-দের কথা মাথায় রেখে ডিজাইন করা হয়েছে যাতে দ্রুত স্কোর দেখা আর পছন্দের
            ম্যাচ খুঁজে পাওয়া যায় সহজে।
          </p>
        </div>

        {/* ── Tech stack ─────────────────────────────── */}
        <SectionHeader title="Tech Stack" subtitle="যেসব প্রযুক্তি দিয়ে তৈরি" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {TECH_STACK.map(({ group, items }) => (
            <div key={group} className="bg-brand-surface border border-brand-border rounded-xl p-5">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">{group}</h3>
              <ul className="space-y-1.5">
                {items.map(item => (
                  <li key={item} className="text-sm text-white/70 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-brand-red shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Disclaimer (matches Footer's existing wording) ── */}
        <div className="bg-brand-elevated border border-brand-border rounded-xl p-5">
          <p className="text-[11px] text-white/30 leading-relaxed text-center">
            StreamVex does not host or store any video content. All streams are sourced from third-party providers.
            This platform is for educational and personal use only.
          </p>
        </div>
      </div>
    </>
  )
}
