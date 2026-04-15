'use client'

import { useState, useEffect } from 'react'
import { Menu, Coins, Clock, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { Avatar } from '@/components/ui/Avatar'
import { formatCredits } from '@/lib/utils'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

interface TopbarProps {
  onMenuToggle?: () => void
}

function SeasonCountdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    // Deadline: next Friday at 18:00
    const getNextDeadline = () => {
      const now = new Date()
      const nextFriday = new Date(now)
      const dayOfWeek = now.getDay() // 0=Sun, 5=Fri
      const daysToFriday = ((5 - dayOfWeek + 7) % 7) || 7
      nextFriday.setDate(now.getDate() + daysToFriday)
      nextFriday.setHours(18, 0, 0, 0)
      return nextFriday
    }

    const calculateTimeLeft = () => {
      const deadline = getNextDeadline()
      const diff = deadline.getTime() - new Date().getTime()

      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      }
    }

    setTimeLeft(calculateTimeLeft())
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 2

  return (
    <div
      className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium ${
        isUrgent
          ? 'bg-red-500/20 border border-red-500/30 text-red-400'
          : 'bg-[#162040] border border-[#1E2A45] text-gray-400'
      }`}
    >
      <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'animate-pulse' : ''}`} />
      <span className="font-bold text-white">
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')}
      </span>
      <span>deadline</span>
    </div>
  )
}

export function Topbar({ onMenuToggle }: TopbarProps) {
  const { user, logout } = useAuthStore()
  const [profileOpen, setProfileOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-30 bg-[#0F1629]/95 backdrop-blur-md border-b border-[#1E2A45] px-4 lg:px-6 h-16 flex items-center gap-4">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-[#162040] rounded-xl transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Season countdown */}
        <SeasonCountdown />

        {/* Credits balance */}
        {user && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#162040] border border-[#1E2A45] rounded-xl">
            <Coins className="w-4 h-4 text-[#00FF87]" />
            <span className="text-sm font-bold text-white">
              {formatCredits(user.balance_credits)}
            </span>
            <span className="text-xs text-gray-500">cr.</span>
          </div>
        )}

        {/* Notification bell */}
        <NotificationBell />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-[#162040] transition-colors"
          >
            {user && (
              <Avatar
                src={user.avatar_url}
                alt={user.username}
                size="sm"
                tier={user.tier}
                fallback={user.username}
              />
            )}
          </button>

          <AnimatePresence>
            {profileOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-56 bg-[#0F1629] border border-[#1E2A45] rounded-2xl shadow-xl z-50 overflow-hidden"
                >
                  {user && (
                    <div className="px-4 py-3 border-b border-[#1E2A45]">
                      <p className="text-sm font-bold text-white">{user.username}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  )}
                  <div className="p-2">
                    <Link
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-[#162040] rounded-xl transition-colors"
                    >
                      Profiel
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-[#162040] rounded-xl transition-colors"
                    >
                      Coins kopen
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Uitloggen
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
