'use client'

import { Match } from '@/types'
import { motion } from 'framer-motion'
import { Clock, Users } from 'lucide-react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

interface MatchCardProps {
  match: Match
  isExpanded?: boolean
  onClick?: () => void
}

const statusConfig = {
  live: { label: 'LIVE', bg: 'bg-[#00FF87]/10', text: 'text-[#00FF87]', dot: 'bg-[#00FF87] animate-pulse' },
  half_time: { label: 'RUST', bg: 'bg-[#F97316]/10', text: 'text-[#F97316]', dot: 'bg-[#F97316]' },
  finished: { label: 'AFGELOPEN', bg: 'bg-gray-700/50', text: 'text-gray-400', dot: 'bg-gray-500' },
  scheduled: { label: 'GEPLAND', bg: 'bg-[#3B82F6]/10', text: 'text-[#3B82F6]', dot: 'bg-[#3B82F6]' },
  postponed: { label: 'UITGESTELD', bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-500' },
  cancelled: { label: 'GEANNULEERD', bg: 'bg-gray-700/50', text: 'text-gray-400', dot: 'bg-gray-500' },
}

export function MatchCard({ match, isExpanded, onClick }: MatchCardProps) {
  const config = statusConfig[match.status]
  const isLive = match.status === 'live' || match.status === 'half_time'
  const kickoffTime = format(new Date(match.kickoff_time), 'HH:mm', { locale: nl })

  return (
    <motion.div
      layout
      onClick={onClick}
      className={`bg-[#0F1629] border rounded-xl overflow-hidden cursor-pointer transition-all ${
        isExpanded ? 'border-[#00FF87]/30' : 'border-[#1E2A45] hover:border-[#00FF87]/20'
      }`}
    >
      <div className="p-4">
        {/* Status + time */}
        <div className="flex items-center justify-between mb-3">
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${config.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            <span className={`text-xs font-bold ${config.text}`}>{config.label}</span>
            {isLive && <span className={`text-xs ${config.text}`}>{match.minute}&apos;</span>}
          </div>
          {!isLive && <span className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />{kickoffTime}</span>}
          {match.my_players_in_match.length > 0 && (
            <span className="text-xs text-[#3B82F6] flex items-center gap-1">
              <Users className="w-3 h-3" />
              {match.my_players_in_match.length} spelers
            </span>
          )}
        </div>

        {/* Score */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-bold text-sm truncate">{match.home_team}</p>
          </div>
          <div className="mx-4 text-center">
            {isLive || match.status === 'finished' ? (
              <span className="text-2xl font-black">
                <span className={match.home_score > match.away_score ? 'text-[#00FF87]' : 'text-white'}>{match.home_score}</span>
                <span className="text-gray-600 mx-1">–</span>
                <span className={match.away_score > match.home_score ? 'text-[#00FF87]' : 'text-white'}>{match.away_score}</span>
              </span>
            ) : (
              <span className="text-gray-500 text-lg font-bold">vs</span>
            )}
          </div>
          <div className="flex-1 text-right">
            <p className="font-bold text-sm truncate">{match.away_team}</p>
          </div>
        </div>

        {/* My points */}
        {match.my_points_from_match > 0 && (
          <div className="mt-3 bg-[#00FF87]/10 rounded-lg px-3 py-1.5 flex items-center justify-between">
            <span className="text-xs text-gray-400">Mijn punten uit deze wedstrijd</span>
            <span className="text-[#00FF87] font-bold">+{match.my_points_from_match}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
