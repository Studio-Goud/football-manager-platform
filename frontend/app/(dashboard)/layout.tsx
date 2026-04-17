'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { BottomNav } from '@/components/layout/BottomNav'
import { LiveScoreBar } from '@/components/layout/LiveScoreBar'
import { GameweekTimer } from '@/components/layout/GameweekTimer'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { OnboardingModal, useOnboarding } from '@/components/onboarding/OnboardingModal'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { show: showOnboarding, complete: completeOnboarding } = useOnboarding()
  usePushNotifications()

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar (drawer) */}
      <div className="lg:hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        <Topbar onMenuToggle={() => setSidebarOpen(true)} />
        <GameweekTimer />
        <LiveScoreBar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
          <PullToRefresh>
            {children}
          </PullToRefresh>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />

      {/* Onboarding */}
      {showOnboarding && <OnboardingModal onComplete={completeOnboarding} />}
    </div>
  )
}
