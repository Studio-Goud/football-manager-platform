import { useAuthStore } from '@/store/authStore'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useAuth(requireAuth = true) {
  const { user, isAuthenticated, isLoading, logout, refreshUser } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (requireAuth && !isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, requireAuth, router])

  useEffect(() => {
    if (isAuthenticated) {
      refreshUser()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { user, isAuthenticated, isLoading, logout }
}

export function useRequireAdmin() {
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated && user?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [user, isAuthenticated, router])

  return { user, isAdmin: user?.role === 'admin' }
}
