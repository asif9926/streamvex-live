// ScoreSkeleton.jsx — Shimmer loading state for ScoreGrid

import Skeleton from '../ui/Skeleton.jsx'

export default function ScoreSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-brand-surface border border-brand-border rounded-xl p-5 flex flex-col gap-4">
          {/* header row */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          {/* team 1 */}
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-10 w-16 rounded" />
          </div>
          <Skeleton className="h-px w-full" />
          {/* team 2 */}
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-10 w-16 rounded" />
          </div>
          {/* status */}
          <Skeleton className="h-4 w-3/4 mx-auto rounded-full" />
        </div>
      ))}
    </div>
  )
}
