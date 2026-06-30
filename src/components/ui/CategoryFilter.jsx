// CategoryFilter.jsx — Pill-style category filter buttons

export default function CategoryFilter({
  categories = [],
  active,
  onChange,
  className  = '',
}) {
  if (!categories.length) return null

  return (
    <div
      role="group"
      aria-label="Filter categories"
      className={`flex items-center gap-2 flex-wrap ${className}`}
    >
      {categories.map(cat => {
        const isActive = active === cat
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            aria-pressed={isActive}
            className={`
              px-3 py-1.5 rounded-full text-xs font-semibold
              transition-all duration-150 border
              ${isActive
                ? 'bg-brand-red border-brand-red text-white shadow-sm shadow-brand-red/30'
                : 'bg-transparent border-brand-border text-white/50 hover:text-white hover:border-white/30'
              }
            `}
          >
            {cat}
          </button>
        )
      })}
    </div>
  )
}
