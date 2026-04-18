'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Radio,
  Trophy,
  Zap,
  User,
  Shield,
  X,
  Swords,
  Globe,
  Telescope,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { TierBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { formatCredits } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Mijn Team', href: '/team', icon: Users },
  { label: 'Scout', href: '/scout', icon: Telescope },
  { label: 'Transfermarkt', href: '/marketplace', icon: ShoppingCart },
  { label: 'Live Wedstrijden', href: '/live', icon: Radio },
  { label: 'Ranglijst', href: '/leaderboard', icon: Trophy },
  { label: 'Duels', href: '/duels', icon: Swords, badge: 1 },
  { label: 'Competities', href: '/leagues', icon: Globe },
  { label: 'Power-ups', href: '/powerups', icon: Zap },
  { label: 'Meldingen', href: '/notifications', icon: Bell },
  { label: 'Profiel', href: '/profile', icon: User },
  { label: 'Admin', href: '/admin', icon: Shield, adminOnly: true },
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen = false, onClose = () => {} }: SidebarProps) {
  const pathname = usePathname()
  const { user, isAuthenticated } = useAuthStore()

  const { data: gameweek } = useQuery({
    queryKey: ['sidebar-gameweek'],
    queryFn: async () => {
      const res = await api.get('/matches/current-gameweek')
      return res.data.data as { number: number; deadline: string; season_name?: string }
    },
    enabled: isAuthenticated,
    staleTime: 300000,
  })

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || user?.role === 'admin'
  )

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-[#0F1629] border-r border-[#1E2A45] z-50',
          'flex flex-col',
          'transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-6 border-b border-[#1E2A45]">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
            <div className="w-8 h-8 bg-[#00FF87] rounded-lg flex items-center justify-center">
              <Swords className="w-5 h-5 text-[#0A0E1A]" />
            </div>
            <div>
              <span className="text-white font-black text-base tracking-tight">Football</span>
              <span className="text-[#00FF87] font-black text-base tracking-tight">Manager</span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-gray-400 hover:text-white hover:bg-[#162040] rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User summary */}
        {user && (
          <Link
            href="/profile"
            onClick={onClose}
            className="flex items-center gap-3 mx-4 mt-4 p-3 bg-[#162040] rounded-xl hover:bg-[#1E2A45] transition-colors"
          >
            <Avatar
              src={user.avatar_url}
              alt={user.username}
              size="sm"
              tier={user.tier}
              fallback={user.username}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.username}</p>
              <p className="text-xs text-[#00FF87] font-medium">
                {formatCredits(user.balance_credits)} cr.
              </p>
            </div>
            <TierBadge tier={user.tier} size="sm" />
          </Link>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                  isActive
                    ? 'bg-[#00FF87]/10 text-[#00FF87] border border-[#00FF87]/20'
                    : 'text-gray-400 hover:text-white hover:bg-[#162040]'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 flex-shrink-0 transition-colors',
                    isActive ? 'text-[#00FF87]' : 'text-gray-500 group-hover:text-gray-300'
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 bg-[#00FF87] text-[#0A0E1A] text-xs font-bold rounded-full">
                    {item.badge}
                  </span>
                )}
                {item.label === 'Live Wedstrijden' && (
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
                {isActive && (
                  <motion.div layoutId="activeIndicator" className="w-1.5 h-1.5 bg-[#00FF87] rounded-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom info */}
        <div className="p-4 border-t border-[#1E2A45]">
          <div className="bg-[#162040] rounded-xl p-3 text-xs text-gray-500">
            {gameweek ? (
              <>
                <p className="font-medium text-gray-400 mb-1">{gameweek.season_name ?? 'Seizoen'}</p>
                <p>Speelronde {gameweek.number}</p>
                <p className={`mt-1 ${new Date(gameweek.deadline) < new Date() ? 'text-orange-400' : 'text-[#00FF87]'}`}>
                  Deadline: {new Date(gameweek.deadline).toLocaleString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-gray-400 mb-1">Geen actief seizoen</p>
                <p className="text-gray-600">Wacht op data...</p>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
