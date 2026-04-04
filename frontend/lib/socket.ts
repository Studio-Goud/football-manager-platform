import { io, Socket } from 'socket.io-client'
import { MatchEvent, Match } from '@/types'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000'

export type SocketEventMap = {
  // Match events
  'match:update': (match: Match) => void
  'match:event': (event: MatchEvent & { match_id: string }) => void
  'match:start': (data: { match_id: string; home_team: string; away_team: string }) => void
  'match:end': (data: { match_id: string; final_score: string }) => void
  'match:goal': (data: { match_id: string; player_id: string; player_name: string; team: string; minute: number; score: string; points: number }) => void

  // Live points
  'points:update': (data: { user_id: string; total_points: number; delta: number; player_id: string; event_type: string }) => void
  'leaderboard:update': (data: { rank: number; previous_rank: number; total_points: number }) => void

  // Team events
  'team:saved': (data: { team_id: string; success: boolean }) => void
  'transfer:confirmed': (data: { in_player: string; out_player: string }) => void

  // Wallet
  'wallet:deposit_confirmed': (data: { amount: number; new_balance: number }) => void
  'wallet:withdrawal_processed': (data: { amount: number; new_balance: number }) => void

  // Marketplace
  'marketplace:new_bid': (data: { listing_id: string; amount: number; bidder_username: string }) => void
  'marketplace:listing_sold': (data: { listing_id: string; final_price: number }) => void
  'marketplace:outbid': (data: { listing_id: string; new_bid: number }) => void

  // Notifications
  'notification:new': (data: { id: string; title: string; message: string; type: string }) => void

  // System
  'connect': () => void
  'disconnect': (reason: string) => void
  'connect_error': (error: Error) => void
}

class SocketManager {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map()

  connect(token: string): Socket {
    if (this.socket?.connected) {
      return this.socket
    }

    this.socket = io(WS_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      transports: ['websocket', 'polling'],
    })

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id)
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason: string) => {
      console.log('[Socket] Disconnected:', reason)
    })

    this.socket.on('connect_error', (error: Error) => {
      console.warn('[Socket] Connection error:', error.message)
      this.reconnectAttempts++
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[Socket] Max reconnect attempts reached')
      }
    })

    return this.socket
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.listeners.clear()
    }
  }

  getSocket(): Socket | null {
    return this.socket
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  // Subscribe to a match room for live updates
  joinMatch(matchId: string): void {
    this.socket?.emit('join:match', { match_id: matchId })
  }

  leaveMatch(matchId: string): void {
    this.socket?.emit('leave:match', { match_id: matchId })
  }

  // Subscribe to live point updates for current user
  subscribeToLivePoints(userId: string): void {
    this.socket?.emit('subscribe:live_points', { user_id: userId })
  }

  // Generic event listener with cleanup tracking
  on<K extends keyof SocketEventMap>(event: K, handler: SocketEventMap[K]): () => void {
    if (!this.socket) return () => {}

    const typedHandler = handler as (...args: unknown[]) => void

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(typedHandler)

    this.socket.on(event as string, typedHandler)

    // Return cleanup function
    return () => {
      this.socket?.off(event as string, typedHandler)
      this.listeners.get(event)?.delete(typedHandler)
    }
  }

  off(event: string, handler?: (...args: unknown[]) => void): void {
    if (handler) {
      this.socket?.off(event, handler)
      this.listeners.get(event)?.delete(handler)
    } else {
      this.socket?.off(event)
      this.listeners.delete(event)
    }
  }

  emit(event: string, data?: unknown): void {
    this.socket?.emit(event, data)
  }
}

// Singleton socket manager
export const socketManager = new SocketManager()

// Mock socket for development/testing when no backend is available
export class MockSocketManager {
  private handlers: Map<string, Array<(...args: unknown[]) => void>> = new Map()
  private interval: ReturnType<typeof setInterval> | null = null

  connect(): void {
    console.log('[MockSocket] Connected (mock mode)')
    this.startMockEvents()
  }

  disconnect(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    console.log('[MockSocket] Disconnected')
  }

  private startMockEvents(): void {
    // Simulate live match events every 15-30 seconds
    this.interval = setInterval(() => {
      const mockPlayers = [
        { id: 'p1', name: 'Haaland', team: 'Manchester City' },
        { id: 'p2', name: 'Salah', team: 'Liverpool' },
        { id: 'p3', name: 'Saka', team: 'Arsenal' },
        { id: 'p4', name: 'Rashford', team: 'Manchester United' },
      ]

      const eventTypes = ['goal', 'assist', 'yellow_card'] as const
      const randomPlayer = mockPlayers[Math.floor(Math.random() * mockPlayers.length)]
      const randomEvent = eventTypes[Math.floor(Math.random() * eventTypes.length)]
      const pointsMap = { goal: 6, assist: 3, yellow_card: -1 }

      const mockEvent = {
        match_id: 'match_001',
        player_id: randomPlayer.id,
        player_name: randomPlayer.name,
        team: randomPlayer.team,
        minute: Math.floor(Math.random() * 90) + 1,
        type: randomEvent,
        points: pointsMap[randomEvent],
        score: `${Math.floor(Math.random() * 3)}-${Math.floor(Math.random() * 3)}`,
      }

      this.trigger('match:event', mockEvent)

      if (randomEvent === 'goal') {
        this.trigger('points:update', {
          user_id: 'current_user',
          total_points: 142 + pointsMap[randomEvent],
          delta: pointsMap[randomEvent],
          player_id: randomPlayer.id,
          event_type: randomEvent,
        })
      }
    }, 20000)
  }

  on(event: string, handler: (...args: unknown[]) => void): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event)!.push(handler)
    return () => this.off(event, handler)
  }

  off(event: string, handler: (...args: unknown[]) => void): void {
    const handlers = this.handlers.get(event) || []
    const index = handlers.indexOf(handler)
    if (index > -1) handlers.splice(index, 1)
  }

  private trigger(event: string, data: unknown): void {
    const handlers = this.handlers.get(event) || []
    handlers.forEach((h) => h(data))
  }
}

export const mockSocket = new MockSocketManager()

// Standalone getSocket helper used by useLive hook
// Returns a no-op socket when no backend is available (Netlify/demo mode)
export function getSocket() {
  const noopSocket = {
    on: (_event: string, _handler: (...args: unknown[]) => void) => noopSocket,
    off: (_event: string, _handler?: (...args: unknown[]) => void) => noopSocket,
    emit: (_event: string, ..._args: unknown[]) => noopSocket,
    connected: false,
  }

  if (typeof window === 'undefined') return noopSocket
  if (!process.env.NEXT_PUBLIC_WS_URL) return noopSocket

  // If real socket manager is connected, use it
  const realSocket = socketManager.getSocket()
  if (realSocket) return realSocket as unknown as typeof noopSocket

  return noopSocket
}
