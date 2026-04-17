import { useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLiveStore } from '@/store/liveStore'
import { getSocket } from '@/lib/socket'
import { QUERY_KEYS } from '@/lib/constants'
import api from '@/lib/api'
import { Match, MatchEvent } from '@/types'
import toast from 'react-hot-toast'

const EVENT_EMOJI: Record<string, string> = {
  goal: '⚽',
  assist: '🎯',
  yellow_card: '🟨',
  red_card: '🟥',
  clean_sheet: '🧤',
  save: '🧤',
  penalty_save: '🦸',
  own_goal: '😬',
}

export function useLive() {
  const { matches, livePoints, setMatches, addEvent, updateMatchScore, setLivePoints } = useLiveStore()

  const matchesQuery = useQuery({
    queryKey: QUERY_KEYS.liveMatches,
    queryFn: async (): Promise<Match[]> => {
      const res = await api.get('/matches/live')
      return res.data.data
    },
    refetchInterval: 60000,
  })

  useEffect(() => {
    if (matchesQuery.data) setMatches(matchesQuery.data)
  }, [matchesQuery.data, setMatches])

  // WebSocket subscriptions
  useEffect(() => {
    const socket = getSocket()

    socket.on('match:event', (...args: unknown[]) => {
      const event = args[0] as MatchEvent & { match_id: string }
      addEvent(event)
    })

    socket.on('match:score', (...args: unknown[]) => {
      const data = args[0] as { match_id: string; home_score: number; away_score: number; minute: number }
      updateMatchScore(data.match_id, data.home_score, data.away_score, data.minute)
    })

    socket.on('user:points', (...args: unknown[]) => {
      const data = args[0] as { total_points: number; delta: number; event?: MatchEvent & { player_name?: string; event_type?: string } }
      setLivePoints(data.total_points)
      if (data.delta > 0 && data.event) {
        const emoji = EVENT_EMOJI[data.event.event_type ?? ''] ?? '⚽'
        const name = data.event.player_name ?? 'Speler'
        toast.success(`${emoji} ${name} · +${data.delta} punten (totaal: ${data.total_points})`, { duration: 5000 })
      }
    })

    socket.on('gameweek:tick', (...args: unknown[]) => {
      const data = args[0] as { gameweek_number: number; ticks_remaining: number; events: Array<{ player_name: string; club: string; event_type: string; minute: number }>; next_tick_at: string }
      window.dispatchEvent(new CustomEvent('sim-tick', { detail: data }))
    })

    socket.on('gameweek:new', (...args: unknown[]) => {
      const data = args[0] as { gameweek_number: number }
      window.dispatchEvent(new CustomEvent('sim-new-gw', { detail: data }))
    })

    return () => {
      socket.off('match:event')
      socket.off('match:score')
      socket.off('user:points')
      socket.off('gameweek:tick')
      socket.off('gameweek:new')
    }
  }, [addEvent, updateMatchScore, setLivePoints])

  const subscribeToMatch = useCallback((matchId: string) => {
    const socket = getSocket()
    socket.emit('join:match', matchId)
    return () => socket.emit('leave:match', matchId)
  }, [])

  return {
    matches: matchesQuery.data ?? matches,
    livePoints,
    isLoading: matchesQuery.isLoading,
    subscribeToMatch,
  }
}
