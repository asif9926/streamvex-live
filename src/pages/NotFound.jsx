// NotFound.jsx — 404 page
// Blueprint: src/pages/NotFound.jsx

import { Link, useNavigate } from 'react-router-dom'
import PageMeta              from '../components/ui/PageMeta.jsx'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <>
      <PageMeta title="404 — Page Not Found" />

      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        {/* 404 number */}
        <p className="text-8xl sm:text-9xl font-black gradient-text mb-2 leading-none">404</p>

        {/* Message */}
        <h1 className="text-xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-white/40 text-sm mb-10 max-w-xs leading-relaxed">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
        </p>

        {/* Quick links */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 bg-brand-surface border border-brand-border text-white/60 hover:text-white hover:border-white/20 font-semibold rounded-xl text-sm transition-all"
          >
            ← Go Back
          </button>
          <Link
            to="/"
            className="px-5 py-2.5 bg-brand-red hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-brand-red/20"
          >
            🏠 Go to Home
          </Link>
          <Link
            to="/sports"
            className="px-5 py-2.5 bg-brand-surface border border-brand-border text-white/60 hover:text-white hover:border-white/20 font-semibold rounded-xl text-sm transition-all"
          >
            ⚽ Browse Channels
          </Link>
        </div>

        {/* Decorative */}
        <div className="mt-16 flex items-center gap-2 text-white/10">
          <span className="text-2xl">📺</span>
          <span className="text-xs font-medium tracking-widest uppercase">StreamVex Live</span>
        </div>
      </div>
    </>
  )
}
