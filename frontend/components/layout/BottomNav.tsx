'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, ShoppingCart, Telescope, User, LayoutDashboard, Grid, Trophy, Swords, Globe, Radio, Zap, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

const primaryNav = [
  { label: 'Home',    href: '/dashboard',    icon: LayoutDashboard },
  { label: 'Team',    href: '/team',         icon: Users },
  { label: 'Scout',  href: '/scout',        icon: Telescope },
  { label: 'Markt',  href: '/marketplace',  icon: ShoppingCart },
  { label: 'Profiel', href: '/profile',     icon: User },
]

const moreNav = [
  { label: 'Live',         href: '/live',        icon: Radio },
  { label: 'Ranglijst',    href: '/leaderboard', icon: Trophy },
  { label: 'Duels',        href: '/duels',       icon: Swords },
  { label: 'Competities',  href: '/leagues',     icon: Globe },
  { label: 'Power-ups',    href: '/powerups',    icon: Zap },
]

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const [moreOpen, setMoreOpen] = useState(false)

  const isMoreActive = moreNav.some(item => pathname === item.href || pathname.startsWith(`${item.href}/`))

  const { data: pendingDuels } = useQuery({
    queryKey: ['duels-pending-count'],
    queryFn: async () => {
      const res = await api.get('/duels/pending-count')
      return res.data.data.count as number
    },
    refetchInterval: 60000,
    enabled: !!user,
  })

  return (
    <>
      {/* More drawer */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[#0F1629] border-t border-[#1E2A45] rounded-t-2xl pb-safe"
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <span className="font-black text-sm">Meer</span>
                <button onClick={() => setMoreOpen(false)} className="p-1.5 rounded-lg hover:bg-[#1E2A45]">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2 px-4 pb-6">
                {moreNav.map(item => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  const badge = item.href === '/duels' && pendingDuels ? pendingDuels : 0
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className="flex flex-col items-center gap-1.5 py-3"
                    >
                      <div className="relative">
                        <div className={cn(
                          'w-12 h-12 flex items-center justify-center rounded-2xl transition-all',
                          isActive ? 'bg-[#00FF87]/15' : 'bg-[#1E2A45]'
                        )}>
                          <Icon className={cn('w-5 h-5', isActive ? 'text-[#00FF87]' : 'text-gray-400')} />
                        </div>
                        {badge > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                            {badge}
                          </span>
                        )}
                      </div>
                      <span className={cn('text-[10px] font-semibold text-center leading-tight', isActive ? 'text-[#00FF87]' : 'text-gray-400')}>
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[#0F1629]/95 backdrop-blur-md border-t border-[#1E2A45] safe-area-pb">
        {/* Coins badge */}
        {user && (
          <div className="flex justify-center pt-1 pb-0">
            <span className="text-[10px] text-[#00FF87] font-black tracking-wider">
              {Number(user.balance_credits).toLocaleString()} coins
            </span>
          </div>
        )}

        <div className="flex items-center justify-around px-2 py-1">
          {primaryNav.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center min-w-[60px] py-2 relative group"
              >
                <div className={cn(
                  'flex flex-col items-center gap-0.5 transition-all duration-200',
                  isActive ? 'scale-110' : 'scale-100'
                )}>
                  <div className={cn(
                    'w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-200',
                    isActive ? 'bg-[#00FF87]/15' : 'group-active:bg-[#1E2A45]'
                  )}>
                    <Icon className={cn(
                      'w-5 h-5 transition-colors duration-200',
                      isActive ? 'text-[#00FF87]' : 'text-gray-500'
                    )} />
                  </div>
                  <span className={cn(
                    'text-[10px] font-semibold transition-colors duration-200',
                    isActive ? 'text-[#00FF87]' : 'text-gray-500'
                  )}>
                    {item.label}
                  </span>
                </div>

                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#00FF87] rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
              </Link>
            )
          })}

          {/* Meer button */}
          <button
            onClick={() => setMoreOpen(v => !v)}
            className="flex flex-col items-center justify-center min-w-[60px] py-2 relative group"
          >
            <div className={cn(
              'flex flex-col items-center gap-0.5 transition-all duration-200',
              (moreOpen || isMoreActive) ? 'scale-110' : 'scale-100'
            )}>
              <div className="relative">
                <div className={cn(
                  'w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-200',
                  (moreOpen || isMoreActive) ? 'bg-[#00FF87]/15' : 'group-active:bg-[#1E2A45]'
                )}>
                  <Grid className={cn('w-5 h-5', (moreOpen || isMoreActive) ? 'text-[#00FF87]' : 'text-gray-500')} />
                </div>
                {!!pendingDuels && pendingDuels > 0 && !moreOpen && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0F1629]" />
                )}
              </div>
              <span className={cn(
                'text-[10px] font-semibold',
                (moreOpen || isMoreActive) ? 'text-[#00FF87]' : 'text-gray-500'
              )}>
                Meer
              </span>
            </div>
            {isMoreActive && !moreOpen && (
              <motion.div
                layoutId="bottomNavIndicator"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#00FF87] rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              />
            )}
          </button>
        </div>
      </nav>
    </>
  )
}
