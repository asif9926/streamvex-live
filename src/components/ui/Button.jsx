// Button.jsx — Design system button component
// Variants: primary | secondary | ghost | blue | green | danger
// Sizes:    sm | md | lg

const VARIANTS = {
  primary:   'bg-brand-red text-white border-brand-red hover:bg-red-700 shadow-lg shadow-brand-red/20',
  secondary: 'bg-brand-surface text-white/70 border-brand-border hover:text-white hover:border-white/20',
  ghost:     'bg-transparent text-white/50 border-transparent hover:text-white hover:bg-white/5',
  blue:      'bg-brand-blue text-white border-brand-blue hover:bg-blue-600',
  green:     'bg-green-500/10 text-green-400 border-green-500/25 hover:bg-green-500/20',
  danger:    'bg-red-500/10 text-red-400 border-red-500/25 hover:bg-red-500/20',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-7 py-3   text-base rounded-xl gap-2.5',
}

export default function Button({
  children,
  variant   = 'primary',
  size      = 'md',
  disabled  = false,
  loading   = false,
  onClick,
  className = '',
  type      = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center font-semibold border
        transition-all duration-150 select-none whitespace-nowrap
        disabled:opacity-40 disabled:cursor-not-allowed
        ${VARIANTS[variant] ?? VARIANTS.primary}
        ${SIZES[size]    ?? SIZES.md}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
