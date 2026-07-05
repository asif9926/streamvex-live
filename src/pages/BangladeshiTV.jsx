// BangladeshiTV.jsx — Bangladesh TV channels with search + filter
// Blueprint: src/pages/BangladeshiTV.jsx
// Hooks: useBdSearch (search + filter + subcategories dynamic)
// Components: ChannelGrid, ChannelFilter, SectionHeader, PageMeta

import { useEffect }    from 'react'
import { useBdSearch }  from '../hooks/useSearch.js'
import ChannelGrid      from '../components/channels/ChannelGrid.jsx'
import ChannelFilter    from '../components/channels/ChannelFilter.jsx'
import SectionHeader    from '../components/ui/SectionHeader.jsx'
import PageMeta         from '../components/ui/PageMeta.jsx'

export default function BangladeshiTV() {
  const {
    query,
    setQuery,
    activeFilter,
    setActiveFilter,
    filteredBdChannels,
    bdSubcategories,
    resultCount,
  } = useBdSearch()

  // ⚠️ [Bug Fix] Same fix as Sports.jsx — category pill click re-filters in
  // place (no route change), so scroll position can get stuck past a much
  // shorter filtered grid. Keyed on activeFilter only, not `query`, so
  // typing in the search box doesn't cause scroll jumps.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [activeFilter])

  const liveCount = filteredBdChannels.filter(c => c.isLive).length

  return (
    <>
      <PageMeta
        title="Bangladesh TV"
        description="Watch Bangladeshi TV channels live — T Sports, Gazi TV, BTV, NTV, Somoy TV, Channel i and more."
      />

      <SectionHeader
        title="🇧🇩 Bangladesh TV"
        subtitle={`${resultCount} channel${resultCount !== 1 ? 's' : ''}${liveCount > 0 ? ` · ${liveCount} live` : ''}`}
      />

      {/* Search + subcategory filter — useBdSearch দিয়ে dynamic */}
      <ChannelFilter
        searchQuery={query}
        onSearch={setQuery}
        categories={bdSubcategories}
        active={activeFilter}
        onFilter={setActiveFilter}
        placeholder="Search Bangladeshi channels…"
        className="mb-6"
      />

      {/* Active search label */}
      {query && (
        <p className="mb-4 text-sm text-white/40">
          Results for &ldquo;<span className="text-white/70">{query}</span>&rdquo;
          {' — '}<span className="text-white/50">{resultCount} found</span>
        </p>
      )}

      <ChannelGrid
        channels={filteredBdChannels}
        emptyMessage={
          query
            ? `No channels found for "${query}".`
            : 'No channels in this category.'
        }
      />
    </>
  )
}
