'use client'

import { MatchEvent } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'

interface EventFeedProps {
  events: MatchEvent[]
}

const eventConfig: Record<string, { icon: string; label: string; color: string; bgColor: string }> = {
  goal: { icon: '⚽', label: 'Goal!', color: '#00FF87', bgColor: '#00FF8720' },
  assist: { icon: '🎯', label: 'Assist', color: '#3B82F6', bgColor: '#3B82F620' },
  yellow_card: { icon: '🟨', label: 'Gele kaart', color: '#FFD700', bgColor: '#FFD70020' },
  red_card: { icon: '🟥', label: 'Rode kaart', color: '#EF4444', bgColor: '#EF444420' },
  own_goal: { icon: '😬', label: 'Eigen goal', color: '#EF4444', bgColor: '#EF444420' },
  penalty_saved: { icon: '🧤', label: 'Penalty gestopt', color: '#9B59B6', bgColor: '#9B59B620' },
  penalty_missed: { icon: '😰', label: 'Penalty gemist', color: '#F97316', bgColor: '#F9731620' },
  substitution: { icon: '🔄', label: 'Wissel', color: '#6B7280', bgColor: '#6B728020' },
  clean_sheet: { icon: '🛡️', label: 'Clean sheet', color: '#00FF87', bgColor: '#00FF8720' },
}

export function EventFeed({ events }: EventFeedProps) {
  if (events.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8 text-sm">
        Geen events nog — wacht op actie!
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {[...events].reverse().map((event) => {
          const config = eventConfig[event.type] ?? { icon: '📢', label: event.type, color: '#9CA3AF', bgColor: '#9CA3AF20' }
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className={`flex items-center gap-3 rounded-xl p-3 border ${event.is_my_player ? 'border-[#00FF87]/30' : 'border-[#1E2A45]'}`}
              style={{ background: event.is_my_player ? '#00FF8710' : config.bgColor }}
            >
              <span className="text-xl flex-shrink-0">{config.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm" style={{ color: config.color }}>{config.label}</span>
                  <span className="text-xs text-gray-500">{event.minute}&apos;</span>
                  {event.is_my_player && (
                    <span className="text-xs bg-[#00FF87]/20 text-[#00FF87] px-1.5 py-0.5 rounded-full">Mijn speler!</span>
                  )}
                </div>
                <p className="text-sm font-medium truncate">{event.player_name}</p>
                <p className="text-xs text-gray-500">{event.team}</p>
              </div>
              {event.is_my_player && event.points_awarded !== 0 && (
                <div className={`text-right flex-shrink-0 font-black ${event.points_awarded > 0 ? 'text-[#00FF87]' : 'text-red-400'}`}>
                  {event.points_awarded > 0 ? '+' : ''}{event.points_awarded}pt
                </div>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
