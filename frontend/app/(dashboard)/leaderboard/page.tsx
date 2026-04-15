'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, ArrowUp, ArrowDown, Minus, Crown } from 'lucide-react'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, TierBadge } from '@/components/ui/Badge'
import { mockLeaderboard } from '@/lib/mockData'

type ViewMode = 'season' | 'gameweek'

export default function LeaderboardPage() {
  const { user } = useAuthStore()
  const { data: leaderboard, isLoading } = useLeaderboard()
  const [viewMode, setViewMode] = useState<ViewMode>('season')

  const entries = leaderboard?.entries ?? mockLeaderboard
  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)
  const myEntry = entries.find(e => e.is_current_user || e.user.id === user?.id)

  const prizeDistribution = [
    { rank: '1e', pct: 30, color: '#FFD700' },
    { rank: '2e', pct: 20, color: '#C0C0C0' },
    { rank: '3e', pct: 12, color: '#CD7F32' },
    { rank: '4–10', pct: 25, color: '#00FF87' },
    { rank: '11–20%', pct: 13, color: '#3B82F6' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Ranglijst</h1>
          <p className="text-gray-400 text-sm mt-1">
            {leaderboard?.total_participants ?? 1247} deelnemers · Prijzenpot: €{leaderboard?.prize_pool?.toLocaleString() ?? '12.480'}
          </p>
        </div>
        <div className="flex gap-1 bg-[#0F1629] rounded-xl p-1 border border-[#1E2A45]">
          {(['season', 'gameweek'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                viewMode === mode ? 'bg-[#00FF87] text-[#0A0E1A]' : 'text-gray-400'
              }`}
            >
              {mode === 'season' ? 'Seizoen' : 'Speelronde'}
            </button>
          ))}
        </div>
      </div>

      {/* Prize distribution */}
      <Card className="p-4">
        <h2 className="font-bold mb-3 text-sm">Prijzenverdeling (top 20% wint)</h2>
        <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
          {prizeDistribution.map(({ rank, pct, color }) => (
            <div key={rank} title={`${rank}: ${pct}%`} className="flex items-center justify-center text-xs font-bold text-[#0A0E1A]" style={{ flex: pct, background: color }}>
              {pct >= 15 && rank}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {prizeDistribution.map(({ rank, pct, color }) => (
            <div key={rank} className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
              <span className="text-gray-400">{rank}: {pct}%</span>
            </div>
          ))}
        </div>
      </Card>

      {/* My position */}
      {myEntry && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#00FF87]/10 border border-[#00FF87]/30 rounded-xl p-4 flex items-center gap-4"
        >
          <span className="text-2xl font-black text-[#00FF87]">#{myEntry.rank}</span>
          <div className="flex-1">
            <p className="font-bold">Jouw positie</p>
            <p className="text-sm text-gray-400">{myEntry.total_points} punten · {myEntry.gameweek_points} dit GW</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-[#00FF87]">€{myEntry.prize}</p>
            <p className="text-xs text-gray-500">geschatte prijs</p>
          </div>
        </motion.div>
      )}

      {/* Podium top 3 */}
      <div className="grid grid-cols-3 gap-3">
        {[top3[1], top3[0], top3[2]].map((entry, podiumIdx) => {
          if (!entry) return <div key={podiumIdx} />
          const heights = ['h-24', 'h-32', 'h-20']
          const colors = ['#C0C0C0', '#FFD700', '#CD7F32']
          const ranks = [2, 1, 3]
          const color = colors[podiumIdx]
          return (
            <motion.div
              key={entry.rank}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: podiumIdx * 0.1 }}
              className="flex flex-col items-center gap-2"
            >
              <Avatar fallback={entry.user.username} size="md" />
              <p className="font-bold text-xs text-center truncate w-full px-2">{entry.user.username}</p>
              <p className="text-xs text-gray-400">{entry.total_points} pt</p>
              <div className={`w-full ${heights[podiumIdx]} rounded-t-lg flex items-start justify-center pt-2`} style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                <span className="text-lg font-black" style={{ color }}>
                  {ranks[podiumIdx] === 1 ? <Crown className="w-6 h-6" style={{ color }} /> : `#${ranks[podiumIdx]}`}
                </span>
              </div>
              <p className="font-bold text-sm" style={{ color }}>€{entry.prize}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Full table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-[#1E2A45]">
          <h2 className="font-bold">Volledige Ranglijst</h2>
        </div>
        <div className="divide-y divide-[#1E2A45]">
          {entries.map((entry, i) => {
            const rankDelta = entry.previous_rank - entry.rank
            const isCurrentUser = entry.is_current_user || entry.user.id === user?.id

            return (
              <motion.div
                key={entry.rank}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.03, 0.5) }}
                className={`flex items-center gap-3 px-4 py-3 ${isCurrentUser ? 'bg-[#00FF87]/5' : 'hover:bg-[#0F1629]'} transition-colors`}
              >
                {/* Rank */}
                <span className={`w-8 h-8 flex items-center justify-center text-sm font-bold rounded-lg flex-shrink-0 ${
                  entry.rank === 1 ? 'bg-[#FFD700]/20 text-[#FFD700]' :
                  entry.rank === 2 ? 'bg-[#C0C0C0]/20 text-[#C0C0C0]' :
                  entry.rank === 3 ? 'bg-[#CD7F32]/20 text-[#CD7F32]' :
                  'text-gray-500'
                }`}>
                  {entry.rank}
                </span>

                {/* Trend */}
                <div className="w-6 flex-shrink-0">
                  {rankDelta > 0 ? <ArrowUp className="w-4 h-4 text-[#00FF87]" /> :
                   rankDelta < 0 ? <ArrowDown className="w-4 h-4 text-red-400" /> :
                   <Minus className="w-4 h-4 text-gray-600" />}
                </div>

                {/* Avatar + name */}
                <Avatar fallback={entry.user.username} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm ${isCurrentUser ? 'text-[#00FF87]' : ''}`}>{entry.user.username}</span>
                    <TierBadge tier={entry.user.tier} size="sm" />
                  </div>
                  <span className="text-xs text-gray-500">{entry.team_name}</span>
                </div>

                {/* Points */}
                <div className="text-right hidden sm:block">
                  <p className="font-bold text-sm">{entry.total_points}</p>
                  <p className="text-xs text-gray-500">+{entry.gameweek_points} GW</p>
                </div>

                {/* Prize */}
                <div className="text-right min-w-[60px]">
                  {entry.prize > 0
                    ? <span className="font-bold text-[#00FF87]">€{entry.prize}</span>
                    : <span className="text-gray-600 text-sm">—</span>
                  }
                </div>
              </motion.div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
