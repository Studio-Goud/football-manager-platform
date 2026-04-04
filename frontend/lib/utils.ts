import { clsx, type ClassValue } from 'clsx'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'
import { UserTier, PlayerPosition, EventType } from '@/types'

// ─── Class Names ──────────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

// ─── Credits & Currency ───────────────────────────────────────────────────────

export function formatCredits(amount: number, showSign = false): string {
  const formatted = new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))

  if (showSign) {
    return amount >= 0 ? `+${formatted}` : `-${formatted}`
  }
  return formatted
}

export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function creditsToEuro(credits: number): number {
  // 1 credit = €1 for simplicity
  return credits
}

// ─── Points ───────────────────────────────────────────────────────────────────

export function formatPoints(points: number, showSign = false): string {
  if (showSign && points > 0) return `+${points}`
  return points.toString()
}

export function formatLargeNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

// ─── Position Colors ──────────────────────────────────────────────────────────

export function getPositionColor(position: PlayerPosition): string {
  const colors: Record<PlayerPosition, string> = {
    GK: '#FFD700',
    DEF: '#00FF87',
    MID: '#3B82F6',
    FWD: '#EF4444',
  }
  return colors[position]
}

export function getPositionBgClass(position: PlayerPosition): string {
  const classes: Record<PlayerPosition, string> = {
    GK: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    DEF: 'bg-green-500/20 text-green-400 border-green-500/30',
    MID: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    FWD: 'bg-red-500/20 text-red-400 border-red-500/30',
  }
  return classes[position]
}

export function getPositionLabel(position: PlayerPosition): string {
  const labels: Record<PlayerPosition, string> = {
    GK: 'Keeper',
    DEF: 'Verdediger',
    MID: 'Middenvelder',
    FWD: 'Aanvaller',
  }
  return labels[position]
}

// ─── Tier Badges ──────────────────────────────────────────────────────────────

export function getTierBadge(tier: UserTier): {
  label: string
  color: string
  bgClass: string
  borderClass: string
  textClass: string
  ringClass: string
} {
  const badges = {
    bronze: {
      label: 'Bronze',
      color: '#CD7F32',
      bgClass: 'bg-amber-800/20',
      borderClass: 'border-amber-700/50',
      textClass: 'text-amber-600',
      ringClass: 'ring-amber-600',
    },
    silver: {
      label: 'Silver',
      color: '#C0C0C0',
      bgClass: 'bg-gray-400/20',
      borderClass: 'border-gray-400/50',
      textClass: 'text-gray-300',
      ringClass: 'ring-gray-400',
    },
    gold: {
      label: 'Gold',
      color: '#FFD700',
      bgClass: 'bg-yellow-500/20',
      borderClass: 'border-yellow-500/50',
      textClass: 'text-yellow-400',
      ringClass: 'ring-yellow-500',
    },
    platinum: {
      label: 'Platinum',
      color: '#E5E4E2',
      bgClass: 'bg-slate-300/20',
      borderClass: 'border-slate-300/50',
      textClass: 'text-slate-300',
      ringClass: 'ring-slate-300',
    },
    rare: {
      label: 'Rare',
      color: '#9B59B6',
      bgClass: 'bg-purple-500/20',
      borderClass: 'border-purple-500/50',
      textClass: 'text-purple-400',
      ringClass: 'ring-purple-500',
    },
  }
  return badges[tier]
}

export function getTierThreshold(tier: UserTier): { min: number; max: number } {
  const thresholds: Record<UserTier, { min: number; max: number }> = {
    bronze: { min: 0, max: 499 },
    silver: { min: 500, max: 1499 },
    gold: { min: 1500, max: 3999 },
    platinum: { min: 4000, max: 9999 },
    rare: { min: 10000, max: Infinity },
  }
  return thresholds[tier]
}

export function getNextTier(tier: UserTier): UserTier | null {
  const tierOrder: UserTier[] = ['bronze', 'silver', 'gold', 'platinum', 'rare']
  const currentIndex = tierOrder.indexOf(tier)
  if (currentIndex === tierOrder.length - 1) return null
  return tierOrder[currentIndex + 1]
}

// ─── Prize Calculations ───────────────────────────────────────────────────────

export function calculatePrize(rank: number, totalParticipants: number, prizePool: number): number {
  const topPercent = rank / totalParticipants

  if (topPercent <= 0.01) return prizePool * 0.20  // Top 1%: 20% of pool
  if (topPercent <= 0.05) return prizePool * 0.10  // Top 5%: 10% of pool
  if (topPercent <= 0.10) return prizePool * 0.05  // Top 10%: 5% of pool
  if (topPercent <= 0.20) return prizePool * 0.02  // Top 20%: 2% of pool
  return 0
}

export function getPrizeDistribution(prizePool: number): Array<{
  label: string
  percentage: number
  amount: number
}> {
  return [
    { label: '1e plaats', percentage: 20, amount: prizePool * 0.20 },
    { label: '2e plaats', percentage: 12, amount: prizePool * 0.12 },
    { label: '3e plaats', percentage: 8, amount: prizePool * 0.08 },
    { label: 'Top 5', percentage: 5, amount: prizePool * 0.05 },
    { label: 'Top 10', percentage: 3, amount: prizePool * 0.03 },
    { label: 'Top 20%', percentage: 1, amount: prizePool * 0.01 },
  ]
}

