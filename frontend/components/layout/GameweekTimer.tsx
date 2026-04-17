'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface TickEvent {
  gameweek_number: number
  ticks_remaining: number
  events: Array<{ player_name: string; club: string; event_type: string; minute: number }>
  next_tick_at: string
}

const EVENT_EMOJI: Record<string, string> = {
  goal: '⚽',
  assist: '🅰️',
  yellow_card: '🟨',
  clean_sheet: '🧤',
}

export function GameweekTimer() {
  const { isAuthenticated } = useAuthStore()
  const [secondsLeft, setSecondsLeft] = useState(120)
  const [gwNumber, setGwNumber] = useState<number | null>(null)
  const [lastEvents, setLastEvents] = useState<TickEvent['events']>([])
  const [showEvents, setShowEvents] = useState(false)
  const [ticksLeft, setTicksLeft] = useState(5)

  const fetchNextTick = useCallback(async () => {
    try {
      const res = await api.get('/matches/next-tick')
      const nextAt = new Date(res.data.data.next_tick_at).getTime()
      const secs = Math.max(0, Math.round((nextAt - Date.now()) / 1000))
      setSecondsLeft(secs)
    } catch {
      // silently ignore
    }
  }, [])

  const fetchGameweek = useCallback(async () => {
    try {
      const res = await api.get('/matches/current-gameweek')
      setGwNumber(res.data.data?.number ?? null)
    } catch {
      // silently ignore
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchNextTick()
    fetchGameweek()
  }, [isAuthenticated, fetchNextTick, fetchGameweek])

  // Countdown ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          fetchNextTick()
          fetchGameweek()
          return 120
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [fetchNextTick, fetchGameweek])

  // Socket listener voor gameweek events
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'gameweek:tick') {
          setGwNumber(data.gameweek_number)
          setTicksLeft(data.ticks_remaining)
          setLastEvents(data.events ?? [])
          setShowEvents(true)
          fetchNextTick()
          setTimeout(() => setShowEvents(false), 8000)

          if (data.events?.length) {
            const e = data.events[0]
            toast.success(`${EVENT_EMOJI[e.event_type] ?? '⚡'} ${e.player_name} — ${e.event_type} (${e.minute}')`, { duration: 4000 })
          }
        }
        if (data.type === 'gameweek:new') {
          setGwNumber(data.gameweek_number)
          toast.success(`🏁 Speelronde ${data.gameweek_number} gestart!`, { duration: 5000 })
        }
      } catch { /* ignore */ }
    }

    // Also listen via window custom events from socket hook
    window.addEventListener('sim-tick', ((e: CustomEvent) => {
      const data = e.detail as TickEvent
      setGwNumber(data.gameweek_number)
      setTicksLeft(data.ticks_remaining)
      setLastEvents(data.events ?? [])
      setShowEvents(true)
      fetchNextTick()
      setTimeout(() => setShowEvents(false), 8000)
    }) as EventListener)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [fetchNextTick])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const pct = ((120 - secondsLeft) / 120) * 100
  const isUrgent = secondsLeft <= 15

  return (
    <div className="bg-[#0A0E1A] border-b border-[#1E2A45]">
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center gap-3">
        {/* Speelronde badge */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Zap className="w-3.5 h-3.5 text-[#00FF87]" />
          <span className="text-xs text-gray-400">
            {gwNumber ? `GW${gwNumber}` : 'Test'}
          </span>
          <span className="text-xs text-gray-600">·</span>
          <span className="text-xs text-gray-500">{ticksLeft} ticks over</span>
        </div>

        {/* Progress bar */}
        <div className="flex-1 h-1 bg-[#1E2A45] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: isUrgent ? '#EF4444' : '#00FF87' }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>

        {/* Countdown */}
        <div className={`flex-shrink-0 text-xs font-mono font-bold tabular-nums ${isUrgent ? 'text-red-400' : 'text-[#00FF87]'}`}>
          {mins}:{secs.toString().padStart(2, '0')}
        </div>

        <span className="text-xs text-gray-600 flex-shrink-0 hidden sm:block">volgende tick</span>
      </div>

      {/* Live events strip */}
      <AnimatePresence>
        {showEvents && lastEvents.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-[#1E2A45] overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-1.5 flex gap-4 overflow-x-auto">
              {lastEvents.map((e, i) => (
                <div key={i} className="flex items-center gap-1.5 flex-shrink-0 text-xs">
                  <span>{EVENT_EMOJI[e.event_type] ?? '⚡'}</span>
                  <span className="font-semibold text-white">{e.player_name}</span>
                  <span className="text-gray-500">{e.club}</span>
                  <span className="text-gray-600">{e.minute}&apos;</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
