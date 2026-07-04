// About.jsx — About the developer + about StreamVex Live
// ✅ [Premium redesign] Feature highlights strip, FAQ, and a simple
// feedback/rating form — on submit it opens the user's own mail app
// (mailto:) with the feedback pre-filled, addressed to DEVELOPER_EMAIL.
// No backend/API call needed anymore.
// ✅ [Bug Fix] The disclaimer card had gone empty (text was accidentally
// removed in an earlier edit) — restored.

import { useState }                from 'react'
import { motion }                  from 'framer-motion'
import PageMeta      from '../components/ui/PageMeta.jsx'
import SectionHeader from '../components/ui/SectionHeader.jsx'

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 20 },
  animate:    { opacity: 1, y: 0  },
  transition: { duration: 0.4, delay, ease: 'easeOut' },
})

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
      url:  'https://github.com/asif9926',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.833.092-.647.35-1.088.636-1.338-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.271.098-2.649 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      name: 'Portfolio',
      // 🔧 TODO: নিজের পোর্টফোলিও ওয়েবসাইট লিংক বসান
      url:  'https://github.com/asif9926',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      name: 'Facebook',
      // 🔧 TODO: নিজের Facebook প্রোফাইল/পেজ লিংক বসান
      url:  'https://www.facebook.com/asif99.F',
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

const HIGHLIGHTS = [
  { icon: '⚡', label: 'রিয়েল-টাইম স্কোর',   sub: '২ মিনিট পরপর auto-update' },
  { icon: '🏏', label: 'ক্রিকেট + ফুটবল',     sub: 'দুই খেলাই এক জায়গায়' },
  { icon: '📺', label: 'বাংলাদেশি চ্যানেল',   sub: 'লাইভ স্ট্রিমিং সহ' },
  { icon: '🤖', label: 'AI ম্যাচ বিশ্লেষণ',   sub: 'যেকোনো প্রশ্নের উত্তর' },
]

const FAQS = [
  {
    q: 'StreamVex Live ব্যবহার করতে কি টাকা লাগে?',
    a: 'না, StreamVex Live সম্পূর্ণ ফ্রি — কোনো subscription বা hidden charge নেই।',
  },
  {
    q: 'StreamVex কি নিজে ভিডিও host করে?',
    a: 'না। StreamVex কোনো video content host বা store করে না — সব stream third-party providers থেকে আসে। এই প্ল্যাটফর্ম শুধুমাত্র শিক্ষামূলক ও ব্যক্তিগত ব্যবহারের জন্য।',
  },
  {
    q: 'স্কোর কতক্ষণ পরপর আপডেট হয়?',
    a: 'Live match চলাকালীন প্রতি ২ মিনিটে auto-update হয় (browser tab active থাকতে হবে)।',
  },
  {
    q: 'নতুন ফিচার বা চ্যানেল যোগ করার অনুরোধ কীভাবে করব?',
    a: 'নিচের ফিডব্যাক ফর্ম ব্যবহার করুন, অথবা ফুটারে থাকা "Contact Developer" বাটনে ক্লিক করে সরাসরি WhatsApp-এ জানান।',
  },
]

