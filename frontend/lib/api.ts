import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

// Create the main axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Token storage helpers
const TOKEN_KEY = 'fm_access_token'
const REFRESH_TOKEN_KEY = 'fm_refresh_token'

export const tokenStorage = {
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY)
  },
  setToken: (token: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token)
    }
  },
  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  },
  setRefreshToken: (token: string): void => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(REFRESH_TOKEN_KEY, token)
    }
  },
  clearTokens: (): void => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
  },
}

// Track if we're currently refreshing to avoid multiple refresh calls
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: string) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else if (token) {
      resolve(token)
    }
  })
  failedQueue = []
}

// Request interceptor: attach JWT token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401, auto-refresh token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = tokenStorage.getRefreshToken()

      if (!refreshToken) {
        tokenStorage.clearTokens()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }

      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        })

        const { access_token } = response.data.data
        tokenStorage.setToken(access_token)

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`
        }

        processQueue(null, access_token)
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null)
        tokenStorage.clearTokens()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

// ─── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (data: {
    email: string
    password: string
    username: string
    accept_terms: boolean
    age_confirmed: boolean
  }) => api.post('/auth/register', data),

  logout: () => api.post('/auth/logout'),

  refresh: (refresh_token: string) =>
    api.post('/auth/refresh', { refresh_token }),

  getMe: () => api.get('/auth/me'),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
}

// ─── KYC API ──────────────────────────────────────────────────────────────────

export const kycApi = {
  submitPersonalDetails: (data: {
    first_name: string
    last_name: string
    date_of_birth: string
    address: string
    city: string
    postal_code: string
    country: string
    nationality: string
  }) => api.post('/kyc/personal-details', data),

  uploadDocument: (formData: FormData) =>
    api.post('/kyc/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  uploadSelfie: (formData: FormData) =>
    api.post('/kyc/selfie', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getStatus: () => api.get('/kyc/status'),
}

// ─── Team API ─────────────────────────────────────────────────────────────────

export const teamApi = {
  getMyTeam: (seasonId: string) => api.get(`/teams/my/${seasonId}`),
  createTeam: (data: unknown) => api.post('/teams', data),
  updateTeam: (teamId: string, data: unknown) => api.put(`/teams/${teamId}`, data),
  getTransferHistory: (teamId: string) => api.get(`/teams/${teamId}/transfers`),
  makeTransfer: (teamId: string, data: { in: string; out: string }) =>
    api.post(`/teams/${teamId}/transfer`, data),
  setCaptain: (teamId: string, playerId: string) =>
    api.put(`/teams/${teamId}/captain`, { player_id: playerId }),
}

// ─── Players API ──────────────────────────────────────────────────────────────

export const playersApi = {
  getPlayers: (params?: {
    position?: string
    club?: string
    min_price?: number
    max_price?: number
    search?: string
    sort?: string
    page?: number
    per_page?: number
  }) => api.get('/players', { params }),

  getPlayer: (playerId: string) => api.get(`/players/${playerId}`),
  getPlayerStats: (playerId: string) => api.get(`/players/${playerId}/stats`),
  getPlayerPriceHistory: (playerId: string) => api.get(`/players/${playerId}/price-history`),
}

// ─── Matches API ──────────────────────────────────────────────────────────────

export const matchesApi = {
  getLiveMatches: () => api.get('/matches/live'),
  getTodayMatches: () => api.get('/matches/today'),
  getMatch: (matchId: string) => api.get(`/matches/${matchId}`),
  getGameweekMatches: (gameweek: number) => api.get(`/matches/gameweek/${gameweek}`),
}

// ─── Marketplace API ──────────────────────────────────────────────────────────

export const marketplaceApi = {
  getListings: (params?: {
    position?: string
    min_price?: number
    max_price?: number
    listing_type?: string
    search?: string
    sort?: string
    page?: number
  }) => api.get('/marketplace/listings', { params }),

  getListing: (listingId: string) => api.get(`/marketplace/listings/${listingId}`),

  createListing: (data: {
    player_id: string
    price: number
    listing_type: 'fixed' | 'auction'
    duration_hours: number
  }) => api.post('/marketplace/listings', data),

  buyListing: (listingId: string) => api.post(`/marketplace/listings/${listingId}/buy`),

  placeBid: (listingId: string, amount: number) =>
    api.post(`/marketplace/listings/${listingId}/bid`, { amount }),

  cancelListing: (listingId: string) =>
    api.delete(`/marketplace/listings/${listingId}`),

  getMyListings: () => api.get('/marketplace/my-listings'),

  buyPack: (packType: 'basic' | 'premium' | 'elite') =>
    api.post('/marketplace/packs/buy', { pack_type: packType }),
}

// ─── Leaderboard API ──────────────────────────────────────────────────────────

export const leaderboardApi = {
  getSeason: (seasonId: string, page?: number) =>
    api.get(`/leaderboard/season/${seasonId}`, { params: { page } }),

  getGameweek: (seasonId: string, gameweek: number) =>
    api.get(`/leaderboard/season/${seasonId}/gameweek/${gameweek}`),

  getMyRank: (seasonId: string) =>
    api.get(`/leaderboard/season/${seasonId}/my-rank`),
}

// ─── Wallet API ───────────────────────────────────────────────────────────────

export const walletApi = {
  getBalance: () => api.get('/wallet/balance'),

  getTransactions: (params?: { type?: string; page?: number; per_page?: number }) =>
    api.get('/wallet/transactions', { params }),

  initiateDeposit: (amount: number, payment_method: string) =>
    api.post('/wallet/deposit', { amount, payment_method }),

  initiateWithdrawal: (amount: number, bank_account: string) =>
    api.post('/wallet/withdrawal', { amount, bank_account }),

  getPaymentMethods: () => api.get('/wallet/payment-methods'),

  addPaymentMethod: (data: unknown) => api.post('/wallet/payment-methods', data),

  removePaymentMethod: (methodId: string) =>
    api.delete(`/wallet/payment-methods/${methodId}`),
}

// ─── Power-ups API ────────────────────────────────────────────────────────────

export const powerupsApi = {
  getMyPowerups: () => api.get('/powerups/my'),
  buyPowerup: (type: string) => api.post('/powerups/buy', { type }),
  activatePowerup: (powerupId: string, data?: unknown) =>
    api.post(`/powerups/${powerupId}/activate`, data),
}

// ─── Notifications API ────────────────────────────────────────────────────────

export const notificationsApi = {
  getNotifications: () => api.get('/notifications'),
  markRead: (notificationId: string) =>
    api.put(`/notifications/${notificationId}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
}

