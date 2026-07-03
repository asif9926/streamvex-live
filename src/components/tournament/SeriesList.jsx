// SeriesList.jsx — Cricket/Football series list with inline expandable matches
//
// ✅ [Bug Fix] Previously a 3-column CARD GRID with the expanded matches panel
// rendered in one shared slot BELOW the entire grid. With many series (e.g. 30),
// clicking a card near the top made the matches panel appear all the way at the
// bottom of the page — confusing "dropdown in the wrong place" behaviour.
// Now this is a single-column LIST: each series is a full-width row, and
// clicking one expands its matches immediately underneath that same row,
// regardless of how many series exist above or below it.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Skeleton from '../ui/Skeleton.jsx'
import SeriesMatches from './SeriesMatches.jsx'

/**
 * @param {object[]} series
 * @param {boolean}  loading
 * @param {(series: object) => JSX.Element} [renderMatches] — optional custom
 *   matches renderer for the expanded panel. Defaults to the cricket
 *   `<SeriesMatches seriesId={...} />` (id-driven API lookup). Football uses
 *   a custom renderer since its "series" are leagues, not API series IDs.
 */
export default function SeriesList({ series = [], loading = false, renderMatches }) {
  const [selected, setSelected] = useState(null)

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    )
  }

  if (!series.length) {
    return (
      <div className="py-14 text-center border border-dashed border-brand-border rounded-xl">
        <p className="text-white/40 text-sm">No series data found.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {series.map((s, i) => {
        const isSelected = s.id === selected
        return (
          <div key={s.id ?? i}>
            <SeriesCard
              series={s}
              selected={isSelected}
              onClick={() => setSelected(isSelected ? null : s.id)}
            />

            {/* ✅ Expands immediately below THIS row — not at the bottom of the list */}
            <AnimatePresence>
              {isSelected && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 p-5 rounded-2xl border border-brand-border bg-brand-elevated">
                    {renderMatches
                      ? renderMatches(s)
                      : <SeriesMatches seriesId={s.id} />}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

function SeriesCard({ series, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-xl border p-4 transition-all duration-200
        flex items-center gap-3
        ${selected
          ? 'border-brand-red/50 bg-brand-red/5 ring-1 ring-brand-red/20 shadow-lg shadow-brand-red/10'
          : 'border-brand-border bg-brand-surface hover:border-white/20'
        }
      `}
    >
      {series.flag && (
        series.flag.startsWith('http')
          ? <img src={series.flag} alt="" className="w-5 h-5 object-contain shrink-0" loading="lazy" />
          : <span className="text-lg shrink-0">{series.flag}</span>
      )}

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold leading-snug truncate
          ${selected ? 'text-white' : 'text-white/80'}`}>
          {series.name || series.seriesName || 'Series'}
        </p>
        <div className="flex items-center gap-3 text-[10px] text-white/35 mt-0.5">
          {series.startDate && <span>From {series.startDate}</span>}
          {series.matchCount && <span>· {series.matchCount} matches</span>}
          {series.group && <span>{series.group}</span>}
        </div>
      </div>

      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
        className={`w-4 h-4 shrink-0 transition-transform ${selected ? 'rotate-90 text-brand-red' : 'text-white/20'}`}>
        <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
      </svg>
    </button>
  )
}
