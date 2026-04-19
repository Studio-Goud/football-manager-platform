'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Shield, Users, Trophy, Zap, RefreshCw, CheckCircle, AlertCircle, Database, Calendar, Play, Square, Target, Edit3 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'

interface AdminStats {
  total_users: number
  total_teams: number
  total_players: number
  active_matches: number
  total_transactions: number
  total_coins_in_circulation: number
  total_achievements_earned: number
  total_private_leagues: number
  active_season: string | null
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
  const [tab, setTab] = useState<'overview' | 'users' | 'seasons' | 'gameweeks' | 'matches' | 'data'>('overview')
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

  const seedDemo = () => doAction('Demo seed', async () => {
    const res = await api.post('/admin/seed-demo')
    const r = res.data?.data
    if (r?.players != null) {
      toast.success(`✅ ${r.players} spelers gezaaid`, { duration: 4000 })
    }
  })

  const seedAchievements = () => doAction('Achievements zaai', async () => {
    const res = await api.post('/admin/seed-achievements')
    toast.success(`✅ ${res.data?.data?.count ?? 0} achievements aangemaakt`, { duration: 4000 })
  })

  const invalidateCache = () => doAction('Cache legen', async () => {
    await api.post('/admin/invalidate-cache')
    toast.success('✅ Wedstrijd cache geleegd — KNVB Beker & live scores verversen direct', { duration: 5000 })
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
            { label: 'Badges verdiend', value: stats.total_achievements_earned, icon: CheckCircle, color: '#EC4899' },
            { label: 'Privé Competities', value: stats.total_private_leagues, icon: Trophy, color: '#14B8A6' },
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
      <div className="flex gap-2 flex-wrap">
        {(['overview', 'users', 'seasons', 'gameweeks', 'matches', 'data'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === t ? 'bg-[#00FF87] text-black' : 'bg-[#162040] text-gray-400 hover:text-white'}`}
          >
            {t === 'overview' ? 'Overzicht' : t === 'users' ? 'Gebruikers' : t === 'seasons' ? 'Seizoenen' : t === 'gameweeks' ? 'Speelrondes' : t === 'matches' ? 'Wedstrijden' : 'Data'}
          </button>
        ))}
      </div>

      {/* Overview: quick actions */}
      {tab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-5">
            <h2 className="font-bold mb-3">⚡ Live data</h2>
            <div className="space-y-3">
              <Button onClick={invalidateCache} loading={actionLoading === 'Cache legen'} className="w-full bg-[#00FF87] text-black hover:bg-[#00CC6A]">
                <RefreshCw className="w-4 h-4 mr-2" />
                Wedstrijden verversen (KNVB Beker / live)
              </Button>
              <Button onClick={syncPlayers} loading={actionLoading === 'Spelers synchroniseren'} className="w-full" variant="secondary">
                <RefreshCw className="w-4 h-4 mr-2" />
                Spelers synchroniseren vanuit API (~2 min)
              </Button>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-bold mb-3">🗄️ Database</h2>
            <div className="space-y-3">
              <Button onClick={seedDemo} loading={actionLoading === 'Demo seed'} className="w-full" variant="secondary">
                <Database className="w-4 h-4 mr-2" />
                Demo spelers zaai (als database leeg is)
              </Button>
              <Button onClick={createSeason} loading={actionLoading === 'Seizoen aanmaken'} className="w-full" variant="secondary">
                <Trophy className="w-4 h-4 mr-2" />
                Nieuw seizoen aanmaken
              </Button>
              <Button onClick={giveNewSeasonBonus} loading={actionLoading === 'Startbonus uitdelen'} className="w-full" variant="secondary">
                <Zap className="w-4 h-4 mr-2" />
                Startbonus uitdelen (1000 coins)
              </Button>
              <Button onClick={seedAchievements} loading={actionLoading === 'Achievements zaai'} className="w-full" variant="secondary">
                <Trophy className="w-4 h-4 mr-2" />
                Achievements zaai (badges)
              </Button>
              <Button onClick={seedAchievements} loading={actionLoading === 'Achievements zaai'} className="w-full" variant="secondary">
                <Trophy className="w-4 h-4 mr-2" />
                Achievements zaai (badges)
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

      {/* Seasons */}
      {tab === 'seasons' && (
        <SeasonManager stats={stats} doAction={doAction} actionLoading={actionLoading} />
      )}

      {/* Speelrondes */}
      {tab === 'gameweeks' && <GameweekManager />}

      {/* Wedstrijden */}
      {tab === 'matches' && <MatchManager />}

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

interface Season {
  id: number
  name: string
  status: string
  competition: string
  start_date: string | null
  end_date: string | null
  total_pot: number
  team_count: number
  gameweek_count: number
}

function SeasonManager({ stats, doAction, actionLoading }: {
  stats: AdminStats | null
  doAction: (label: string, fn: () => Promise<void>) => Promise<void>
  actionLoading: string | null
}) {
  const { data: seasons = [], refetch } = useQuery<Season[]>({
    queryKey: ['admin-seasons'],
    queryFn: async () => {
      const res = await api.get('/admin/seasons')
      return res.data.data ?? []
    },
  })

  const endSeason = async (id: number) => {
    await doAction('Seizoen beëindigen', async () => {
      await api.post(`/admin/seasons/${id}/end`)
      refetch()
    })
  }

  return (
    <div className="space-y-4">
      {stats?.active_season && (
        <Card className="p-4 border border-[#00FF87]/20">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-[#00FF87] rounded-full animate-pulse" />
            <p className="font-bold text-[#00FF87]">Actief seizoen: {stats.active_season}</p>
          </div>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-[#1E2A45] flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#00FF87]" />
            Seizoenen ({seasons.length})
          </h2>
        </div>
        {seasons.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Geen seizoenen gevonden</div>
        ) : (
          <div className="divide-y divide-[#1E2A45]">
            {seasons.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === 'ACTIVE' ? 'bg-[#00FF87] animate-pulse' : s.status === 'ENDED' ? 'bg-gray-600' : 'bg-yellow-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{s.name}</p>
                  <p className="text-xs text-gray-500">
                    {s.competition} · {s.team_count} teams · {s.gameweek_count} speelrondes · {s.total_pot.toLocaleString()} coins pot
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  s.status === 'ACTIVE' ? 'bg-[#00FF87]/10 text-[#00FF87]' :
                  s.status === 'ENDED' ? 'bg-gray-700 text-gray-400' :
                  'bg-yellow-400/10 text-yellow-400'
                }`}>{s.status}</span>
                {s.status === 'ACTIVE' && (
                  <button
                    onClick={() => endSeason(s.id)}
                    disabled={actionLoading === 'Seizoen beëindigen'}
                    className="text-xs px-2 py-1 bg-red-400/10 text-red-400 rounded-lg hover:bg-red-400/20 transition-colors flex-shrink-0"
                  >
                    <Square className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

interface AdminMatch {
  id: number
  home_team: string
  away_team: string
  kickoff: string
  status: string
  home_score: number | null
  away_score: number | null
  prediction_count: number
}

interface AdminGameweek {
  id: number
  number: number
  status: string
  deadline: string
  start_date: string
  match_count: number
  team_count: number
}

function GameweekManager() {
  const { data: gameweeks = [], refetch, isLoading } = useQuery<AdminGameweek[]>({
    queryKey: ['admin-gameweeks'],
    queryFn: async () => {
      const res = await api.get('/admin/gameweeks')
      return res.data.data ?? []
    },
  })
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const activateGw = async (id: number) => {
    setActionLoading(id)
    try {
      await api.post(`/admin/gameweeks/${id}/activate`)
      toast.success('Speelronde geactiveerd')
      refetch()
    } catch {
      toast.error('Activeren mislukt')
    } finally {
      setActionLoading(null)
    }
  }

  const createGw = async () => {
    try {
      await api.post('/admin/gameweeks/create')
      toast.success('Nieuwe speelronde aangemaakt')
      refetch()
    } catch {
      toast.error('Aanmaken mislukt')
    }
  }

  const statusColor: Record<string, string> = {
    UPCOMING: 'text-gray-400 bg-gray-500/10',
    ACTIVE: 'text-[#00FF87] bg-[#00FF87]/10',
    FINISHED: 'text-blue-400 bg-blue-500/10',
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold">Speelronde beheer</h2>
        <button onClick={createGw} className="px-3 py-1.5 bg-[#00FF87] text-black rounded-lg text-sm font-bold hover:bg-[#00CC6A] transition-colors">
          + Nieuwe speelronde
        </button>
      </div>
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-[#1E2A45] rounded-lg animate-pulse" />)}</div>
      ) : gameweeks.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">Geen speelrondes gevonden</p>
      ) : (
        <div className="space-y-2">
          {gameweeks.map(gw => (
            <div key={gw.id} className="flex items-center gap-3 p-3 bg-[#0A0E1A] rounded-xl">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">Speelronde {gw.number}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${statusColor[gw.status] ?? 'text-gray-400 bg-gray-500/10'}`}>
                    {gw.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Deadline: {new Date(gw.deadline).toLocaleString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {' · '}{gw.match_count} wedstrijden · {gw.team_count} teams
                </p>
              </div>
              {gw.status !== 'ACTIVE' && (
                <button
                  onClick={() => activateGw(gw.id)}
                  disabled={actionLoading === gw.id}
                  className="px-3 py-1.5 text-xs font-bold border border-[#00FF87]/30 text-[#00FF87] rounded-lg hover:bg-[#00FF87]/10 transition-colors disabled:opacity-50"
                >
                  {actionLoading === gw.id ? '...' : 'Activeer'}
                </button>
              )}
              {gw.status === 'ACTIVE' && (
                <span className="text-xs text-[#00FF87] font-bold">● Actief</span>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function MatchManager() {
  const { data: matches = [], refetch, isLoading } = useQuery<AdminMatch[]>({
    queryKey: ['admin-matches'],
    queryFn: async () => {
      const res = await api.get('/admin/matches')
      return res.data.data ?? []
    },
  })

  const [editing, setEditing] = useState<number | null>(null)
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [saving, setSaving] = useState(false)

  const saveResult = async (matchId: number) => {
    setSaving(true)
    try {
      const res = await api.put(`/admin/matches/${matchId}/result`, { home_score: homeScore, away_score: awayScore })
      toast.success(res.data.message ?? 'Resultaat opgeslagen')
      setEditing(null)
      refetch()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Opslaan mislukt')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (m: AdminMatch) => {
    setEditing(m.id)
    setHomeScore(m.home_score ?? 0)
    setAwayScore(m.away_score ?? 0)
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-[#1E2A45] flex items-center gap-2">
        <Target className="w-4 h-4 text-[#00FF87]" />
        <h2 className="font-bold">Wedstrijden & Voorspellingen</h2>
        <span className="text-xs text-gray-500 ml-auto">{matches.length} wedstrijden (afgelopen 7 dagen)</span>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-gray-500">Laden...</div>
      ) : matches.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm">Geen wedstrijden gevonden</div>
      ) : (
        <div className="divide-y divide-[#1E2A45]">
          {matches.map(m => (
            <div key={m.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{m.home_team} vs {m.away_team}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(m.kickoff).toLocaleString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {m.prediction_count > 0 && <span className="ml-2 text-[#00FF87]">· {m.prediction_count} voorspellingen</span>}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  m.status === 'FT' ? 'bg-gray-700 text-gray-400' :
                  m.status === 'LIVE' ? 'bg-red-400/20 text-red-400 animate-pulse' :
                  'bg-blue-400/10 text-blue-400'
                }`}>{m.status}</span>
                {m.home_score != null && (
                  <span className="text-sm font-black text-white flex-shrink-0">{m.home_score}–{m.away_score}</span>
                )}
                <button
                  onClick={() => editing === m.id ? setEditing(null) : openEdit(m)}
                  className="p-1.5 rounded-lg hover:bg-[#1E2A45] transition-colors flex-shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>

              {editing === m.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 pt-3 border-t border-[#1E2A45] flex items-center gap-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-20 truncate">{m.home_team}</span>
                    <button onClick={() => setHomeScore(Math.max(0, homeScore - 1))} className="w-7 h-7 rounded-lg bg-[#0A0E1A] font-bold hover:bg-[#1E2A45]">−</button>
                    <span className="text-lg font-black w-6 text-center">{homeScore}</span>
                    <button onClick={() => setHomeScore(homeScore + 1)} className="w-7 h-7 rounded-lg bg-[#0A0E1A] font-bold hover:bg-[#1E2A45]">+</button>
                  </div>
                  <span className="text-gray-600 font-black">—</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setAwayScore(Math.max(0, awayScore - 1))} className="w-7 h-7 rounded-lg bg-[#0A0E1A] font-bold hover:bg-[#1E2A45]">−</button>
                    <span className="text-lg font-black w-6 text-center">{awayScore}</span>
                    <button onClick={() => setAwayScore(awayScore + 1)} className="w-7 h-7 rounded-lg bg-[#0A0E1A] font-bold hover:bg-[#1E2A45]">+</button>
                    <span className="text-xs text-gray-400 w-20 truncate">{m.away_team}</span>
                  </div>
                  <button
                    onClick={() => saveResult(m.id)}
                    disabled={saving}
                    className="ml-auto px-4 py-1.5 rounded-xl text-sm font-bold bg-[#00FF87] text-black hover:bg-[#00E077] disabled:opacity-50 flex-shrink-0"
                  >
                    {saving ? 'Opslaan...' : 'Opslaan + Score'}
                  </button>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
