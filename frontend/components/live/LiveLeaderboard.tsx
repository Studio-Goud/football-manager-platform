'use client'

import { LeaderboardEntry } from '@/types'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'

interface LiveLeaderboardProps {
  entries: LeaderboardEntry[]
  currentUserId?: string
}

export function LiveLeaderboard({ entries, currentUserId }: LiveLeaderboardProps) {
  return (
    <div className="space-y-1">
      {entries.slice(0, 10).map((entry) => {
        const rankDelta = entry.previous_rank - entry.rank
        const isCurrentUser = entry.is_current_user || entry.user.id === currentUserId

        return (
          <div
            key={entry.rank}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
              isCurrentUser ? 'bg-[#00FF87]/10 border border-[#00FF87]/20' : 'bg-[#0A0E1A] hover:bg-[#0F1629]'
            }`}
          >
            {/* Rank */}
            <span className={`w-6 h-6 flex items-center justify-center text-xs font-black rounded-md flex-shrink-0 ${
              entry.rank === 1 ? 'bg-[#FFD700]/20 text-[#FFD700]' :
              entry.rank === 2 ? 'bg-[#C0C0C0]/20 text-[#C0C0C0]' :
              entry.rank === 3 ? 'bg-[#CD7F32]/20 text-[#CD7F32]' :
              'text-gray-500'
            }`}>
              {entry.rank}
            </span>

            {/* Avatar */}
            <Avatar username={entry.user.username} tier={entry.user.tier} size="sm" />

            {/* Name & points */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${isCurrentUser ? 'text-[#00FF87]' : ''}`}>
                {entry.user.username}
              </p>
              <p className="text-xs text-gray-500">{entry.total_points} pt</p>
            </div>

            {/* Trend */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {rankDelta > 0
                ? <><ArrowUp className="w-3 h-3 text-[#00FF87]" /><span className="text-xs text-[#00FF87]">{rankDelta}</span></>
                : rankDelta < 0
                ? <><ArrowDown className="w-3 h-3 text-red-400" /><span className="text-xs text-red-400">{Math.abs(rankDelta)}</span></>
                : <Minus className="w-3 h-3 text-gray-600" />
              }
            </div>

            {/* Prize */}
            <span className="text-xs font-bold text-[#00FF87] flex-shrink-0">€{entry.prize}</span>
          </div>
        )
      })}
    </div>
  )
}