function StarRating({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill={n <= value ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={n <= value ? 0 : 1.5}
            className={`w-8 h-8 transition-colors ${n <= value ? 'text-yellow-400' : 'text-white/20'}`}
          >
            <path d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

// 🔧 TODO: এখানে নিজের email address দিন — ফিডব্যাক এই ঠিকানায় যাবে
const DEVELOPER_EMAIL = 'jihad2080k@gmail.com'

function FeedbackForm() {
  const [rating, setRating]     = useState(0)
  const [feedback, setFeedback] = useState('')
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [status, setStatus]     = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (rating === 0) {
      setStatus('error')
      setErrorMsg('অনুগ্রহ করে একটা রেটিং দিন।')
      return
    }
    if (!feedback.trim()) {
      setStatus('error')
      setErrorMsg('ফিডব্যাক লিখুন।')
      return
    }

    setErrorMsg('')

    const subject = `StreamVex Live Feedback — ${rating}★`
    const bodyLines = [
      `Rating: ${rating}/5`,
      `Name: ${name.trim() || '(দেওয়া হয়নি)'}`,
      `Email: ${email.trim() || '(দেওয়া হয়নি)'}`,
      '',
      'Feedback:',
      feedback.trim(),
    ]
    const mailto = `mailto:${DEVELOPER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`

    // user-এর নিজের mail app (Gmail ইত্যাদি) খুলে যাবে, ডেটা আগে থেকেই ভরা থাকবে
    window.location.href = mailto

    setStatus('success')
    setRating(0)
    setFeedback('')
    setName('')
    setEmail('')
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center text-center py-6 gap-2">
        <span className="text-4xl">📧</span>
        <p className="text-white font-semibold">আপনার মেইল অ্যাপ খুলে গেছে!</p>
        <p className="text-white/40 text-sm">মেইলটা পাঠিয়ে দিলেই ফিডব্যাক ডেভেলপারের কাছে পৌঁছে যাবে।</p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-2 text-xs text-brand-red hover:text-white transition-colors"
        >
          আরেকটা ফিডব্যাক দিন
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
          আপনার রেটিং
        </label>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div>
        <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
          ফিডব্যাক
        </label>
        <textarea
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          placeholder="আপনার মতামত, সমস্যা, বা নতুন ফিচার আইডিয়া লিখুন..."
          rows={4}
          maxLength={2000}
          className="w-full bg-brand-elevated text-white text-sm rounded-lg px-3 py-2.5
            border border-brand-border focus:outline-none focus:border-brand-red
            transition-colors placeholder-white/20 resize-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
            নাম <span className="normal-case font-normal text-white/25">(ঐচ্ছিক)</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="আপনার নাম"
            className="w-full bg-brand-elevated text-white text-sm rounded-lg px-3 py-2.5
              border border-brand-border focus:outline-none focus:border-brand-red
              transition-colors placeholder-white/20"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
            Email <span className="normal-case font-normal text-white/25">(ঐচ্ছিক — reply পেতে)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-brand-elevated text-white text-sm rounded-lg px-3 py-2.5
              border border-brand-border focus:outline-none focus:border-brand-red
              transition-colors placeholder-white/20"
          />
        </div>
      </div>

      {status === 'error' && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        className="self-start px-5 py-2.5 bg-brand-red text-white text-sm font-semibold rounded-lg
          hover:bg-red-600 transition-colors"
      >
        ফিডব্যাক পাঠান
      </button>
    </form>
  )
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-brand-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-sm font-semibold text-white/85">{q}</span>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
          className={`w-4 h-4 text-white/30 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-sm text-white/45 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  )
}

export default function About() {
  return (
    <>
      <PageMeta title="About — StreamVex Live" />

      <div className="p-4 xl:p-6 max-w-3xl mx-auto">

        <motion.div {...fadeUp(0)} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {HIGHLIGHTS.map(h => (
            <div key={h.label} className="bg-brand-surface border border-brand-border rounded-xl p-4 text-center">
              <span className="text-2xl">{h.icon}</span>
              <p className="text-xs font-bold text-white mt-1.5 leading-snug">{h.label}</p>
              <p className="text-[10px] text-white/30 mt-0.5 leading-snug">{h.sub}</p>
            </div>
          ))}
        </motion.div>

        <motion.div {...fadeUp(0.05)}>
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
        </motion.div>

        <motion.div {...fadeUp(0.1)}>
          <SectionHeader title="StreamVex Live সম্পর্কে" subtitle="Mission" />
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 sm:p-8 mb-8">
            <p className="text-sm text-white/50 leading-relaxed">
              StreamVex Live তৈরি হয়েছে এক জায়গায় live cricket ও football score, উপকোমিং ম্যাচের সময়সূচি,
              আর জনপ্রিয় Bangladeshi TV চ্যানেল একসাথে দেখানোর জন্য — যাতে বারবার আলাদা আলাদা অ্যাপ বা ওয়েবসাইট
              ঘাঁটতে না হয়। Sports fans-দের কথা মাথায় রেখে ডিজাইন করা হয়েছে যাতে দ্রুত স্কোর দেখা আর পছন্দের
              ম্যাচ খুঁজে পাওয়া যায় সহজে।
            </p>
          </div>
        </motion.div>

        <motion.div {...fadeUp(0.15)}>
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
        </motion.div>

        <motion.div {...fadeUp(0.2)}>
          <SectionHeader title="সচরাচর জিজ্ঞাসা" subtitle="FAQ" />
          <div className="flex flex-col gap-2.5 mb-8">
            {FAQS.map(faq => <FaqItem key={faq.q} {...faq} />)}
          </div>
        </motion.div>

        <motion.div {...fadeUp(0.25)}>
          <SectionHeader title="আপনার মতামত জানান" subtitle="Feedback" />
          <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 sm:p-8 mb-8">
            <FeedbackForm />
          </div>
        </motion.div>

        <motion.div {...fadeUp(0.3)} className="bg-brand-elevated border border-brand-border rounded-xl p-5">
          <p className="text-[11px] text-white/30 leading-relaxed text-center">
            StreamVex does not host or store any video content. All streams are sourced from third-party providers.
            This platform is for educational and personal use only.
          </p>
        </motion.div>
      </div>
    </>
  )
}