// TournamentTabs.jsx — Pill tabs: Series | Results | Upcoming

export default function TournamentTabs({ tabs = [], active, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 bg-brand-surface border border-brand-border rounded-xl p-1 max-w-md ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            flex-1 flex items-center justify-center gap-1.5
            py-2 px-3 rounded-lg text-xs font-semibold transition-all
            ${active === tab.id
              ? 'bg-brand-elevated text-white shadow-sm'
              : 'text-white/40 hover:text-white/70'
            }
          `}
        >
          {tab.icon && <span className="text-sm">{tab.icon}</span>}
          {tab.label}
          {tab.count != null && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
              ${active === tab.id ? 'bg-brand-red text-white' : 'bg-white/10 text-white/40'}`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
