'use client'

import { HTMLAttributes } from 'react'
import { cn, getTierBadge } from '@/lib/utils'
import { UserTier, PlayerPosition } from '@/types'
import { getPositionBgClass } from '@/lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  size?: 'sm' | 'md' | 'lg'
}

export function Badge({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-gray-700/50 text-gray-300 border-gray-600/30',
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    danger: 'bg-red-500/20 text-red-400 border-red-500/30',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  }

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold rounded-lg border',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

// Tier badge
interface TierBadgeProps {
  tier: UserTier
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

export function TierBadge({ tier, size = 'md', showIcon = true }: TierBadgeProps) {
  const badge = getTierBadge(tier)

  const tierIcons: Record<UserTier, string> = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎',
    rare: '⭐',
  }

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-bold rounded-lg border',
        badge.bgClass,
        badge.borderClass,
        badge.textClass,
        sizes[size]
      )}
    >
      {showIcon && <span>{tierIcons[tier]}</span>}
      {badge.label}
    </span>
  )
}

// Position badge
interface PositionBadgeProps {
  position: PlayerPosition
  size?: 'sm' | 'md' | 'lg'
}

export function PositionBadge({ position, size = 'md' }: PositionBadgeProps) {
  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-bold rounded border',
        getPositionBgClass(position),
        sizes[size]
      )}
    >
      {position}
    </span>
  )
}

// Live badge
export function LiveBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold',
        className
      )}
    >
      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
      LIVE
    </span>
  )
}

// Status badge
interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
    verified: { label: 'Geverifieerd', variant: 'success' },
    pending: { label: 'In Behandeling', variant: 'warning' },
    submitted: { label: 'Ingediend', variant: 'info' },
    rejected: { label: 'Afgewezen', variant: 'danger' },
    not_started: { label: 'Niet Gestart', variant: 'default' },
    active: { label: 'Actief', variant: 'success' },
    completed: { label: 'Voltooid', variant: 'success' },
    failed: { label: 'Mislukt', variant: 'danger' },
    available: { label: 'Beschikbaar', variant: 'success' },
    injured: { label: 'Geblesseerd', variant: 'danger' },
    suspended: { label: 'Geschorst', variant: 'danger' },
    doubt: { label: 'Twijfelachtig', variant: 'warning' },
  }

  const config = statusConfig[status] || { label: status, variant: 'default' as const }

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  )
}
