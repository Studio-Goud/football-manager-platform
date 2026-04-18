'use client'

import { useEffect } from 'react'
import { getSocket } from '@/lib/socket'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

interface PlayerEvent {
  match_id: string
  player_id: number
  player_name?: string
  event_type: string
  minute: number
  points_awarded: number
  photo_url?: string | null
  team_player?: boolean
}

const EVENT_EMOJIS: Record<string, string> = {
  GOAL:           '⚽',
  ASSIST:         '🎯',
  CLEAN_SHEET:    '🛡️',
  SAVE:           '🧤',
  YELLOW_CARD:    '🟨',
  RED_CARD:       '🟥',
  OWN_GOAL:       '😬',
  PENALTY_SAVED:  '🧤',
  PENALTY_MISSED: '❌',
}

const EVENT_LABELS: Record<string, string> = {
  GOAL:           'Goal gescoord',
  ASSIST:         'Assist gegeven',
  CLEAN_SHEET:    'Clean sheet',
  SAVE:           'Redding',
  YELLOW_CARD:    'Gele kaart',
  RED_CARD:       'Rode kaart',
  OWN_GOAL:       'Eigen doelpunt',
  PENALTY_SAVED:  'Penalty gestopt',
  PENALTY_MISSED: 'Penalty gemist',
}

export function PlayerEventToast() {
  const { user } = useAuthStore()

  useEffect(() => {
    if (!user) return
    const socket = getSocket()

    // Subscribe to user-specific events
    socket.emit('join:user', user.id)

    socket.on('user:points', (...args: unknown[]) => {
      const data = args[0] as { total_points: number; delta: number; event: PlayerEvent }
      const { event, delta } = data
      if (!data || !event) return

      const emoji = EVENT_EMOJIS[event.event_type] ?? '📊'
      const label = EVENT_LABELS[event.event_type] ?? event.event_type
      const name  = event.player_name ?? 'Jouw speler'
      const pts   = delta > 0 ? `+${delta}` : String(delta)

      toast.custom((t) => (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border transition-all duration-300 ${
            t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          } ${
            delta > 0
              ? 'bg-[#0F1629] border-[#00FF87]/30'
              : 'bg-[#0F1629] border-red-500/30'
          }`}
          style={{ minWidth: 260, maxWidth: 320 }}
        >
          {event.photo_url ? (
            <img
              src={event.photo_url}
              alt={name}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-[#1E2A45]"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <span className="text-2xl flex-shrink-0">{emoji}</span>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400">{label} · {event.minute}'</p>
            <p className="font-black text-sm text-white truncate">{name}</p>
          </div>
          <div className={`font-black text-base ${delta > 0 ? 'text-[#00FF87]' : 'text-red-400'}`}>
            {pts} pts
          </div>
        </div>
      ), {
        duration: 4000,
        position: 'top-right',
      })
    })

    return () => {
      socket.off('user:points')
    }
  }, [user])

  return null // Pure side-effect component
}
