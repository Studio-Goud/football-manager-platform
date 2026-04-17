'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, ArrowUp, ArrowDown, Minus, Crown, Coins, RefreshCw } from 'lucide-react'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, TierBadge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants'
import api from '@/lib/api'

type ViewMode = 'season' | 'gameweek'

export default function LeaderboardPage() {
  const { user } = useAuthStore()
  const { data: leaderboard, isLoading, isError, refetch } = useLeaderboard()
  const [viewMode, setViewMode] = useState<ViewMode>('season')
  const [liveRefreshed, setLiveRefreshed] = useState(false)
  const qc = useQueryClient()

  // Auto-refresh on gameweek tick events (fired from simulationService)
  useEffect(() => {
    const handleTick = () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.leaderboard('current') })
      setLiveRefreshed(true)
      setTimeout(() => setLiveRefreshed(false), 3000)
    }
    window.addEventListener('sim-tick', handleTick)
    return () => window.removeEventListener('sim-tick', handleTick)
  }, [qc])

  interface TopScorer {
    player_id: number
    player_name: string
    club: string
    position: string
    photo_url: string | null
    goals: number
    assists: number
    match: string
  }
  const { data: topScorers = [] } = useQuery<TopScorer[]>({
    queryKey: ['top-scorers'],
    queryFn: async () => {
      const res = await api.get('/players/top-scorers')
      return res.data.data
    },
    staleTime: 300000,
  })

  const allEntries = leaderboard?.entries ?? []
  const entries = viewMode === 'gameweek'
    ? [...allEntries].sort((a, b) => (b.gameweek_points ?? 0) - (a.gameweek_points ?? 0)).map((e, i) => ({ ...e, rank: i + 1 }))
    : allEntries
  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)
  const myEntry = entries.find(e => e.is_current_user || e.user.id === user?.id)

  const coinRewards = [
    { rank: '1e', coins: 2000, pct: 30, color: '#FFD700' },
    { rank: '2e', coins: 1000, pct: 20, color: '#C0C0C0' },
    { rank: '3e', coins: 500,  pct: 12, color: '#CD7F32' },
    { rank: '4–10', coins: 200, pct: 25, color: '#00FF87' },
    { rank: '11–20%', coins: 100, pct: 13, color: '#3B82F6' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            Ranglijst
            {liveRefreshed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-[#00FF87] font-normal flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Live bijgewerkt
              </motion.span>
            )}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {leaderboard?.total_participants ?? 1247} deelnemers · Top 20% wint coins
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

      {/* Coin rewards */}
      <Card className="p-4">
        <h2 className="font-bold mb-3 text-sm flex items-center gap-2">
          <Coins className="w-4 h-4 text-[#00FF87]" /> Coin beloningen (top 20% wint)
        </h2>
        <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
          {coinRewards.map(({ rank, pct, color }) => (
            <div key={rank} title={`${rank}: ${pct}%`} className="flex items-center justify-center text-xs font-bold text-[#0A0E1A]" style={{ flex: pct, background: color }}>
              {pct >= 15 && rank}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {coinRewards.map(({ rank, coins, color }) => (
            <div key={rank} className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
              <span className="text-gray-400">{rank}: {coins.toLocaleString()} coins</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Top scorers this GW */}
      {topScorers.length > 0 && (
        <Card className="p-4">
          <h2 className="font-bold mb-3 text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#FFD700]" /> Top Scorers
          </h2>
          <div className="space-y-2">
            {topScorers.slice(0, 5).map((s, i) => (
              <div key={s.player_id} className="flex items-center gap-3">
                <span className="text-xs font-black text-gray-500 w-4">{i + 1}</span>
                <div className="w-7 h-7 rounded-full bg-[#1E2A45] overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {s.photo_url
                    ? <img src={s.photo_url} alt={s.player_name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : <span className="text-[9px] font-bold text-gray-400">{s.position}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{s.player_name}</p>
                  <p className="text-[10px] text-gray-500 truncate">{s.club}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {s.goals > 0 && <span className="text-xs font-black">⚽ {s.goals}</span>}
                  {s.assists > 0 && <span className="text-xs text-gray-400">🎯 {s.assists}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

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
            <p className="text-sm text-gray-400">
              {viewMode === 'gameweek' ? `${myEntry.gameweek_points} punten dit GW` : `${myEntry.total_points} seizoenpunten`}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-[#00FF87]">{myEntry.prize > 0 ? `+${myEntry.prize} coins` : '—'}</p>
            <p className="text-xs text-gray-500">seizoenbeloning</p>
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
              <p className="text-xs text-gray-400">{viewMode === 'gameweek' ? entry.gameweek_points : entry.total_points} pt</p>
              <div className={`w-full ${heights[podiumIdx]} rounded-t-lg flex items-start justify-center pt-2`} style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                <span className="text-lg font-black" style={{ color }}>
                  {ranks[podiumIdx] === 1 ? <Crown className="w-6 h-6" style={{ color }} /> : `#${ranks[podiumIdx]}`}
                </span>
              </div>
              <p className="font-bold text-sm" style={{ color }}>{entry.prize > 0 ? `${entry.prize} coins` : ''}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Full table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-[#1E2A45]">
          <h2 className="font-bold">Volledige Ranglijst</h2>
        </div>
        {isError ? (
          <div className="p-4">
            <ErrorState message="Ranglijst laden mislukt" onRetry={() => refetch()} compact />
          </div>
        ) : isLoading ? (
          <div className="divide-y divide-[#1E2A45]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="w-6 h-4 rounded" />
                <Skeleton className="w-9 h-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-24 rounded" />
                  <Skeleton className="h-2.5 w-16 rounded" />
                </div>
                <Skeleton className="w-12 h-8 rounded" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">Nog geen deelnemers</div>
        ) : (
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
                  <p className="font-bold text-sm">{viewMode === 'gameweek' ? entry.gameweek_points : entry.total_points}</p>
                  <p className="text-xs text-gray-500">{viewMode === 'gameweek' ? 'dit GW' : `+${entry.gameweek_points} GW`}</p>
                </div>

                {/* Coin reward */}
                <div className="text-right min-w-[60px]">
                  {entry.prize > 0
                    ? <span className="font-bold text-[#00FF87] text-sm">{entry.prize}c</span>
                    : <span className="text-gray-600 text-sm">—</span>
                  }
                </div>
              </motion.div>
            )
          })}
        </div>
        )}
      </Card>
    </div>
  )
}
