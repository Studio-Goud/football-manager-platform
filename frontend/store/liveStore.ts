import { create } from 'zustand'
import { Match, MatchEvent } from '@/types'

interface LiveEventNotification {
  id: string
  event: MatchEvent & { match_id: string }
  timestamp: number
  dismissed: boolean
}

interface LiveState {
  matches: Match[]
  livePoints: number
  pointsDelta: number
  events: Array<MatchEvent & { match_id: string }>
  recentNotifications: LiveEventNotification[]
  myLiveRank: number
  myPreviousRank: number
  isConnected: boolean
  lastUpdated: string | null

  // Actions
  setMatches: (matches: Match[]) => void
  updateFromSocket: (data: {
    type: 'match_update' | 'match_event' | 'points_update' | 'rank_update'
    payload: unknown
  }) => void
  addEvent: (event: MatchEvent & { match_id: string }) => void
  updateMatchScore: (matchId: string, homeScore: number, awayScore: number, minute: number) => void
  setLivePoints: (points: number, delta?: number) => void
  setConnectionStatus: (connected: boolean) => void
  dismissNotification: (notificationId: string) => void
  clearOldNotifications: () => void
  reset: () => void
}

export const useLiveStore = create<LiveState>((set, get) => ({
  matches: [],
  livePoints: 0,
  pointsDelta: 0,
  events: [],
  recentNotifications: [],
  myLiveRank: 0,
  myPreviousRank: 0,
  isConnected: false,
  lastUpdated: null,

  setMatches: (matches: Match[]) => {
    set({ matches, lastUpdated: new Date().toISOString() })
  },

  updateFromSocket: (data) => {
    const { type, payload } = data

    switch (type) {
      case 'match_update': {
        const matchUpdate = payload as Match
        set((state) => ({
          matches: state.matches.map((m) =>
            m.id === matchUpdate.id ? { ...m, ...matchUpdate } : m
          ),
          lastUpdated: new Date().toISOString(),
        }))
        break
      }

      case 'match_event': {
        const event = payload as MatchEvent & { match_id: string }
        get().addEvent(event)

        // Update match events list
        set((state) => ({
          matches: state.matches.map((m) => {
            if (m.id === event.match_id) {
              return {
                ...m,
                events: [...m.events, event],
                my_points_from_match: event.is_my_player
                  ? m.my_points_from_match + event.points_awarded
                  : m.my_points_from_match,
              }
            }
            return m
          }),
        }))
        break
      }

      case 'points_update': {
        const pointsData = payload as { total_points: number; delta: number }
        set({
          livePoints: pointsData.total_points,
          pointsDelta: pointsData.delta,
          lastUpdated: new Date().toISOString(),
        })
        break
      }

      case 'rank_update': {
        const rankData = payload as { rank: number; previous_rank: number }
        set({
          myLiveRank: rankData.rank,
          myPreviousRank: rankData.previous_rank,
        })
        break
      }
    }
  },

  addEvent: (event: MatchEvent & { match_id: string }) => {
    const notification: LiveEventNotification = {
      id: `notif_${Date.now()}_${Math.random()}`,
      event,
      timestamp: Date.now(),
      dismissed: false,
    }

    set((state) => ({
      events: [event, ...state.events].slice(0, 100), // Keep last 100 events
      recentNotifications: [notification, ...state.recentNotifications].slice(0, 20),
    }))

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      set((state) => ({
        recentNotifications: state.recentNotifications.map((n) =>
          n.id === notification.id ? { ...n, dismissed: true } : n
        ),
      }))
    }, 5000)
  },

  updateMatchScore: (matchId: string, homeScore: number, awayScore: number, minute: number) => {
    set((state) => ({
      matches: state.matches.map((m) =>
        m.id === matchId
          ? { ...m, home_score: homeScore, away_score: awayScore, minute }
          : m
      ),
    }))
  },

  setLivePoints: (points: number, delta = 0) => {
    set({ livePoints: points, pointsDelta: delta })
  },

  setConnectionStatus: (connected: boolean) => {
    set({ isConnected: connected })
  },

  dismissNotification: (notificationId: string) => {
    set((state) => ({
      recentNotifications: state.recentNotifications.map((n) =>
        n.id === notificationId ? { ...n, dismissed: true } : n
      ),
    }))
  },

  clearOldNotifications: () => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    set((state) => ({
      recentNotifications: state.recentNotifications.filter(
        (n) => n.timestamp > fiveMinutesAgo && !n.dismissed
      ),
    }))
  },

  reset: () => {
    set({
      matches: [],
      livePoints: 0,
      pointsDelta: 0,
      events: [],
      recentNotifications: [],
      myLiveRank: 0,
      myPreviousRank: 0,
      isConnected: false,
    })
  },
}))
