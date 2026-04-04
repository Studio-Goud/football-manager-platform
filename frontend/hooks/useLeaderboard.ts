import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants'
import api from '@/lib/api'
import { Leaderboard } from '@/types'

export function useLeaderboard(seasonId = 'current') {
  return useQuery({
    queryKey: QUERY_KEYS.leaderboard(seasonId),
    queryFn: async (): Promise<Leaderboard> => {
      const res = await api.get(`/teams/leaderboard?season_id=${seasonId}`)
      return res.data.data
    },
    refetchInterval: 5 * 60 * 1000, // every 5 minutes
  })
}
