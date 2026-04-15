import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-[#1E2A45]/60',
        className
      )}
    />
  )
}

export function PlayerCardSkeleton() {
  return (
    <div className="bg-[#0F1629] border border-[#1E2A45] rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
      </div>
    </div>
  )
}

export function LeagueCardSkeleton() {
  return (
    <div className="bg-[#0F1629] border border-[#1E2A45] rounded-2xl p-5 space-y-4">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-10 w-16 rounded-xl" />
      </div>
      <Skeleton className="h-12 rounded-xl" />
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-[#0F1629] border border-[#1E2A45] rounded-2xl p-5 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  )
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-[#1E2A45]">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === 0 ? 'w-8' : i === 1 ? 'flex-1' : 'w-16'}`} />
      ))}
    </div>
  )
}

export function TeamPitchSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-7 w-24" />
      </div>
      <div className="bg-[#0F1629] border border-[#1E2A45] rounded-3xl overflow-hidden">
        <Skeleton className="h-[400px] sm:h-[500px]" />
      </div>
    </div>
  )
}
