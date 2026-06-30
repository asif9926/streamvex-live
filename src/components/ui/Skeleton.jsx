// Skeleton.jsx — Shimmer loading placeholder
// index.css এ .shimmer animation define করা আছে

export default function Skeleton({ className = '', count = 1 }) {
  if (count > 1) {
    return (
      <div className="flex flex-col gap-3">
        {[...Array(count)].map((_, i) => (
          <div key={i} className={`shimmer rounded-lg bg-brand-elevated ${className}`} />
        ))}
      </div>
    )
  }

  return (
    <div className={`shimmer rounded-lg bg-brand-elevated ${className}`} />
  )
}

// Convenience wrappers
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {[...Array(lines)].map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-brand-surface border border-brand-border rounded-xl p-4 flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  )
}
