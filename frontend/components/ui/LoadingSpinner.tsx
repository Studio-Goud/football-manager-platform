'use client'

import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: 'green' | 'blue' | 'white' | 'gray'
  className?: string
}

export function LoadingSpinner({
  size = 'md',
  color = 'green',
  className,
}: LoadingSpinnerProps) {
  const sizes = {
    xs: 'w-3 h-3 border',
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
    xl: 'w-16 h-16 border-4',
  }

  const colors = {
    green: 'border-[#00FF87]/30 border-t-[#00FF87]',
    blue: 'border-blue-500/30 border-t-blue-500',
    white: 'border-white/30 border-t-white',
    gray: 'border-gray-600/30 border-t-gray-400',
  }

  return (
    <div
      className={cn(
        'rounded-full animate-spin',
        sizes[size],
        colors[color],
        className
      )}
    />
  )
}

// Full page loader
export function PageLoader({ message = 'Laden...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-[#0A0E1A] flex flex-col items-center justify-center gap-4">
      <LoadingSpinner size="xl" />
      <p className="text-gray-400 text-sm animate-pulse">{message}</p>
    </div>
  )
}

// Card skeleton
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-[#0F1629] border border-[#1E2A45] rounded-2xl p-6 animate-pulse',
        className
      )}
    >
      <div className="h-4 bg-[#162040] rounded w-1/3 mb-4" />
      <div className="space-y-3">
        <div className="h-3 bg-[#162040] rounded w-full" />
        <div className="h-3 bg-[#162040] rounded w-4/5" />
        <div className="h-3 bg-[#162040] rounded w-3/5" />
      </div>
    </div>
  )
}

// Player card skeleton
export function PlayerCardSkeleton() {
  return (
    <div className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-[#162040] rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-[#162040] rounded w-3/4" />
          <div className="h-2 bg-[#162040] rounded w-1/2" />
        </div>
      </div>
      <div className="h-2 bg-[#162040] rounded w-full mb-2" />
      <div className="flex justify-between">
        <div className="h-3 bg-[#162040] rounded w-16" />
        <div className="h-3 bg-[#162040] rounded w-12" />
      </div>
    </div>
  )
}

// Table skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-[#0F1629] rounded-xl animate-pulse">
          <div className="w-8 h-8 bg-[#162040] rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-[#162040] rounded w-1/4" />
            <div className="h-2 bg-[#162040] rounded w-1/6" />
          </div>
          <div className="h-4 bg-[#162040] rounded w-16" />
          <div className="h-4 bg-[#162040] rounded w-12" />
        </div>
      ))}
    </div>
  )
}
