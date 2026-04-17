'use client'

import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trophy, TrendingUp, TrendingDown, Star, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import api from '@/lib/api'

interface RoundReport {
  gameweek: number
  total_points: number
  rank: number
  total_participants: number
  best_player: { name: string; points: number } | null
  worst_player: { name: string; points: number } | null
  captain_bonus: number
  avg_league_score: number
  points_difference: number
}

interface Props {
  onClose: () => void
}

export function RoundReportModal({ onClose }: Props) {
  const { data: report, isLoading } = useQuery({
    queryKey: ['round-report'],
    queryFn: async () => {
      const res = await api.get('/teams/my/round-report')
      return res.data.data as RoundReport | null
    },
  })

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-[#0F1629] border border-[#1E2A45] rounded-2xl p-6 z-50"
      >
        <button onClick={onClose} className="absolute right-4 top-4 p-1.5 rounded-lg hover:bg-[#1E2A45]">
          <X className="w-4 h-4 text-gray-400" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto bg-[#00FF87]/10 rounded-2xl flex items-center justify-center mb-3">
            <Trophy className="w-7 h-7 text-[#00FF87]" />
          </div>
          <h2 className="font-black text-xl">Speelronde Rapport</h2>
          {report && <p className="text-sm text-gray-400 mt-1">Gameweek {report.gameweek}</p>}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : !report ? (
          <p className="text-center text-gray-500 text-sm py-4">Nog geen afgeronde speelronde</p>
        ) : (
          <div className="space-y-3">
            {/* Score + rank */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0A0E1A] rounded-xl p-4 text-center">
                <p className="text-3xl font-black text-[#00FF87]">{report.total_points}</p>
                <p className="text-xs text-gray-500 mt-1">punten</p>
              </div>
              <div className="bg-[#0A0E1A] rounded-xl p-4 text-center">
                <p className="text-3xl font-black text-white">#{report.rank}</p>
                <p className="text-xs text-gray-500 mt-1">van {report.total_participants}</p>
              </div>
            </div>

            {/* vs average */}
            <div className="bg-[#0A0E1A] rounded-xl p-4 flex items-center gap-3">
              {report.points_difference >= 0
                ? <TrendingUp className="w-5 h-5 text-[#00FF87] flex-shrink-0" />
                : <TrendingDown className="w-5 h-5 text-red-400 flex-shrink-0" />
              }
              <div>
                <p className="text-sm font-bold">
                  {report.points_difference >= 0 ? '+' : ''}{report.points_difference} vs gemiddelde
                </p>
                <p className="text-xs text-gray-500">Gemiddeld: {report.avg_league_score} punten</p>
              </div>
            </div>

            {/* Best player */}
            {report.best_player && (
              <div className="bg-[#0A0E1A] rounded-xl p-4 flex items-center gap-3">
                <Star className="w-5 h-5 text-[#FFD700] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Beste speler</p>
                  <p className="text-sm font-bold truncate">{report.best_player.name}</p>
                </div>
                <span className="text-sm font-black text-[#00FF87]">+{report.best_player.points}</span>
              </div>
            )}

            {/* Worst player */}
            {report.worst_player && (
              <div className="bg-[#0A0E1A] rounded-xl p-4 flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Mindere speler</p>
                  <p className="text-sm font-bold truncate">{report.worst_player.name}</p>
                </div>
                <span className="text-sm font-black text-gray-400">{report.worst_player.points}</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 bg-[#00FF87] text-[#0A0E1A] font-black rounded-xl hover:bg-[#00E077] transition-colors mt-2"
            >
              Sluiten
            </button>
          </div>
        )}
      </motion.div>
    </>
  )
}
