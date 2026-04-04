'use client'

import Image from 'next/image'
import { cn, getTierBadge } from '@/lib/utils'
import { UserTier } from '@/types'
import { User } from 'lucide-react'

interface AvatarProps {
  src?: string | null
  alt?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  tier?: UserTier
  className?: string
  fallback?: string
}

export function Avatar({
  src,
  alt = 'Avatar',
  size = 'md',
  tier,
  className,
  fallback,
}: AvatarProps) {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-24 h-24 text-2xl',
  }

  const ringWidths = {
    xs: 'ring-1',
    sm: 'ring-1',
    md: 'ring-2',
    lg: 'ring-2',
    xl: 'ring-2',
    '2xl': 'ring-3',
  }

  const tierRingColor = tier ? getTierBadge(tier).ringClass : null

  const pixelSizes = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
    '2xl': 96,
  }

  const initials = fallback
    ? fallback
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : null

  return (
    <div
      className={cn(
        'relative rounded-full flex-shrink-0 overflow-hidden bg-[#162040] flex items-center justify-center',
        sizes[size],
        tier && `${ringWidths[size]} ring-offset-2 ring-offset-[#0A0E1A] ${tierRingColor}`,
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={pixelSizes[size]}
          height={pixelSizes[size]}
          className="object-cover w-full h-full"
          unoptimized
        />
      ) : initials ? (
        <span className="font-bold text-gray-300 select-none">{initials}</span>
      ) : (
        <User className="w-1/2 h-1/2 text-gray-500" />
      )}
    </div>
  )
}
