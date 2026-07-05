// Sports.jsx — All sports channels with search + subcategory filter
// Blueprint: src/pages/Sports.jsx
// Hooks: useChannelStore (getFilteredChannels, setSubcategory)
// Components: ChannelGrid, ChannelFilter, SectionHeader, PageMeta

import { useEffect }        from 'react'
import { useChannelStore }  from '../store/channelStore.js'
import { useSearch }        from '../hooks/useSearch.js'
import ChannelGrid          from '../components/channels/ChannelGrid.jsx'
import ChannelFilter        from '../components/channels/ChannelFilter.jsx'
import SectionHeader        from '../components/ui/SectionHeader.jsx'
import PageMeta             from '../components/ui/PageMeta.jsx'

// Blueprint: data/channels.json এর category/subcategory থেকে আসে
// Static fallback — store এর getSubcategories() দিয়েও পাওয়া যায়
const SUBCATEGORIES = ['All', 'Cricket', 'Football', 'Motorsport', 'Boxing', 'Tennis']

export default function Sports() {
  const { query, setQuery, filteredChannels, activeSubcategory, setSubcategory } = useSearch()
  const searchQuery = useChannelStore(s => s.searchQuery)

  // ⚠️ [Bug Fix] Same class of bug as the tab-switch scroll fix — clicking a
  // category pill (Cricket/Football/…) re-filters in place without a route
  // change, so a person scrolled deep into "All" can click "Boxing" (often
  // just 1-2 channels) and stay stuck scrolled past the now-short grid.
  // Keyed on activeSubcategory only — NOT on `query` — so typing in the
  // search box never yanks the scroll position on every keystroke.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }, [activeSubcategory])

  return (
    <>
      <PageMeta
        title="Sports Channels"
        description="Browse all live sports channels — cricket, football, motorsport, boxing and more. Free HD streaming."
      />

      <SectionHeader
        title="Sports Channels"
        subtitle={`${filteredChannels.length} channel${filteredChannels.length !== 1 ? 's' : ''} available`}
      />

      {/* Search + category filter */}
      <ChannelFilter
        searchQuery={query}
        onSearch={setQuery}
        categories={SUBCATEGORIES}
        active={activeSubcategory}
        onFilter={setSubcategory}
        placeholder="Search sports channels…"
        className="mb-6"
      />

      {/* Active search label */}
      {searchQuery && (
        <p className="mb-4 text-sm text-white/40">
          Results for &ldquo;<span className="text-white/70">{searchQuery}</span>&rdquo;
          {' — '}<span className="text-white/50">{filteredChannels.length} found</span>
        </p>
      )}

      <ChannelGrid
        channels={filteredChannels}
        emptyMessage={
          searchQuery
            ? `No channels found for "${searchQuery}". Try a different query.`
            : 'No channels in this category.'
        }
      />
    </>
  )
}
