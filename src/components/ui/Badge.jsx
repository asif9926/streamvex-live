// Badge.jsx — Pill badges: live, status, format labels
// blueprint spec: "LIVE badge with pulse"

const VARIANTS = {
  live:    'bg-brand-red      text-white        border-brand-red/40',
  green:   'bg-green-500/15   text-green-400    border-green-500/25',
  blue:    'bg-brand-blue/15  text-brand-blue   border-brand-blue/25',
  yellow:  'bg-yellow-500/15  text-yellow-400   border-yellow-500/25',
  purple:  'bg-purple-500/15  text-purple-400   border-purple-500/25',
  amber:   'bg-amber-500/10   text-amber-400    border-amber-500/20',
  red:     'bg-red-500/15     text-red-400      border-red-500/25',
  default: 'bg-white/5        text-white/50     border-white/10',
}

export default function Badge({
  children,
  variant   = 'default',
  pulse     = false,
  small     = false,
  className = '',
}) {
  const variantClass = VARIANTS[variant] ?? VARIANTS.default

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 border font-bold uppercase tracking-wider rounded-full
        ${small ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'}
        ${variantClass}
        ${className}
      `}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      )}
      {children}
    </span>
  )
}
