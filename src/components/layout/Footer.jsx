import { Link } from 'react-router-dom'

export default function Footer() {
  // ✅ [Bug Fix] Removed duplicate `lg:ml-64` from the <footer> element
  // below — this <Footer> is rendered inside App.jsx's
  // <main className="lg:ml-64">, which already offsets it for the fixed
  // Sidebar. Having it here TOO pushed the footer an extra 256px right,
  // misaligning it from everything above it on desktop.
  return (
    <footer className="border-t border-brand-border bg-brand-surface mt-auto">
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-brand-red flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06Z" />
              </svg>
            </div>
            <span className="font-black text-sm">Stream<span className="text-brand-red">Vex</span></span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/40">
            <Link to="/" className="hover:text-white/70 transition-colors">Home</Link>
            <Link to="/sports" className="hover:text-white/70 transition-colors">Sports</Link>
            <Link to="/bangladesh-tv" className="hover:text-white/70 transition-colors">BD TV</Link>
            <Link to="/tournament" className="hover:text-white/70 transition-colors">Tournament</Link>
            <Link to="/about" className="hover:text-white/70 transition-colors">About</Link>
            <a href="https://t.me/streamvex" target="_blank" rel="noopener noreferrer" className="hover:text-white/70 transition-colors">Telegram</a>
          </div>

          <p className="text-xs text-white/25">
            © {new Date().getFullYear()} StreamVex
          </p>
        </div>

        <p className="mt-4 text-center text-[11px] text-white/20 leading-relaxed max-w-xl mx-auto">
          StreamVex does not host or store any video content. All streams are sourced from third-party providers.
          This platform is for educational and personal use only.
        </p>

        {/* ✅ [New] Developer credit */}
        <p className="mt-3 text-center text-[11px] text-white/25">
          Developed by{' '}
          <Link to="/about" className="text-white/50 hover:text-brand-red font-medium transition-colors">
            Tahmid
          </Link>
        </p>
      </div>
    </footer>
  )
}
