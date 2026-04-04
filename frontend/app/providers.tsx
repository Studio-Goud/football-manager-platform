'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
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
      {children}
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
