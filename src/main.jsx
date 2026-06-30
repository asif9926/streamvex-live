// src/main.jsx — StreamVex Live entry point
// Blueprint: src/main.jsx
//
// Responsibilities:
//   1. Mount React app to #root
//   2. Wrap with HelmetProvider (SEO meta tags — PageMeta.jsx depends on this)
//   3. Wrap with BrowserRouter (React Router v6)
//   4. Import global CSS (Tailwind directives)
//   5. StrictMode for dev-time warnings

import React              from 'react'
import ReactDOM            from 'react-dom/client'
import { BrowserRouter }   from 'react-router-dom'
import { HelmetProvider }  from 'react-helmet-async'

import App from './App.jsx'
import './index.css'

// ── Global error guard ───────────────────────────────
// Unhandled promise rejections (e.g. fetch failures) এ যেন white screen না হয়
window.addEventListener('unhandledrejection', (event) => {
  console.error('[StreamVex] Unhandled promise rejection:', event.reason)
})

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root not found in index.html')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
)
