'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { PlayerEventToast } from '@/components/notifications/PlayerEventToast'
import { useAuthStore } from '@/store/authStore'

function AutoLogin() {
  const { isAuthenticated, login } = useAuthStore()
  const pathname = usePathname()
  const isAuthPage = pathname === '/login' || pathname === '/register'

  useEffect(() => {
    if (!isAuthenticated && !isAuthPage) {
      login('ricardo@test.nl', 'ricardo@test.nl').then(() => {
        if (typeof window !== 'undefined' && (window.location.pathname === '/' || window.location.pathname === '/login')) {
          window.location.replace('/dashboard')
        }
      }).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AutoLogin />
      {children}
      <PlayerEventToast />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0F1629',
            color: '#fff',
            border: '1px solid #1E2A45',
          },
          success: {
            iconTheme: { primary: '#00FF87', secondary: '#0F1629' },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: '#0F1629' },
          },
        }}
      />
    </QueryClientProvider>
  )
}
