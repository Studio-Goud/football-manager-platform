import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Team, Player, TeamPlayer, Formation } from '@/types'
import { teamApi } from '@/lib/api'
import { SEASON_CONFIG } from '@/lib/constants'

interface TeamState {
  team: Team | null
  availablePlayers: Player[]
  selectedFormation: Formation
  isDirty: boolean
  isSaving: boolean
  isLoading: boolean
  error: string | null
  transferHistory: TransferRecord[]

  // Actions
  loadTeam: (seasonId: string) => Promise<void>
  selectPlayer: (player: Player, slot: number) => void
  removePlayer: (playerId: string) => void
  setCaptain: (playerId: string) => void
  setViceCaptain: (playerId: string) => void
  setFormation: (formation: Formation) => void
  swapPlayers: (slotA: number, slotB: number) => void
  saveTeam: () => Promise<void>
  makeTransfer: (outPlayerId: string, inPlayer: Player) => Promise<void>
  clearError: () => void
  resetTeam: () => void
}

export interface TransferRecord {
  id: string
  player_in: string
  player_out: string
  cost: number
  date: string
  gameweek: number
}

const FORMATION_SLOTS: Record<Formation, { position: string; row: number; col: number }[]> = {
  '4-4-2': [
    { position: 'GK', row: 0, col: 0 },
    { position: 'DEF', row: 1, col: 0 }, { position: 'DEF', row: 1, col: 1 },
    { position: 'DEF', row: 1, col: 2 }, { position: 'DEF', row: 1, col: 3 },
    { position: 'MID', row: 2, col: 0 }, { position: 'MID', row: 2, col: 1 },
    { position: 'MID', row: 2, col: 2 }, { position: 'MID', row: 2, col: 3 },
    { position: 'FWD', row: 3, col: 0 }, { position: 'FWD', row: 3, col: 1 },
  ],
  '4-3-3': [
    { position: 'GK', row: 0, col: 0 },
    { position: 'DEF', row: 1, col: 0 }, { position: 'DEF', row: 1, col: 1 },
    { position: 'DEF', row: 1, col: 2 }, { position: 'DEF', row: 1, col: 3 },
    { position: 'MID', row: 2, col: 0 }, { position: 'MID', row: 2, col: 1 }, { position: 'MID', row: 2, col: 2 },
    { position: 'FWD', row: 3, col: 0 }, { position: 'FWD', row: 3, col: 1 }, { position: 'FWD', row: 3, col: 2 },
  ],
  '3-5-2': [
    { position: 'GK', row: 0, col: 0 },
    { position: 'DEF', row: 1, col: 0 }, { position: 'DEF', row: 1, col: 1 }, { position: 'DEF', row: 1, col: 2 },
    { position: 'MID', row: 2, col: 0 }, { position: 'MID', row: 2, col: 1 }, { position: 'MID', row: 2, col: 2 },
    { position: 'MID', row: 2, col: 3 }, { position: 'MID', row: 2, col: 4 },
    { position: 'FWD', row: 3, col: 0 }, { position: 'FWD', row: 3, col: 1 },
  ],
  '4-5-1': [
    { position: 'GK', row: 0, col: 0 },
    { position: 'DEF', row: 1, col: 0 }, { position: 'DEF', row: 1, col: 1 },
    { position: 'DEF', row: 1, col: 2 }, { position: 'DEF', row: 1, col: 3 },
    { position: 'MID', row: 2, col: 0 }, { position: 'MID', row: 2, col: 1 }, { position: 'MID', row: 2, col: 2 },
    { position: 'MID', row: 2, col: 3 }, { position: 'MID', row: 2, col: 4 },
    { position: 'FWD', row: 3, col: 0 },
  ],
  '5-3-2': [
    { position: 'GK', row: 0, col: 0 },
    { position: 'DEF', row: 1, col: 0 }, { position: 'DEF', row: 1, col: 1 }, { position: 'DEF', row: 1, col: 2 },
    { position: 'DEF', row: 1, col: 3 }, { position: 'DEF', row: 1, col: 4 },
    { position: 'MID', row: 2, col: 0 }, { position: 'MID', row: 2, col: 1 }, { position: 'MID', row: 2, col: 2 },
    { position: 'FWD', row: 3, col: 0 }, { position: 'FWD', row: 3, col: 1 },
  ],
  '3-4-3': [
    { position: 'GK', row: 0, col: 0 },
    { position: 'DEF', row: 1, col: 0 }, { position: 'DEF', row: 1, col: 1 }, { position: 'DEF', row: 1, col: 2 },
    { position: 'MID', row: 2, col: 0 }, { position: 'MID', row: 2, col: 1 },
    { position: 'MID', row: 2, col: 2 }, { position: 'MID', row: 2, col: 3 },
    { position: 'FWD', row: 3, col: 0 }, { position: 'FWD', row: 3, col: 1 }, { position: 'FWD', row: 3, col: 2 },
  ],
}

