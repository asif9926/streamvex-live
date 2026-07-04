import { Link } from 'react-router-dom'

// 🔧 TODO: number format যাচাই করে নিন — wa.me লিংকে country code সহ,
// leading zero ছাড়া লাগে (যেমন বাংলাদেশ +880 হলে: 8801253552585)।
// আপাতত আপনার দেওয়া নাম্বারটাই বসানো আছে।
const WHATSAPP_NUMBER = '011253552585'
const WHATSAPP_LINK   = `https://wa.me/${WHATSAPP_NUMBER}`

const NAV_LINKS = [
  { to: '/',              label: 'Home' },
  { to: '/sports',        label: 'Sports' },
  { to: '/bangladesh-tv', label: 'BD TV' },
  { to: '/tournament',    label: 'Tournament' },
  { to: '/about',         label: 'About' },
]

export default function Footer() {
  // ✅ [Bug Fix] Removed duplicate `lg:ml-64` from the <footer> element
  // below — this <Footer> is rendered inside App.jsx's
  // <main className="lg:ml-64">, which already offsets it for the fixed
  // Sidebar. Having it here TOO pushed the footer an extra 256px right,
  // misaligning it from everything above it on desktop.
  return (
    <footer className="border-t border-brand-border bg-brand-surface mt-auto">
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-7">

        {/* ── Top: brand · nav · contact ─────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-5 items-start">

          {/* Brand */}
          <div className="flex flex-col items-center sm:items-start gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-brand-red flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                  <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06Z" />
                </svg>
              </div>
              <span className="font-black text-sm">Stream<span className="text-brand-red">Vex</span></span>
            </div>
            <p className="text-[11px] text-white/30 text-center sm:text-left leading-snug max-w-[220px]">
              Live cricket &amp; football scores, and sports streaming — all in one place.
            </p>
          </div>

          {/* Quick links */}
          <nav className="flex flex-col items-center sm:items-center gap-1.5 text-xs">
            <span className="text-[10px] font-bold text-white/25 uppercase tracking-wider">Quick Links</span>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-white/40">
              {NAV_LINKS.map(link => (
                <Link key={link.to} to={link.to} className="hover:text-white/70 transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* Contact */}
          <div className="flex flex-col items-center sm:items-end gap-1.5">
            <span className="text-[10px] font-bold text-white/25 uppercase tracking-wider">Get in Touch</span>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/5 border border-brand-border hover:border-green-500/40 hover:bg-green-500/10 transition-all group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-500 shrink-0">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.02c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.12.11-1.8-.11-.42-.13-.95-.31-1.64-.6-2.88-1.24-4.76-4.13-4.9-4.32-.14-.19-1.17-1.56-1.17-2.97 0-1.42.74-2.11 1-2.4.26-.29.57-.36.76-.36.19 0 .38 0 .55.01.18.01.41-.07.64.49.24.58.81 2 .88 2.14.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.16-.19.69-.8.87-1.08.19-.28.37-.23.62-.14.26.09 1.64.77 1.92.91.28.14.47.21.54.33.07.12.07.68-.17 1.36Z" />
              </svg>
              <span className="text-xs font-semibold text-white/70 group-hover:text-white transition-colors">
                Contact Developer
              </span>
            </a>
          </div>
        </div>

        {/* ── Divider ─────────────────────────────────────── */}
        <div className="border-t border-brand-border my-5" />

        {/* ── Bottom: disclaimer + copyright + credit ────── */}
        <p className="text-center text-[11px] text-white/20 leading-snug max-w-xl mx-auto">
          StreamVex does not host or store any video content. All streams are sourced from third-party providers.
          This platform is for educational and personal use only.
        </p>

        <div className="mt-3 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-1.5">
          <p className="text-[11px] text-white/25 order-2 sm:order-1">
            © {new Date().getFullYear()} StreamVex
          </p>
          <p className="text-[11px] text-white/25 order-1 sm:order-2">
            Developed by{' '}
            <Link to="/about" className="text-white/50 hover:text-brand-red font-medium transition-colors">
              Asif Ul Haque
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}