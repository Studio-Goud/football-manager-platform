'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Trophy, ArrowLeft, Crown, Shield, Swords, Target, Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import api from '@/lib/api'
import Link from 'next/link'

interface LeaderboardEntry {
  rank: number
  user_id: string
  username: string
  tier: string
  team_name: string
  tactic: string
  total_points: number
  is_you: boolean
}

const TACTIC_ICONS: Record<string, string> = {
  BALANCED:      '⚖️',
  HIGH_PRESS:    '🔥',
  LOW_BLOCK:     '🛡️',
  TIKI_TAKA:     '🎯',
  COUNTER_ATTACK:'⚡',
  LONG_BALL:     '🎪',
}

const TIER_COLORS: Record<string, string> = {
  bronze: 'text-[#CD7F32]',
  silver: 'text-[#C0C0C0]',
  gold:   'text-[#FFD700]',
  elite:  'text-[#00FF87]',
}

export default function LeagueLeaderboardPage() {
  const params = useParams()
  const router = useRouter()
  const [leagueName, setLeagueName] = useState('')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!params.id) return
    api.get(`/leagues/${params.id}/leaderboard`)
      .then((res: { data: { data: { league_name: string; leaderboard: LeaderboardEntry[] } } }) => {
        setLeagueName(res.data.data.league_name)
        setEntries(res.data.data.leaderboard)
      })
      .catch(() => router.push('/leagues'))
      .finally(() => setLoading(false))
  }, [params.id, router])

  const myEntry = entries.find(e => e.is_you)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/leagues" className="p-2 rounded-xl bg-[#162040] hover:bg-[#1E2A45] transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#FFD700]" />
            {leagueName || 'Ranglijst'}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">{entries.length} deelnemers · Totale punten</p>
        </div>
      </div>

      {/* My position banner */}
      {myEntry && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#00FF87]/10 border border-[#00FF87]/30 rounded-2xl p-4 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-[#00FF87]/20 flex items-center justify-center">
            <span className="text-[#00FF87] font-black text-xl">#{myEntry.rank}</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-white">Jouw positie</p>
            <p className="text-sm text-gray-400">{myEntry.team_name} · {myEntry.total_points} punten</p>
          </div>
          <span className="text-2xl">{TACTIC_ICONS[myEntry.tactic] ?? '⚽'}</span>
        </motion.div>
      )}

      {/* Leaderboard */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="space-y-px">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="bg-[#0F1629] px-4 py-4 animate-pulse flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1E2A45]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-[#1E2A45] rounded w-32" />
                  <div className="h-2.5 bg-[#1E2A45] rounded w-20" />
                </div>
                <div className="h-4 bg-[#1E2A45] rounded w-16" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nog geen deelnemers met een team</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1E2A45]">
            {entries.map((entry, i) => (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-center gap-3 px-4 py-3.5 ${entry.is_you ? 'bg-[#00FF87]/5' : 'hover:bg-[#162040]'} transition-colors`}
              >
                {/* Rank */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0 ${
                  entry.rank === 1 ? 'bg-[#FFD700]/20 text-[#FFD700]' :
                  entry.rank === 2 ? 'bg-[#C0C0C0]/20 text-[#C0C0C0]' :
                  entry.rank === 3 ? 'bg-[#CD7F32]/20 text-[#CD7F32]' :
                  'bg-[#1E2A45] text-gray-400'
                }`}>
                  {entry.rank <= 3
                    ? entry.rank === 1 ? <Crown className="w-4 h-4" /> : entry.rank === 2 ? <Shield className="w-4 h-4" /> : <Target className="w-4 h-4" />
                    : entry.rank
                  }
                </div>

                {/* Tactic icon */}
                <span className="text-xl flex-shrink-0">{TACTIC_ICONS[entry.tactic] ?? '⚽'}</span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-sm truncate">{entry.username}</p>
                    {entry.is_you && <span className="text-[10px] font-black text-[#00FF87] bg-[#00FF87]/10 px-1.5 rounded">jij</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{entry.team_name}</p>
                </div>

                {/* Points */}
                <div className="text-right flex-shrink-0">
                  <p className={`font-black text-base ${entry.rank === 1 ? 'text-[#FFD700]' : entry.is_you ? 'text-[#00FF87]' : 'text-white'}`}>
                    {entry.total_points}
                  </p>
                  <p className="text-[10px] text-gray-500">punten</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* Tactic legend */}
      <Card className="p-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Tactiek legenda</p>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(TACTIC_ICONS).map(([key, icon]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-gray-400">
              <span>{icon}</span>
              <span className="truncate">{
                key === 'BALANCED' ? 'Gebalanceerd' :
                key === 'HIGH_PRESS' ? 'Hoog Druk' :
                key === 'LOW_BLOCK' ? 'Laag Blok' :
                key === 'TIKI_TAKA' ? 'Tiki-Taka' :
                key === 'COUNTER_ATTACK' ? 'Counter' : 'Lange Bal'
              }</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
