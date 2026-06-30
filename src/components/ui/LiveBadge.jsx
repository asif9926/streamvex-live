// LiveBadge.jsx — "● LIVE" pill with animated pulse dot
// Used by: ChannelCard.jsx (required import)
// blueprint: src/components/ui/LiveBadge.jsx

export default function LiveBadge({ small = false, className = '' }) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-full border
        ${small
          ? 'px-1.5 py-0.5 text-[9px]'
          : 'px-2.5 py-1   text-[10px]'
        }
        bg-brand-red/10 border-brand-red/30 text-brand-red
        ${className}
      `}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-red opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-red" />
      </span>
      LIVE
    </span>
  )
}
