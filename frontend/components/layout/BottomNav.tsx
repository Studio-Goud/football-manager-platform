'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Users, ShoppingCart, Telescope, User, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

const bottomNavItems = [
  { label: 'Home',    href: '/dashboard',    icon: LayoutDashboard },
  { label: 'Team',    href: '/team',         icon: Users },
  { label: 'Scout',  href: '/scout',        icon: Telescope },
  { label: 'Markt',  href: '/marketplace',  icon: ShoppingCart },
  { label: 'Profiel', href: '/profile',     icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuthStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[#0F1629]/95 backdrop-blur-md border-t border-[#1E2A45] safe-area-pb">
      {/* Coins badge bovenaan */}
      {user && (
        <div className="flex justify-center pt-1 pb-0">
          <span className="text-[10px] text-[#00FF87] font-black tracking-wider">
            {Number(user.balance_credits).toLocaleString()} coins
          </span>
        </div>
      )}

      <div className="flex items-center justify-around px-2 py-1">
        {bottomNavItems.map((item) => {
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
                  isActive
                    ? 'bg-[#00FF87]/15'
                    : 'group-active:bg-[#1E2A45]'
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
      </div>
    </nav>
  )
}
