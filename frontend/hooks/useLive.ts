import { useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLiveStore } from '@/store/liveStore'
import { getSocket } from '@/lib/socket'
import { QUERY_KEYS } from '@/lib/constants'
import api from '@/lib/api'
import { Match, MatchEvent } from '@/types'

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

    socket.on('match:event', (event: MatchEvent & { match_id: string }) => {
      addEvent(event.match_id, event)
    })

    socket.on('match:score', (data: { match_id: string; home_score: number; away_score: number; minute: number }) => {
      updateMatchScore(data.match_id, data.home_score, data.away_score, data.minute)
    })

    socket.on('user:points', (data: { total_points: number; delta: number; event: MatchEvent }) => {
      setLivePoints(data.total_points)
    })

    return () => {
      socket.off('match:event')
      socket.off('match:score')
      socket.off('user:points')
    }
  }, [addEvent, updateScore, setLivePoints])

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
