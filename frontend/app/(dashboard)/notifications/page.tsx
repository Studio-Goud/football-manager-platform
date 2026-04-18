'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Bell, CheckCheck, ExternalLink, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatTimeAgo } from '@/lib/utils'
import Link from 'next/link'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface Notification {
  id: number
  type: string
  title: string
  body: string
  read: boolean
  created_at: string
}

const TYPE_EMOJI: Record<string, string> = {
  DEADLINE:     '⏰',
  INJURY:       '🚑',
  VALUE_CHANGE: '📈',
  DUEL:         '⚔️',
  ROUND_RESULT: '🏆',
  SPONSOR:      '💰',
  PRIZE:        '🎁',
  SYSTEM:       'ℹ️',
}

const TYPE_COLOR: Record<string, string> = {
  DEADLINE:     'bg-orange-500/10 border-orange-500/20',
  INJURY:       'bg-red-500/10 border-red-500/20',
  VALUE_CHANGE: 'bg-green-500/10 border-green-500/20',
  DUEL:         'bg-blue-500/10 border-blue-500/20',
  ROUND_RESULT: 'bg-yellow-500/10 border-yellow-500/20',
  SPONSOR:      'bg-purple-500/10 border-purple-500/20',
  PRIZE:        'bg-yellow-500/10 border-yellow-500/20',
  SYSTEM:       'bg-gray-500/10 border-gray-500/20',
}

export default function NotificationsPage() {
  const qc = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications-page'],
    queryFn: async () => {
      const res = await api.get('/notifications')
      return res.data.data ?? []
    },
  })

  const markAllRead = useMutation({
    mutationFn: () => api.post('/notifications/mark-read'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications-page'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Alles als gelezen gemarkeerd')
    },
  })

  const markOneRead = async (id: number) => {
    await api.post(`/notifications/mark-read/${id}`)
    qc.invalidateQueries({ queryKey: ['notifications-page'] })
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#00FF87]" />
            Notificaties
          </h1>
          {unreadCount > 0 && (
            <p className="text-gray-400 text-sm mt-1">{unreadCount} ongelezen</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-2 px-3 py-2 bg-[#0F1629] border border-[#1E2A45] rounded-xl text-sm text-gray-400 hover:text-white hover:border-[#00FF87] transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Alles gelezen
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card className="p-12 text-center">
          <Bell className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-bold">Geen notificaties</p>
          <p className="text-gray-600 text-sm mt-1">Je bent helemaal bij!</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, i) => {
            const emoji = TYPE_EMOJI[notif.type] ?? '🔔'
            const colorClass = TYPE_COLOR[notif.type] ?? 'bg-gray-500/10 border-gray-500/20'
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`relative flex items-start gap-4 p-4 rounded-xl border transition-all ${
                  notif.read
                    ? 'bg-[#0F1629] border-[#1E2A45] opacity-70'
                    : `${colorClass} shadow-sm`
                }`}
              >
                {/* Unread dot */}
                {!notif.read && (
                  <span className="absolute top-4 right-4 w-2 h-2 bg-[#00FF87] rounded-full" />
                )}

                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-[#0A0E1A] flex items-center justify-center text-xl flex-shrink-0">
                  {emoji}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-6">
                  <p className="font-bold text-sm">{notif.title}</p>
                  <p className="text-gray-400 text-sm mt-0.5 leading-snug">{notif.body}</p>
                  <p className="text-gray-600 text-xs mt-1.5">{formatTimeAgo(notif.created_at)}</p>
                </div>

                {/* Actions */}
                {!notif.read && (
                  <button
                    onClick={() => markOneRead(notif.id)}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[#1E2A45] transition-colors mt-0.5"
                    title="Markeer als gelezen"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-gray-500 hover:text-[#00FF87]" />
                  </button>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {notifications.length > 0 && (
        <p className="text-center text-xs text-gray-600">Laatste 30 notificaties</p>
      )}
    </div>
  )
}