export { FORMATION_SLOTS }

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      team: null,
      availablePlayers: [],
      selectedFormation: '4-4-2',
      isDirty: false,
      isSaving: false,
      isLoading: false,
      error: null,
      transferHistory: [],

      loadTeam: async (seasonId: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await teamApi.getMyTeam(seasonId)
          const team = response.data.data
          set({
            team,
            selectedFormation: team.formation,
            isLoading: false,
            isDirty: false,
          })
        } catch {
          set({ isLoading: false })
          // Use mock data when API isn't available
        }
      },

      selectPlayer: (player: Player, slot: number) => {
        const { team } = get()
        if (!team) return

        const updatedPlayers = [...team.players]
        const existingIndex = updatedPlayers.findIndex((p) => p.slot === slot)

        const newTeamPlayer: TeamPlayer = {
          player_id: player.id,
          player: player,
          position: player.position,
          is_captain: false,
          is_vice_captain: false,
          purchase_price: player.price,
          slot,
          is_benched: slot > 11,
        }

        if (existingIndex > -1) {
          updatedPlayers[existingIndex] = newTeamPlayer
        } else {
          updatedPlayers.push(newTeamPlayer)
        }

        const totalSpent = updatedPlayers.reduce((sum, p) => sum + (p.player?.price || p.purchase_price), 0)

        set({
          team: {
            ...team,
            players: updatedPlayers,
            budget_remaining: SEASON_CONFIG.budget_total - totalSpent,
          },
          isDirty: true,
        })
      },

      removePlayer: (playerId: string) => {
        const { team } = get()
        if (!team) return

        const updatedPlayers = team.players.filter((p) => p.player_id !== playerId)
        const totalSpent = updatedPlayers.reduce((sum, p) => sum + (p.player?.price || p.purchase_price), 0)

        set({
          team: {
            ...team,
            players: updatedPlayers,
            budget_remaining: SEASON_CONFIG.budget_total - totalSpent,
          },
          isDirty: true,
        })
      },

      setCaptain: (playerId: string) => {
        const { team } = get()
        if (!team) return

        const updatedPlayers = team.players.map((p) => ({
          ...p,
          is_captain: p.player_id === playerId,
          is_vice_captain: p.is_vice_captain && p.player_id !== playerId,
        }))

        set({
          team: { ...team, players: updatedPlayers, captain_id: playerId },
          isDirty: true,
        })
      },

      setViceCaptain: (playerId: string) => {
        const { team } = get()
        if (!team) return

        const updatedPlayers = team.players.map((p) => ({
          ...p,
          is_vice_captain: p.player_id === playerId,
          is_captain: p.is_captain && p.player_id !== playerId,
        }))

        set({
          team: { ...team, players: updatedPlayers, vice_captain_id: playerId },
          isDirty: true,
        })
      },

      setFormation: (formation: Formation) => {
        const { team } = get()
        set({
          selectedFormation: formation,
          team: team ? { ...team, formation } : null,
          isDirty: true,
        })
      },

      swapPlayers: (slotA: number, slotB: number) => {
        const { team } = get()
        if (!team) return

        const updatedPlayers = team.players.map((p) => {
          if (p.slot === slotA) return { ...p, slot: slotB, is_benched: slotB > 11 }
          if (p.slot === slotB) return { ...p, slot: slotA, is_benched: slotA > 11 }
          return p
        })

        set({ team: { ...team, players: updatedPlayers }, isDirty: true })
      },

      saveTeam: async () => {
        const { team } = get()
        if (!team) return

        set({ isSaving: true, error: null })
        try {
          if (team.id) {
            await teamApi.updateTeam(team.id, team)
          } else {
            const response = await teamApi.createTeam(team)
            set({ team: response.data.data })
          }
          set({ isSaving: false, isDirty: false })
        } catch (error: unknown) {
          const message =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Team opslaan mislukt'
          set({ isSaving: false, error: message })
          throw error
        }
      },

      makeTransfer: async (outPlayerId: string, inPlayer: Player) => {
        const { team } = get()
        if (!team) return

        set({ isLoading: true, error: null })
        try {
          await teamApi.makeTransfer(team.id, { in: inPlayer.id, out: outPlayerId })

          const updatedPlayers = team.players.map((p) => {
            if (p.player_id === outPlayerId) {
              return {
                ...p,
                player_id: inPlayer.id,
                player: inPlayer,
                purchase_price: inPlayer.price,
              }
            }
            return p
          })

          const record: TransferRecord = {
            id: `tr_${Date.now()}`,
            player_in: inPlayer.name,
            player_out: outPlayerId,
            cost: 0,
            date: new Date().toISOString(),
            gameweek: 38,
          }

          set({
            team: {
              ...team,
              players: updatedPlayers,
              transfers_remaining: team.transfers_remaining - 1,
            },
            transferHistory: [...get().transferHistory, record],
            isLoading: false,
          })
        } catch (error: unknown) {
          const message =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Transfer mislukt'
          set({ isLoading: false, error: message })
          throw error
        }
      },

      clearError: () => set({ error: null }),

      resetTeam: () => set({ team: null, isDirty: false, selectedFormation: '4-4-2' }),
    }),
    {
      name: 'fm_team_draft',
      partialize: (state) => ({
        selectedFormation: state.selectedFormation,
        isDirty: state.isDirty,
      }),
    }
  )
)
