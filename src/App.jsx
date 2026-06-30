// src/App.jsx — StreamVex Live route definitions + layout shell
// Blueprint: src/App.jsx
//
// Routes (matches Sidebar.jsx + Header.jsx links exactly):
//   /                  → Home
//   /sports            → Sports (channel grid + search/filter)
//   /bangladesh-tv      → BangladeshiTV
//   /live-score        → LiveScore (cricket/football live scores)
//   /tournament        → Tournament (series, results, upcoming)
//   /favorites         → Favorites
//   /watch/:id         → Watch (full player page — NO sidebar/header, own nav)
//   *                  → NotFound (404)
//
// Layout:
//   Watch page has its own sticky nav (built into Watch.jsx) — no Header/Sidebar there,
//   so video stays full-width and distraction-free.
//   All other pages get Header (top) + Sidebar (desktop left rail) + Footer.

import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence }            from 'framer-motion'

import Header   from './components/layout/Header.jsx'
import Sidebar  from './components/layout/Sidebar.jsx'
import Footer   from './components/layout/Footer.jsx'
import ErrorBoundary from './components/ui/ErrorBoundary.jsx'

import Home          from './pages/Home.jsx'
import Sports        from './pages/Sports.jsx'
import BangladeshiTV from './pages/BangladeshiTV.jsx'
import LiveScore      from './pages/LiveScore.jsx'
import Tournament     from './pages/Tournament.jsx'
import Favorites      from './pages/Favorites.jsx'
import Watch           from './pages/Watch.jsx'
import NotFound        from './pages/NotFound.jsx'

export default function App() {
  const location = useLocation()

  // Watch page = immersive, no chrome (its own back-nav is built in)
  const isWatchPage = location.pathname.startsWith('/watch/')

  if (isWatchPage) {
    return (
      <ErrorBoundary label="App">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/watch/:id" element={<Watch />} />
          </Routes>
        </AnimatePresence>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary label="App">
      <Header />

      <div className="flex flex-1 pt-16">
        {/* Desktop sidebar — hidden on mobile, Header has mobile menu */}
        <Sidebar />

        {/* Main content area — ml-64 matches Sidebar's fixed w-64 */}
        <main className="flex-1 min-w-0 lg:ml-64">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/"              element={<Home />} />
              <Route path="/sports"        element={<Sports />} />
              <Route path="/bangladesh-tv" element={<BangladeshiTV />} />
              <Route path="/live-score"    element={<LiveScore />} />
              <Route path="/tournament"    element={<Tournament />} />
              <Route path="/favorites"     element={<Favorites />} />
              <Route path="*"              element={<NotFound />} />
            </Routes>
          </AnimatePresence>

          <Footer />
        </main>
      </div>
    </ErrorBoundary>
  )
}
