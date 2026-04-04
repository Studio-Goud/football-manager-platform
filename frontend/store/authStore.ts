import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, AuthTokens } from '@/types'
import { tokenStorage } from '@/lib/api'
import { authApi } from '@/lib/api'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (data: {
    email: string
    password: string
    username: string
    accept_terms: boolean
    age_confirmed: boolean
  }) => Promise<void>
  refreshUser: () => Promise<void>
  updateBalance: (newBalance: number) => void
  updateUser: (data: Partial<User>) => void
  setUser: (user: User, tokens: AuthTokens) => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authApi.login(email, password)
          const { user, access_token, refresh_token, expires_in } = response.data.data

          tokenStorage.setToken(access_token)
          tokenStorage.setRefreshToken(refresh_token)

          set({
            user,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (error: unknown) {
          const message =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Inloggen mislukt. Controleer je gegevens.'
          set({ isLoading: false, error: message, isAuthenticated: false })
          throw error
        }
      },

      logout: async () => {
        try {
          await authApi.logout()
        } catch {
          // Ignore logout API errors
        } finally {
          tokenStorage.clearTokens()
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
          })
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null })
        try {
          const response = await authApi.register(data)
          const { user, access_token, refresh_token } = response.data.data

          tokenStorage.setToken(access_token)
          tokenStorage.setRefreshToken(refresh_token)

          set({
            user,
            token: access_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (error: unknown) {
          const message =
            (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Registratie mislukt. Probeer het opnieuw.'
          set({ isLoading: false, error: message })
          throw error
        }
      },

      refreshUser: async () => {
        const { isAuthenticated } = get()
        if (!isAuthenticated) return

        try {
          const response = await authApi.getMe()
          set({ user: response.data.data })
        } catch {
          // If refresh fails, log out
          tokenStorage.clearTokens()
          set({ user: null, token: null, isAuthenticated: false })
        }
      },

      updateBalance: (newBalance: number) => {
        const { user } = get()
        if (user) {
          set({ user: { ...user, balance_credits: newBalance } })
        }
      },

      updateUser: (data: Partial<User>) => {
        const { user } = get()
        if (user) {
          set({ user: { ...user, ...data } })
        }
      },

      setUser: (user: User, tokens: AuthTokens) => {
        tokenStorage.setToken(tokens.access_token)
        tokenStorage.setRefreshToken(tokens.refresh_token)
        set({
          user,
          token: tokens.access_token,
          isAuthenticated: true,
        })
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'fm_auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
