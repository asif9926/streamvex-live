// ChannelFilter.jsx — Search bar + category filter pills combined

import CategoryFilter from '../ui/CategoryFilter.jsx'

export default function ChannelFilter({
  searchQuery   = '',
  onSearch,
  categories    = [],
  active        = 'All',
  onFilter,
  placeholder   = 'Search channels…',
  className     = '',
}) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Search input */}
      {onSearch && (
        <div className="relative max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-brand-elevated border border-brand-border rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-red/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              aria-label="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Category pills */}
      {categories.length > 0 && onFilter && (
        <CategoryFilter categories={categories} active={active} onChange={onFilter} />
      )}
    </div>
  )
}
