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
import { lazy, Suspense }             from 'react'

import Header   from './components/layout/Header.jsx'
import Sidebar  from './components/layout/Sidebar.jsx'
import Footer   from './components/layout/Footer.jsx'
import ErrorBoundary from './components/ui/ErrorBoundary.jsx'
import { SkeletonCard } from './components/ui/Skeleton.jsx'

// ✅ [Perf Fix] Route-level code splitting — previously every page
// (including Watch.jsx / VideoPlayer / Tournament / LiveScore) was
// eagerly bundled into the single initial JS chunk, so a person just
// visiting the homepage downloaded and parsed code for every other page
// up front. Only Home stays eager (it's the most likely landing route);
// everything else loads on demand via React.lazy.
import Home from './pages/Home.jsx'
const Sports        = lazy(() => import('./pages/Sports.jsx'))
const BangladeshiTV  = lazy(() => import('./pages/BangladeshiTV.jsx'))
const LiveScore       = lazy(() => import('./pages/LiveScore.jsx'))
const Tournament       = lazy(() => import('./pages/Tournament.jsx'))
const Favorites          = lazy(() => import('./pages/Favorites.jsx'))
const About                = lazy(() => import('./pages/About.jsx'))
const Watch                = lazy(() => import('./pages/Watch.jsx'))
const NotFound                = lazy(() => import('./pages/NotFound.jsx'))

// Lightweight fallback shown while a lazy page chunk downloads
function PageFallback() {
  return (
    <div className="p-4 xl:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )
}

export default function App() {
  const location = useLocation()

  // Watch page = immersive, no chrome (its own back-nav is built in)
  const isWatchPage = location.pathname.startsWith('/watch/')

  if (isWatchPage) {
    return (
      <ErrorBoundary label="App">
        <Suspense fallback={<div className="min-h-screen bg-brand-bg" />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/watch/:id" element={<Watch />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
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
          {/* ✅ [Bug Fix] pb-10 here (not on individual pages) — no page's
              last section had bottom margin, so content butted directly
              against the footer everywhere, not just on Home. Fixing it
              once here covers every route consistently. */}
          <div className="pb-10">
            <Suspense fallback={<PageFallback />}>
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  <Route path="/"              element={<Home />} />
                  <Route path="/sports"        element={<Sports />} />
                  <Route path="/bangladesh-tv" element={<BangladeshiTV />} />
                  <Route path="/live-score"    element={<LiveScore />} />
                  <Route path="/tournament"    element={<Tournament />} />
                  <Route path="/favorites"     element={<Favorites />} />
                  <Route path="/about"         element={<About />} />
                  <Route path="*"              element={<NotFound />} />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </div>

          <Footer />
        </main>
      </div>
    </ErrorBoundary>
  )
}