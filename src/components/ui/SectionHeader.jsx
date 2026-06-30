// SectionHeader.jsx — Page / section heading with optional right-side action

export default function SectionHeader({ title, subtitle, children, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-5 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-white leading-snug">{title}</h2>
        {subtitle && (
          <p className="text-sm text-white/40 mt-0.5">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex-shrink-0 mt-0.5">{children}</div>
      )}
    </div>
  )
}
