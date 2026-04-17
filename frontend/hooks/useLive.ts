import { useEffect, useCallback } from 'react'
import { showLocalNotification } from './usePushNotifications'
import { useQuery } from '@tanstack/react-query'
import { useLiveStore } from '@/store/liveStore'
import { getSocket } from '@/lib/socket'
import { QUERY_KEYS } from '@/lib/constants'
import api from '@/lib/api'
import { Match, MatchEvent } from '@/types'
import toast from 'react-hot-toast'
import React from 'react'
import { LivePointsToast } from '@/components/ui/LivePointsToast'

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
      const data = args[0] as { total_points: number; delta: number; event?: MatchEvent & { player_name?: string; event_type?: string; photo_url?: string } }
      setLivePoints(data.total_points)
      if (data.delta > 0 && data.event) {
        const ev = data.event
        // Push notification when tab is not visible
        if (document.visibilityState === 'hidden') {
          const label = ev.player_name ?? 'Jouw speler'
          showLocalNotification(
            `+${data.delta} punten!`,
            `${label} heeft gescoord — totaal ${data.total_points} punten`,
            '/dashboard'
          )
        }
        toast.custom(
          React.createElement(LivePointsToast, {
            playerName: ev.player_name ?? 'Speler',
            eventType: ev.event_type ?? 'goal',
            delta: data.delta,
            totalPoints: data.total_points,
            photoUrl: ev.photo_url,
          }),
          {
            duration: 5000,
            style: {
              background: '#111827',
              border: '1px solid #1E2A45',
              borderRadius: '12px',
              padding: '12px 16px',
              color: '#fff',
            },
          }
        )
      }
    })

    socket.on('gameweek:tick', (...args: unknown[]) => {
      const data = args[0] as { gameweek_number: number; ticks_remaining: number; events: Array<{ player_name: string; club: string; event_type: string; minute: number }>; next_tick_at: string }
      window.dispatchEvent(new CustomEvent('sim-tick', { detail: data }))
    })

    socket.on('gameweek:new', (...args: unknown[]) => {
      const data = args[0] as { gameweek_number: number }
      window.dispatchEvent(new CustomEvent('sim-new-gw', { detail: data }))
      toast(`🎮 Speelronde ${data.gameweek_number} is begonnen!`, {
        duration: 6000,
        style: { background: '#111827', border: '1px solid #00FF87', borderRadius: '12px', color: '#fff', fontSize: '14px' },
      })
    })

    socket.on('user:challenge', (...args: unknown[]) => {
      const data = args[0] as { duel_id: string; challenger_username: string; stake: number; message?: string }
      const stakeText = data.stake > 0 ? ` (${data.stake} coins)` : ''
      toast(`⚔️ ${data.challenger_username} daagt je uit!${stakeText}`, {
        duration: 8000,
        style: { background: '#111827', border: '1px solid #3B82F6', borderRadius: '12px', color: '#fff', fontSize: '14px' },
        icon: '⚔️',
      })
      // Refresh pending count badge
      window.dispatchEvent(new CustomEvent('duel:challenge-received'))
    })

    return () => {
      socket.off('match:event')
      socket.off('match:score')
      socket.off('user:points')
      socket.off('gameweek:tick')
      socket.off('gameweek:new')
      socket.off('user:challenge')
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
