// Tabs.jsx — Two variants: 'underline' (default) and 'pill'

export default function Tabs({
  tabs      = [],   // [{ id, label, count? }]
  active,
  onChange,
  variant   = 'underline',
  className = '',
}) {
  if (variant === 'pill') {
    return (
      <div className={`flex gap-1 bg-brand-surface border border-brand-border rounded-xl p-1 ${className}`}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex-1 flex items-center justify-center gap-1.5
              py-2 rounded-lg text-xs font-semibold transition-all
              ${active === tab.id
                ? 'bg-brand-elevated text-white shadow-sm'
                : 'text-white/40 hover:text-white/70'
              }
            `}
          >
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

  // underline (default)
  return (
    <div className={`flex gap-0 border-b border-brand-border overflow-x-auto scrollbar-hide ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px
            whitespace-nowrap transition-all flex items-center gap-2
            ${active === tab.id
              ? 'border-brand-red text-white'
              : 'border-transparent text-white/40 hover:text-white/60'
            }
          `}
        >
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
