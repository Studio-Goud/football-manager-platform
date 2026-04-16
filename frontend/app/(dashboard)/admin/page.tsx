'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, Users, Trophy, Zap, RefreshCw, CheckCircle, AlertCircle, Database } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface AdminStats {
  total_users: number
  total_teams: number
  total_players: number
  active_matches: number
  total_transactions: number
  total_coins_in_circulation: number
}

interface AdminUser {
  id: string
  email: string
  username: string
  tier: string
  balance_credits: number
  is_admin: boolean
  is_suspended: boolean
  created_at: string
}

export default function AdminPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'users' | 'data'>('overview')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (user?.role !== 'admin') {
      router.push('/dashboard')
      return
    }
    loadData()
  }, [user, router])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
      ])
      setStats(statsRes.data.data)
      setUsers(usersRes.data.data ?? [])
    } catch {
      toast.error('Laden mislukt')
    } finally {
      setLoading(false)
    }
  }

  const doAction = async (label: string, fn: () => Promise<void>) => {
    setActionLoading(label)
    try {
      await fn()
      toast.success(`${label} uitgevoerd!`)
      loadData()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? `${label} mislukt`)
    } finally {
      setActionLoading(null)
    }
  }

  const syncPlayers = () => doAction('Spelers synchroniseren', async () => {
    const res = await api.post('/admin/sync-players/await')
    const r = res.data?.data
    if (r?.players_synced != null) {
      toast.success(`✅ ${r.players_synced} spelers · ${r.injured_updated} blessures · ${r.api_calls_used} API calls`, { duration: 6000 })
    }
  })

  const createSeason = () => doAction('Seizoen aanmaken', () =>
    api.post('/admin/seasons', { name: `Seizoen ${new Date().getFullYear()}` })
  )

  const giveNewSeasonBonus = () => doAction('Startbonus uitdelen', async () => {
    const res = await api.post('/admin/seasons/new-bonus')
    const r = res.data?.data
    if (r?.users_rewarded != null) {
      toast.success(`✅ ${r.users_rewarded} gebruikers ontvingen 1000 startcoins`, { duration: 5000 })
    }
  })

  const suspendUser = (userId: string, suspend: boolean) => doAction(
    suspend ? 'Gebruiker suspenderen' : 'Gebruiker heractiveren',
    () => api.put(`/admin/users/${userId}/suspend`, { suspended: suspend })
  )

  const giveCoins = async (userId: string, amount: number) => {
    await doAction(`${amount} coins geven`, async () => {
      await api.post(`/admin/users/${userId}/coins`, { amount })
    })
  }

  if (user?.role !== 'admin') return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#00FF87]" />
            Admin Panel
          </h1>
          <p className="text-gray-400 text-sm mt-1">Platform beheer · Alleen voor admins</p>
        </div>
        <Button onClick={loadData} loading={loading} variant="secondary">
          <RefreshCw className="w-4 h-4 mr-2" />
          Vernieuwen
        </Button>
      </div>

      {/* Quick stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Gebruikers', value: stats.total_users, icon: Users, color: '#3B82F6' },
            { label: 'Teams', value: stats.total_teams, icon: Trophy, color: '#FFD700' },
            { label: 'Spelers', value: stats.total_players, icon: Zap, color: '#00FF87' },
            { label: 'Live Wedstrijden', value: stats.active_matches, icon: Database, color: '#EF4444' },
            { label: 'Transacties', value: stats.total_transactions, icon: CheckCircle, color: '#8B5CF6' },
            { label: 'Coins in Omloop', value: stats.total_coins_in_circulation, icon: AlertCircle, color: '#F59E0B' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}20` }}>
                    <s.icon className="w-5 h-5" style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-xl font-black">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(['overview', 'users', 'data'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === t ? 'bg-[#00FF87] text-black' : 'bg-[#162040] text-gray-400 hover:text-white'}`}
          >
            {t === 'overview' ? 'Overzicht' : t === 'users' ? 'Gebruikers' : 'Data'}
          </button>
        ))}
      </div>

      {/* Overview: quick actions */}
      {tab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-5">
            <h2 className="font-bold mb-4">Snelle acties</h2>
            <div className="space-y-3">
              <Button onClick={syncPlayers} loading={actionLoading === 'Spelers synchroniseren'} className="w-full" variant="secondary">
                <RefreshCw className="w-4 h-4 mr-2" />
                Spelers synchroniseren (API)
              </Button>
              <Button onClick={createSeason} loading={actionLoading === 'Seizoen aanmaken'} className="w-full" variant="secondary">
                <Trophy className="w-4 h-4 mr-2" />
                Nieuw seizoen aanmaken
              </Button>
              <Button onClick={giveNewSeasonBonus} loading={actionLoading === 'Startbonus uitdelen'} className="w-full" variant="secondary">
                <Zap className="w-4 h-4 mr-2" />
                Startbonus uitdelen (1000 coins)
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-bold mb-4">Database info</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-[#1E2A45]">
                <span className="text-gray-400">Backend</span>
                <span className="text-[#00FF87]">Online</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1E2A45]">
                <span className="text-gray-400">Database</span>
                <span className="text-[#00FF87]">PostgreSQL</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1E2A45]">
                <span className="text-gray-400">Test account</span>
                <span className="text-white">ricardo@test.nl</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Versie</span>
                <span className="text-white">1.0.0</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-[#1E2A45]">
            <h2 className="font-bold">Gebruikersbeheer ({users.length})</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Laden...</div>
          ) : (
            <div className="divide-y divide-[#1E2A45]">
              {users.slice(0, 20).map(u => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-[#1E2A45] flex items-center justify-center text-sm font-black flex-shrink-0">
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{u.username}</p>
                      {u.is_admin && <span className="text-[10px] font-bold text-[#00FF87] bg-[#00FF87]/10 px-1.5 rounded">admin</span>}
                      {u.is_suspended && <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-1.5 rounded">gesuspendeerd</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{u.email} · {u.balance_credits} coins · {u.tier}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => giveCoins(u.id, 500)}
                      className="text-xs px-2 py-1 bg-[#00FF87]/10 text-[#00FF87] rounded-lg hover:bg-[#00FF87]/20 transition-colors"
                    >
                      +500 🪙
                    </button>
                    <button
                      onClick={() => suspendUser(u.id, !u.is_suspended)}
                      className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                        u.is_suspended
                          ? 'bg-green-400/10 text-green-400 hover:bg-green-400/20'
                          : 'bg-red-400/10 text-red-400 hover:bg-red-400/20'
                      }`}
                    >
                      {u.is_suspended ? 'Heractiveer' : 'Suspend'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Data */}
      {tab === 'data' && (
        <Card className="p-5">
          <h2 className="font-bold mb-4">Data management</h2>
          <div className="bg-[#0A0E1A] rounded-xl p-4 text-sm font-mono text-gray-300 space-y-1.5">
            <p className="text-[#00FF87]"># Spelers</p>
            <p>POST /api/admin/sync-players/await</p>
            <p className="text-[#00FF87] mt-2"># Seizoenen</p>
            <p>GET /api/admin/seasons</p>
            <p>POST /api/admin/seasons</p>
            <p>POST /api/admin/seasons/:id/end</p>
            <p>POST /api/admin/seasons/new-bonus</p>
            <p className="text-[#00FF87] mt-2"># Gebruikers</p>
            <p>GET /api/admin/users</p>
            <p>PUT /api/admin/users/:id/suspend</p>
            <p>POST /api/admin/users/:id/coins</p>
          </div>
        </Card>
      )}
    </div>
  )
}
