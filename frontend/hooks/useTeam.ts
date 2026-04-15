import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/lib/constants'
import api from '@/lib/api'
import { Team, TeamPlayer } from '@/types'
import toast from 'react-hot-toast'

export function useTeam(seasonId?: string) {
  const queryClient = useQueryClient()
  const teamQuery = useQuery({
    queryKey: QUERY_KEYS.team(seasonId ?? 'current'),
    queryFn: async (): Promise<Team> => {
      const res = await api.get('/teams/my')
      return res.data.data
    },
    enabled: true,
  })

  const saveMutation = useMutation({
    mutationFn: async (players: TeamPlayer[]) => {
      const res = await api.put(`/teams/${teamQuery.data?.id}`, { players })
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.team(seasonId ?? 'current') })
      toast.success('Team opgeslagen!')
    },
    onError: () => toast.error('Team opslaan mislukt'),
  })

  const setCaptainMutation = useMutation({
    mutationFn: async ({ teamId, playerId }: { teamId: string; playerId: string }) => {
      const res = await api.post(`/teams/${teamId}/captain`, { player_id: playerId })
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.team(seasonId ?? 'current') })
      toast.success('Aanvoerder gewijzigd!')
    },
  })

  const transferMutation = useMutation({
    mutationFn: async ({ teamId, outPlayerId, inPlayerId }: { teamId: string; outPlayerId: string; inPlayerId: string }) => {
      const res = await api.post(`/teams/${teamId}/transfer`, { out_player_id: outPlayerId, in_player_id: inPlayerId })
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.team(seasonId ?? 'current') })
      toast.success('Transfer voltooid!')
    },
    onError: () => toast.error('Transfer mislukt'),
  })

  return {
    team: teamQuery.data,
    isLoading: teamQuery.isLoading,
    error: teamQuery.error,
    saveTeam: saveMutation.mutate,
    setCaptain: setCaptainMutation.mutate,
    transfer: transferMutation.mutate,
    isSaving: saveMutation.isPending,
  }
}
