'use client'

import { UserTier } from '@/types'
import { TIER_CONFIG } from '@/lib/constants'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface TierProgressProps {
  currentTier: UserTier
  totalInvested: number
}

const tierOrder: UserTier[] = ['bronze', 'silver', 'gold', 'platinum', 'rare']

export function TierProgress({ currentTier, totalInvested }: TierProgressProps) {
  const currentIndex = tierOrder.indexOf(currentTier)
  const nextTier = tierOrder[currentIndex + 1] as UserTier | undefined
  const config = TIER_CONFIG[currentTier]
  const nextConfig = nextTier ? TIER_CONFIG[nextTier] : null

  const progressToNext = nextConfig
    ? ((totalInvested - config.min_invested) / (nextConfig.min_invested - config.min_invested)) * 100
    : 100

  return (
    <div className="space-y-4">
      {/* Current tier */}
      <div className="flex items-center gap-3 bg-[#0A0E1A] rounded-xl p-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg" style={{ background: `${config.color}20`, color: config.color }}>
          {currentTier.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-lg" style={{ color: config.color }}>{config.label}</p>
          <p className="text-xs text-gray-400">Totaal geïnvesteerd: €{totalInvested.toFixed(0)}</p>
        </div>
      </div>

      {/* Benefits */}
      <div>
        <p className="text-sm font-medium text-gray-400 mb-2">Jouw voordelen</p>
        <div className="space-y-1.5">
          {config.benefits.map(benefit => (
            <div key={benefit} className="flex items-center gap-2 text-sm">
              <span className="text-[#00FF87]">✓</span>
              <span>{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Progress to next tier */}
      {nextConfig && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>{config.label}</span>
            <span style={{ color: nextConfig.color }}>{nextConfig.label}</span>
          </div>
          <ProgressBar value={progressToNext} max={100} color="gradient" />
          <p className="text-xs text-gray-500 mt-1.5">
            €{Math.max(0, nextConfig.min_invested - totalInvested).toFixed(0)} meer investeren voor {nextConfig.label}
          </p>
        </div>
      )}

      {/* All tiers */}
      <div>
        <p className="text-sm font-medium text-gray-400 mb-2">Tier overzicht</p>
        <div className="space-y-2">
          {tierOrder.map((tier, i) => {
            const tc = TIER_CONFIG[tier]
            const isActive = tier === currentTier
            const isPast = i < currentIndex
            return (
              <div key={tier} className={`flex items-center gap-3 p-2 rounded-lg ${isActive ? 'bg-[#1E2A45]' : ''}`}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: `${tc.color}${isPast || isActive ? 'ff' : '30'}`, color: isPast || isActive ? '#0A0E1A' : tc.color }}>
                  {isPast || isActive ? '✓' : i - currentIndex}
                </div>
                <span className="text-sm font-medium flex-1" style={{ color: isActive ? tc.color : isPast ? tc.color : '#6B7280' }}>
                  {tc.label}
                </span>
                <span className="text-xs text-gray-500">€{tc.min_invested}+</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