// ─── Event Colors & Labels ────────────────────────────────────────────────────

export function getEventEmoji(type: EventType): string {
  const emojis: Record<EventType, string> = {
    goal: '⚽',
    assist: '🎯',
    yellow_card: '🟨',
    red_card: '🟥',
    own_goal: '😬',
    penalty_saved: '🧤',
    penalty_missed: '❌',
    substitution: '🔄',
    clean_sheet: '🧱',
  }
  return emojis[type] || '📋'
}

export function getEventLabel(type: EventType): string {
  const labels: Record<EventType, string> = {
    goal: 'Doelpunt',
    assist: 'Assist',
    yellow_card: 'Gele Kaart',
    red_card: 'Rode Kaart',
    own_goal: 'Eigen Doelpunt',
    penalty_saved: 'Penalty Gestopt',
    penalty_missed: 'Penalty Gemist',
    substitution: 'Wissel',
    clean_sheet: 'Clean Sheet',
  }
  return labels[type] || type
}

export function getEventPointsColor(points: number): string {
  if (points > 0) return 'text-green-400'
  if (points < 0) return 'text-red-400'
  return 'text-gray-400'
}

// ─── Form Indicator ───────────────────────────────────────────────────────────

export function getFormLabel(form: number): string {
  if (form >= 8) return 'Uitstekend'
  if (form >= 6) return 'Goed'
  if (form >= 4) return 'Gemiddeld'
  if (form >= 2) return 'Slecht'
  return 'Zeer Slecht'
}

export function getFormColor(form: number): string {
  if (form >= 8) return '#00FF87'
  if (form >= 6) return '#86EFAC'
  if (form >= 4) return '#FCD34D'
  if (form >= 2) return '#F97316'
  return '#EF4444'
}

export function getFormClass(form: number): string {
  if (form >= 8) return 'text-green-400'
  if (form >= 6) return 'text-green-300'
  if (form >= 4) return 'text-yellow-400'
  if (form >= 2) return 'text-orange-400'
  return 'text-red-400'
}

// ─── Fixture Difficulty ───────────────────────────────────────────────────────

export function getDifficultyColor(difficulty: number): string {
  const colors = ['', '#22C55E', '#86EFAC', '#FCD34D', '#F97316', '#EF4444']
  return colors[difficulty] || '#6B7280'
}

export function getDifficultyLabel(difficulty: number): string {
  const labels = ['', 'Zeer Makkelijk', 'Makkelijk', 'Gemiddeld', 'Moeilijk', 'Zeer Moeilijk']
  return labels[difficulty] || 'Onbekend'
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

export function formatDate(date: string | Date, formatStr = 'dd MMM yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, formatStr, { locale: nl })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMM yyyy HH:mm', { locale: nl })
}

export function formatTimeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: nl })
}

export function formatTimeRemaining(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  const now = new Date()
  const diff = d.getTime() - now.getTime()

  if (diff <= 0) return 'Verlopen'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `${days}d ${hours}u`
  if (hours > 0) return `${hours}u ${minutes}m`
  return `${minutes}m`
}

// ─── Rank Helpers ─────────────────────────────────────────────────────────────

export function getRankSuffix(rank: number): string {
  return `#${rank}`
}

export function getRankChange(current: number, previous: number): {
  direction: 'up' | 'down' | 'same'
  diff: number
} {
  if (current < previous) return { direction: 'up', diff: previous - current }
  if (current > previous) return { direction: 'down', diff: current - previous }
  return { direction: 'same', diff: 0 }
}

// ─── Availability Helpers ─────────────────────────────────────────────────────

export function getAvailabilityLabel(availability: string): string {
  const labels: Record<string, string> = {
    available: 'Beschikbaar',
    injured: 'Geblesseerd',
    suspended: 'Geschorst',
    doubt: 'Twijfelachtig',
  }
  return labels[availability] || availability
}

export function getAvailabilityColor(availability: string): string {
  const colors: Record<string, string> = {
    available: 'text-green-400',
    injured: 'text-red-400',
    suspended: 'text-red-400',
    doubt: 'text-yellow-400',
  }
  return colors[availability] || 'text-gray-400'
}

// ─── Team Budget ──────────────────────────────────────────────────────────────

export function calculateTeamValue(players: Array<{ price: number }>): number {
  return players.reduce((sum, p) => sum + p.price, 0)
}

export function getBudgetStatus(remaining: number, total: number): {
  percentage: number
  color: string
  label: string
} {
  const percentage = (remaining / total) * 100
  if (percentage > 30) return { percentage, color: 'text-green-400', label: 'Goed' }
  if (percentage > 10) return { percentage, color: 'text-yellow-400', label: 'Krap' }
  return { percentage, color: 'text-red-400', label: 'Bijna op' }
}

// ─── Truncate ─────────────────────────────────────────────────────────────────

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

// ─── Random helpers for mock data ─────────────────────────────────────────────

export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