// ─── Admin API ────────────────────────────────────────────────────────────────

export const adminApi = {
  getPlatformStats: () => api.get('/admin/stats'),
  getUsers: (params?: { search?: string; page?: number }) =>
    api.get('/admin/users', { params }),
  getUserDetails: (userId: string) => api.get(`/admin/users/${userId}`),
  suspendUser: (userId: string, reason: string) =>
    api.post(`/admin/users/${userId}/suspend`, { reason }),
  unsuspendUser: (userId: string) => api.post(`/admin/users/${userId}/unsuspend`),
  createSeason: (data: unknown) => api.post('/admin/seasons', data),
  updateSeason: (seasonId: string, data: unknown) =>
    api.put(`/admin/seasons/${seasonId}`, data),
  getPendingPayouts: () => api.get('/admin/payouts/pending'),
  approvePayout: (payoutId: string) => api.post(`/admin/payouts/${payoutId}/approve`),
  correctMatchEvent: (matchId: string, data: unknown) =>
    api.put(`/admin/matches/${matchId}/events`, data),
  syncPlayers: () => api.post('/admin/players/sync'),
  getRevenueData: (period: string) => api.get('/admin/revenue', { params: { period } }),
}

// ─── Responsible Gaming API ───────────────────────────────────────────────────

export const responsibleGamingApi = {
  getSettings: () => api.get('/responsible-gaming/settings'),
  setDepositLimit: (limit: number, period: 'daily' | 'weekly' | 'monthly') =>
    api.post('/responsible-gaming/deposit-limit', { limit, period }),
  setSessionLimit: (minutes: number) =>
    api.post('/responsible-gaming/session-limit', { minutes }),
  selfExclude: (period_days: number) =>
    api.post('/responsible-gaming/self-exclude', { period_days }),
}

export default api
