// Card.jsx — Surface container with optional click / hover behavior

export default function Card({
  children,
  className = '',
  onClick,
  elevated  = false,
  hoverable = false,
  padding   = true,
}) {
  const base = [
    'rounded-xl border border-brand-border',
    elevated ? 'bg-brand-elevated' : 'bg-brand-surface',
    hoverable || onClick ? 'hover:border-white/20 hover:-translate-y-0.5 transition-all card-glow' : 'transition-colors',
    padding ? 'p-4' : '',
    onClick ? 'cursor-pointer' : '',
    className,
  ].filter(Boolean).join(' ')

  if (onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={e => e.key === 'Enter' && onClick(e)}
        className={base}
      >
        {children}
      </div>
    )
  }

  return <div className={base}>{children}</div>
}
