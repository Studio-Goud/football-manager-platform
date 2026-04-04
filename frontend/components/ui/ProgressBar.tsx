'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface ProgressBarProps {
  value: number // 0-100
  max?: number
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'gradient'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showLabel?: boolean
  label?: string
  animated?: boolean
  className?: string
}

export function ProgressBar({
  value,
  max = 100,
  color = 'green',
  size = 'md',
  showLabel = false,
  label,
  animated = true,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const colors = {
    green: 'bg-[#00FF87]',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-400',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    gradient: 'bg-gradient-to-r from-[#00FF87] to-blue-500',
  }

  const sizes = {
    xs: 'h-1',
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }

  const glowColors = {
    green: 'shadow-[0_0_8px_rgba(0,255,135,0.5)]',
    blue: 'shadow-[0_0_8px_rgba(59,130,246,0.5)]',
    yellow: 'shadow-[0_0_8px_rgba(234,179,8,0.5)]',
    red: 'shadow-[0_0_8px_rgba(239,68,68,0.5)]',
    purple: 'shadow-[0_0_8px_rgba(168,85,247,0.5)]',
    gradient: 'shadow-[0_0_8px_rgba(0,255,135,0.4)]',
  }

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-gray-400">{label}</span>
          {showLabel && (
            <span className="text-xs font-semibold text-white">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-[#162040] rounded-full overflow-hidden', sizes[size])}>
        <motion.div
          className={cn(
            'h-full rounded-full',
            colors[color],
            glowColors[color]
          )}
          initial={animated ? { width: 0 } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// Segmented progress bar
interface SegmentedProgressProps {
  segments: Array<{ value: number; color: string; label?: string }>
  total: number
  className?: string
}

export function SegmentedProgress({ segments, total, className }: SegmentedProgressProps) {
  return (
    <div className={cn('flex gap-1 rounded-full overflow-hidden h-3', className)}>
      {segments.map((seg, i) => {
        const width = (seg.value / total) * 100
        return (
          <motion.div
            key={i}
            style={{ backgroundColor: seg.color }}
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${width}%` }}
            transition={{ duration: 0.8, delay: i * 0.1 }}
          />
        )
      })}
    </div>
  )
}
