'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Bell, CheckCheck, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn, formatTimeAgo } from '@/lib/utils'
import { getSocket } from '@/lib/socket'
import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'
import api from '@/lib/api'

interface ApiNotif {
  id: number
  type: string
  title: string
  body: string
  read: boolean
  created_at: string
}

interface LiveNotif {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
}

const typeEmoji: Record<string, string> = {
  DEADLINE: '⏰',
  INJURY: '🚑',
  VALUE_CHANGE: '📈',
  DUEL: '⚔️',
  ROUND_RESULT: '🏆',
  SPONSOR: '💰',
  match_event: '⚽',
  trade: '💱',
  system: 'ℹ️',
}

let liveCounter = 0

export function NotificationBell() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [liveNotifs, setLiveNotifs] = useState<LiveNotif[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: apiNotifs = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications')
      return res.data.data as ApiNotif[]
    },
    enabled: !!user,
    refetchInterval: isOpen ? 15000 : 60000,
  })

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: async () => {
      const res = await api.get('/notifications/unread-count')
      return res.data.data.count as number
    },
    enabled: !!user,
    refetchInterval: 30000,
  })

  const markAllMutation = useMutation({
    mutationFn: () => api.post('/notifications/mark-read'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications-unread'] })
      setLiveNotifs(prev => prev.map(n => ({ ...n, read: true })))
    },
  })

  const addLive = useCallback((n: Omit<LiveNotif, 'id' | 'read' | 'created_at'>) => {
    setLiveNotifs(prev => [
      { ...n, id: `live-${++liveCounter}`, read: false, created_at: new Date().toISOString() },
      ...prev.slice(0, 9),
    ])
    qc.invalidateQueries({ queryKey: ['notifications-unread'] })
  }, [qc])

  useEffect(() => {
    if (!user) return
    const socket = getSocket()
    socket.emit('join:user', user.id)

    socket.on('user:points', (...args: unknown[]) => {
      const data = args[0] as { total_points: number; delta: number; event?: { player_name?: string; event_type?: string } }
      if (data.delta > 0) {
        const player = data.event?.player_name ?? 'Speler'
        const type = data.event?.event_type ?? 'goal'
        const label = type === 'goal' ? 'scoort' : type === 'assist' ? 'geeft assist' : 'presteert'
        addLive({ type: 'match_event', title: `+${data.delta} punten`, message: `${player} ${label}! Totaal: ${data.total_points} punten` })
      }
    })

    socket.on('user:challenge', (...args: unknown[]) => {
      const d = args[0] as { challenger_username: string; stake: number }
      addLive({ type: 'DUEL', title: 'Nieuw duel!', message: `${d.challenger_username} daagt je uit (${d.stake} coins)` })
    })

    return () => {
      socket.off('user:points')
      socket.off('user:challenge')
    }
  }, [user, addLive])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const liveUnread = liveNotifs.filter(n => !n.read).length
  const totalUnread = (unreadData ?? 0) + liveUnread

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white hover:bg-[#162040] rounded-xl transition-colors"
      >
        <Bell className="w-5 h-5" />
        {totalUnread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#00FF87] text-[#0A0E1A] text-xs font-bold rounded-full flex items-center justify-center px-1">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-[#0F1629] border border-[#1E2A45] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E2A45]">
              <h3 className="font-bold text-white text-sm">Meldingen</h3>
              {totalUnread > 0 && (
                <button
                  onClick={() => markAllMutation.mutate()}
                  className="flex items-center gap-1 text-xs text-[#00FF87] hover:text-[#00E077] transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Alles gelezen
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {liveNotifs.length === 0 && apiNotifs.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  Geen meldingen
                </div>
              ) : (
                <>
                  {liveNotifs.map(n => (
                    <div
                      key={n.id}
                      onClick={() => setLiveNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                      className={cn('flex gap-3 px-4 py-3 border-b border-[#1E2A45]/50 hover:bg-[#162040] cursor-pointer', !n.read && 'bg-[#00FF87]/5')}
                    >
                      <span className="text-lg flex-shrink-0 mt-0.5">{typeEmoji[n.type] ?? '📢'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-white truncate">{n.title}</p>
                          {!n.read && <span className="w-2 h-2 bg-[#00FF87] rounded-full flex-shrink-0 mt-1.5" />}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-xs text-gray-600 mt-1">{formatTimeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  {apiNotifs.map(n => (
                    <div
                      key={n.id}
                      className={cn('flex gap-3 px-4 py-3 border-b border-[#1E2A45]/50 hover:bg-[#162040]', !n.read && 'bg-[#00FF87]/5')}
                    >
                      <span className="text-lg flex-shrink-0 mt-0.5">{typeEmoji[n.type] ?? '📢'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-white truncate">{n.title}</p>
                          {!n.read && <span className="w-2 h-2 bg-[#00FF87] rounded-full flex-shrink-0 mt-1.5" />}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-xs text-gray-600 mt-1">{formatTimeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="px-4 py-3 border-t border-[#1E2A45]">
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-[#00FF87] transition-colors"
              >
                Alle meldingen bekijken
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
