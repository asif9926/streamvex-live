// ScrollToTop.jsx — resets window scroll position on every route change
//
// ⚠️ [Bug Fix] React Router client-side navigation does NOT reset scroll
// position like a normal multi-page site does. Without this, scrolling to
// the bottom of Home and then clicking a link (e.g. a channel card, or a
// nav link) opened the NEXT page already scrolled to wherever the browser
// happened to be — usually the bottom — instead of the top. This renders
// nothing; it just runs a scrollTo(0,0) side-effect whenever the path changes.
//
// Mounted once near the top of <App/>, inside the Router but outside
// <Routes>, so it observes every navigation regardless of which page.

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // 'instant' (not smooth) — a page navigation should land at the top
    // immediately, not visibly animate-scroll past the previous page's content.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}
