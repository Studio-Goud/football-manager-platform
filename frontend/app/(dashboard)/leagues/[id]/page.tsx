'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Crown, Trophy, LogOut } from 'lucide-react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { TierBadge } from '@/components/ui/Badge'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { UserTier } from '@/types'

interface LeaderboardEntry {
  rank: number
  user_id: string
  username: string
  tier: UserTier
  team_name: string
  total_points: number
  is_you: boolean
}

export default function LeagueDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['league-leaderboard', id],
    queryFn: async () => {
      const res = await api.get(`/leagues/${id}/leaderboard`)
      return res.data.data as { league_name: string; leaderboard: LeaderboardEntry[] }
    },
    enabled: !!id,
  })

  const leaveMutation = useMutation({
    mutationFn: () => api.delete(`/leagues/${id}/leave`),
    onSuccess: () => {
      toast.success('Competitie verlaten')
      qc.invalidateQueries({ queryKey: ['private-leagues'] })
      window.location.href = '/leagues'
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Verlaten mislukt')
    },
  })

  const entries = data?.leaderboard ?? []
  const myEntry = entries.find(e => e.is_you || e.user_id === user?.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/leagues" className="p-2 rounded-xl border border-[#1E2A45] hover:border-[#00FF87]/30 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black">
              {isLoading ? <Skeleton className="w-48 h-7 rounded" /> : (data?.league_name ?? 'Competitie')}
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">Privé ranglijst</p>
          </div>
        </div>
        <button
          onClick={() => leaveMutation.mutate()}
          disabled={leaveMutation.isPending}
          className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Verlaten</span>
        </button>
      </div>

      {myEntry && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#00FF87]/10 border border-[#00FF87]/30 rounded-xl p-4 flex items-center gap-4"
        >
          <span className="text-2xl font-black text-[#00FF87]">#{myEntry.rank}</span>
          <div className="flex-1">
            <p className="font-bold">Jouw positie</p>
            <p className="text-sm text-gray-400">{myEntry.team_name} · {myEntry.total_points} punten</p>
          </div>
          <Trophy className="w-6 h-6 text-[#00FF87]" />
        </motion.div>
      )}

      {/* Points comparison bars */}
      {entries.length > 0 && (
        <Card className="p-5">
          <h2 className="font-bold mb-4">Punten vergelijking</h2>
          <div className="space-y-2">
            {entries.map(entry => {
              const max = entries[0]?.total_points || 1
              const pct = Math.max(4, (entry.total_points / max) * 100)
              const isMe = entry.is_you || entry.user_id === user?.id
              return (
                <div key={entry.user_id} className="flex items-center gap-3">
                  <span className={`text-xs w-20 truncate flex-shrink-0 ${isMe ? 'text-[#00FF87] font-bold' : 'text-gray-400'}`}>
                    {entry.username}
                  </span>
                  <div className="flex-1 h-3 bg-[#1E2A45] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: isMe ? '#00FF87' : '#3B82F6' }}
                    />
                  </div>
                  <span className={`text-xs w-12 text-right flex-shrink-0 font-bold ${isMe ? 'text-[#00FF87]' : 'text-gray-300'}`}>
                    {entry.total_points}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-[#1E2A45] flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#FFD700]" />
          <h2 className="font-bold">Ranglijst</h2>
          <span className="text-xs text-gray-500 ml-auto">{entries.length} deelnemers</span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-[#1E2A45]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <Skeleton className="w-9 h-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-28 rounded" />
                  <Skeleton className="h-2.5 w-20 rounded" />
                </div>
                <Skeleton className="w-14 h-6 rounded" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">Nog geen scores</div>
        ) : (
          <div className="divide-y divide-[#1E2A45]">
            {entries.map((entry, i) => {
              const isMe = entry.is_you || entry.user_id === user?.id
              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.04, 0.4) }}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${isMe ? 'bg-[#00FF87]/5' : 'hover:bg-[#0F1629]'}`}
                >
                  <span className={`w-8 h-8 flex items-center justify-center text-sm font-bold rounded-lg flex-shrink-0 ${
                    entry.rank === 1 ? 'bg-[#FFD700]/20 text-[#FFD700]' :
                    entry.rank === 2 ? 'bg-[#C0C0C0]/20 text-[#C0C0C0]' :
                    entry.rank === 3 ? 'bg-[#CD7F32]/20 text-[#CD7F32]' :
                    'text-gray-500'
                  }`}>
                    {entry.rank === 1 ? <Crown className="w-4 h-4 text-[#FFD700]" /> : entry.rank}
                  </span>

                  <Avatar fallback={entry.username} size="sm" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-sm truncate ${isMe ? 'text-[#00FF87]' : ''}`}>
                        {entry.username}{isMe ? ' (jij)' : ''}
                      </span>
                      <TierBadge tier={entry.tier} size="sm" />
                    </div>
                    <span className="text-xs text-gray-500 truncate">{entry.team_name}</span>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-sm">{entry.total_points}</p>
                    <p className="text-xs text-gray-500">punten</p>
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
