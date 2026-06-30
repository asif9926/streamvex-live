// SeriesList.jsx — Cricket/Football series cards with expandable match list

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Skeleton from '../ui/Skeleton.jsx'
import SeriesMatches from './SeriesMatches.jsx'

export default function SeriesList({ series = [], loading = false }) {
  const [selected, setSelected] = useState(null)

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
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
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {series.map((s, i) => (
          <SeriesCard
            key={s.id || i}
            series={s}
            selected={s.id === selected}
            onClick={() => setSelected(selected === s.id ? null : s.id)}
          />
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-2xl border border-brand-border bg-brand-elevated">
              <h3 className="text-base font-bold text-white mb-4">
                {series.find(s => s.id === selected)?.name || 'Series Matches'}
              </h3>
              <SeriesMatches seriesId={selected} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SeriesCard({ series, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-xl border p-4 transition-all duration-200
        hover:scale-[1.01] active:scale-[0.99]
        ${selected
          ? 'border-brand-red/50 bg-brand-red/5 ring-1 ring-brand-red/20 shadow-lg shadow-brand-red/10'
          : 'border-brand-border bg-brand-surface hover:border-white/20'
        }
      `}
    >
      <div className="flex items-start gap-2 mb-2">
        <p className={`flex-1 text-sm font-bold leading-snug text-left
          ${selected ? 'text-white' : 'text-white/80'}`}>
          {series.name || series.seriesName || 'Series'}
        </p>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
          className={`w-4 h-4 shrink-0 mt-0.5 transition-transform ${selected ? 'rotate-90 text-brand-red' : 'text-white/20'}`}>
          <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-white/35">
        {series.startDate && <span>From {series.startDate}</span>}
        {series.matchCount && <span>· {series.matchCount} matches</span>}
      </div>
    </button>
  )
}
