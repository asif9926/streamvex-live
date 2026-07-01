import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useChannelStore } from '../../store/channelStore.js'

export default function Header() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const setSearch = useChannelStore(s => s.setSearch)
  const [query,  setQuery]  = useState('')
  const [mobile, setMobile] = useState(false)

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(query)
    if (!location.pathname.includes('/sports') && !location.pathname.includes('/bangladesh')) {
      navigate('/sports')
    }
  }

  const clearSearch = () => {
    setQuery('')
    setSearch('')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 glass border-b border-brand-border flex items-center px-4 gap-4">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-brand-red flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
            <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06Z" />
          </svg>
        </div>
        <span className="font-black text-lg tracking-tight hidden sm:block">
          Stream<span className="text-brand-red">Vex</span>
        </span>
      </Link>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
               className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search channels, matches…"
            aria-label="Search channels and matches"
            className="w-full bg-brand-elevated border border-brand-border rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-red/50 transition-colors"
          />
          {query && (
            <button type="button" onClick={clearSearch} aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          )}
        </div>
      </form>

      {/* Right actions */}
      <div className="flex items-center gap-2 ml-auto">
        <Link to="/favorites"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-yellow-400">
            <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
          </svg>
          <span className="hidden md:inline">Favorites</span>
        </Link>

        {/* Mobile menu toggle */}
        <button onClick={() => setMobile(p => !p)}
                aria-label={mobile ? 'Close menu' : 'Open menu'}
                aria-expanded={mobile}
                className="lg:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            {mobile
              ? <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              : <path fillRule="evenodd" d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75ZM3 12a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm0 5.25a.75.75 0 0 1 .75-.75H12a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            }
          </svg>
        </button>
      </div>

      {/* Mobile dropdown nav */}
      <AnimatePresence>
        {mobile && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-16 left-0 right-0 bg-brand-surface border-b border-brand-border shadow-2xl lg:hidden z-50"
          >
            {NAV_LINKS.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setMobile(false)}
                    className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                      location.pathname === l.to ? 'text-brand-red bg-brand-red/5' : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}>
                {l.icon}
                {l.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: <HomeIcon /> },
  { to: '/sports', label: 'Sports Channels', icon: <SportsIcon /> },
  { to: '/bangladesh-tv', label: 'Bangladesh TV', icon: <BdIcon /> },
  { to: '/tournament', label: 'Tournament', icon: <TournamentIcon /> },
  { to: '/live-score',  label: 'Live Scores', icon: <LiveIcon /> },
  { to: '/favorites', label: 'My Favorites', icon: <StarIcon /> },
]

function HomeIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" /></svg>
}
function SportsIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06Z" /></svg>
}
function BdIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" clipRule="evenodd" /></svg>
}
function TournamentIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 1c-1.828 0-3.623.149-5.371.435a.75.75 0 0 0-.629.74v.387c-.827.157-1.642.345-2.445.564a.75.75 0 0 0-.552.698 5 5 0 0 0 4.503 5.152 6 6 0 0 0 2.946 1.822A6.451 6.451 0 0 1 7.768 13H7.5A1.5 1.5 0 0 0 6 14.5V17h-.75C4.56 17 4 17.56 4 18.25v.75h12v-.75c0-.69-.56-1.25-1.25-1.25H14v-2.5a1.5 1.5 0 0 0-1.5-1.5h-.268a6.453 6.453 0 0 1-.684-2.202 6 6 0 0 0 2.946-1.822 5 5 0 0 0 4.503-5.152.75.75 0 0 0-.552-.698A31.804 31.804 0 0 0 16 2.562v-.387a.75.75 0 0 0-.629-.74A33.227 33.227 0 0 0 10 1ZM2.525 4.422C3.012 4.3 3.504 4.19 4 4.09V5c0 .74.134 1.448.38 2.103a3.503 3.503 0 0 1-1.855-2.68Zm14.95 0a3.503 3.503 0 0 1-1.854 2.68C15.866 6.449 16 5.74 16 5v-.91c.496.099.988.21 1.475.332Z" clipRule="evenodd" /></svg>
}
function LiveIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" /></svg>
}
function StarIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" /></svg>
}
