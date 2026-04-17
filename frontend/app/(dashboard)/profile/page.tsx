'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useWallet } from '@/hooks/useWallet'
import { useTeam } from '@/hooks/useTeam'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { DepositModal } from '@/components/profile/DepositModal'
import { TransactionTable } from '@/components/profile/TransactionTable'
import { TierProgress } from '@/components/profile/TierProgress'
import { PlusCircle, CreditCard, BarChart2, User, Trophy, Zap, Users, Medal, Bell, Activity } from 'lucide-react'
import Link from 'next/link'
import api from '@/lib/api'
import { requestPushPermission } from '@/hooks/usePushNotifications'

type Tab = 'overview' | 'transactions' | 'tier' | 'achievements' | 'activity'

interface Achievement {
  id: number
  code: string
  name: string
  description: string
  icon: string
  points_reward: number
  credits_reward: number | string
  earned: boolean
  earned_at: string | null
}

export default function ProfilePage() {
  const { user } = useAuthStore()
  const { transactions } = useWallet()
  const { team } = useTeam()
  const { data: leaderboard } = useLeaderboard()
  const [tab, setTab] = useState<Tab>('overview')
  const [depositOpen, setDepositOpen] = useState(false)

  const { data: achievements = [] } = useQuery<Achievement[]>({
    queryKey: ['my-achievements'],
    queryFn: async () => {
      const res = await api.get('/achievements/my')
      return res.data.data
    },
    enabled: tab === 'achievements',
  })

  const { data: streakData } = useQuery<{ streak: number; last_claimed: string | null }>({
    queryKey: ['login-streak'],
    queryFn: async () => {
      const res = await api.get('/auth/streak')
      return res.data.data
    },
    staleTime: 300000,
  })

  const currentUser = user ?? {
    username: 'Demo User', email: 'demo@example.nl', balance_credits: 5000,
    tier: 'gold' as const, kyc_status: 'verified' as const, role: 'user' as const,
    seasons_played: 4, best_finish: 12,
  }

  const txData = transactions ?? []
  const earnedCount = achievements.filter(a => a.earned).length

  interface ActivityItem {
    id: string
    type: string
    icon: string
    title: string
    coins: number
    date: string
  }
  const { data: activityFeed = [] } = useQuery<ActivityItem[]>({
    queryKey: ['activity-feed'],
    queryFn: async () => {
      const res = await api.get('/auth/activity')
      return res.data.data
    },
    enabled: tab === 'activity',
    staleTime: 60000,
  })

  const tabs = [
    { key: 'overview' as Tab,      label: 'Overzicht',    icon: User },
    { key: 'activity' as Tab,      label: 'Activiteit',   icon: Activity },
    { key: 'transactions' as Tab,  label: 'Transacties',  icon: CreditCard },
    { key: 'tier' as Tab,          label: 'Tier',         icon: BarChart2 },
    { key: 'achievements' as Tab,  label: 'Badges',       icon: Medal },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">Mijn Profiel</h1>

      {/* Profile header */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <Avatar fallback={currentUser.username} size="xl" />
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-black">{currentUser.username}</h2>
            <p className="text-gray-400 text-sm">{currentUser.email}</p>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-2">
              <span className="text-xs bg-[#1E2A45] text-gray-300 px-2 py-0.5 rounded-full capitalize">
                {currentUser.tier}
              </span>
              {earnedCount > 0 && (
                <span className="text-xs bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full">
                  🏅 {earnedCount} badges
                </span>
              )}
            </div>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-3xl font-black text-[#00FF87]">
              {typeof currentUser.balance_credits === 'number'
                ? currentUser.balance_credits.toLocaleString()
                : Number(currentUser.balance_credits).toLocaleString()}
            </p>
            <p className="text-sm text-gray-400">coins</p>
            <div className="flex gap-2 mt-3 flex-wrap justify-center sm:justify-end">
              <button
                onClick={() => setDepositOpen(true)}
                className="flex items-center gap-1.5 bg-[#00FF87] text-[#0A0E1A] px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-[#00CC6A] transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Coins kopen
              </button>
              {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
                <button
                  onClick={() => requestPushPermission()}
                  className="flex items-center gap-1.5 bg-[#1E2A45] text-gray-300 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[#2A3A55] transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  Meldingen
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-[#1E2A45]">
          {[
            { label: 'Seizoenen', value: (currentUser as any).seasons_played ?? 0 },
            { label: 'Beste finish', value: `#${(currentUser as any).best_finish ?? '-'}` },
            { label: 'Streak 🔥', value: streakData?.streak ? `${streakData.streak}d` : '0d' },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="font-black text-lg">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0F1629] rounded-xl p-1 border border-[#1E2A45]">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              tab === t.key ? 'bg-[#00FF87] text-[#0A0E1A]' : 'text-gray-400 hover:text-white'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {tab === 'overview' && (
          <div className="space-y-4">
            {/* Team Stats */}
            {team && (
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold">{team.name}</h2>
                  <Link href="/team" className="text-xs text-[#00FF87] hover:underline">Bewerken →</Link>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Totale punten', value: Number(team.total_points).toLocaleString(), icon: Trophy, color: '#FFD700' },
                    { label: 'Huidige rang', value: (() => { const e = leaderboard?.entries?.find((e: { is_current_user?: boolean }) => e.is_current_user); return e?.rank ? `#${e.rank}` : '—' })(), icon: Users, color: '#00FF87' },
                    { label: 'Teamwaarde', value: `${team.players.reduce((s, tp) => s + (tp.player?.price ?? 0), 0).toFixed(1)} cr`, icon: Zap, color: '#3B82F6' },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-[#0A0E1A] rounded-xl p-3 text-center">
                      <Icon className="w-4 h-4 mx-auto mb-1.5" style={{ color }} />
                      <p className="font-black text-sm">{value}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Account info */}
            <Card className="p-5">
              <h2 className="font-bold mb-4">Account Informatie</h2>
              <div className="space-y-3">
                {[
                  { label: 'Gebruikersnaam', value: currentUser.username },
                  { label: 'E-mail', value: currentUser.email },
                  { label: 'Lid sinds', value: new Date((user as unknown as { created_at?: string })?.created_at ?? Date.now()).toLocaleDateString('nl-NL', { year: 'numeric', month: 'long' }) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-2 border-b border-[#1E2A45] last:border-0">
                    <span className="text-sm text-gray-400">{label}</span>
                    <span className="text-sm font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {tab === 'transactions' && (
          <Card className="p-5">
            <h2 className="font-bold mb-4">Transactiegeschiedenis</h2>
            <TransactionTable transactions={txData} />
          </Card>
        )}

        {tab === 'tier' && (
          <Card className="p-5">
            <h2 className="font-bold mb-4">Tier Systeem</h2>
            <TierProgress currentTier={currentUser.tier} totalInvested={0} />
          </Card>
        )}

        {tab === 'achievements' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                {earnedCount} / {achievements.length} behaald
              </p>
              <div className="h-2 flex-1 mx-4 bg-[#1E2A45] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00FF87] rounded-full transition-all duration-500"
                  style={{ width: achievements.length ? `${(earnedCount / achievements.length) * 100}%` : '0%' }}
                />
              </div>
            </div>

            <div className="grid gap-3">
              {achievements.map((ach, i) => (
                <motion.div
                  key={ach.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    ach.earned
                      ? 'bg-[#0A0E1A] border-[#00FF87]/20'
                      : 'bg-[#0A0E1A]/50 border-[#1E2A45] opacity-50'
                  }`}
                >
                  <div className={`text-2xl w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 ${
                    ach.earned ? 'bg-[#00FF87]/10' : 'bg-[#1E2A45]'
                  }`}>
                    {ach.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${ach.earned ? 'text-white' : 'text-gray-500'}`}>
                      {ach.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{ach.description}</p>
                    {ach.earned && ach.earned_at && (
                      <p className="text-[10px] text-[#00FF87] mt-0.5">
                        Behaald op {new Date(ach.earned_at).toLocaleDateString('nl-NL')}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {Number(ach.credits_reward) > 0 && (
                      <p className="text-xs font-bold text-[#00FF87]">+{Number(ach.credits_reward)} coins</p>
                    )}
                    {ach.points_reward > 0 && (
                      <p className="text-[10px] text-gray-500">{ach.points_reward} pts</p>
                    )}
                    {ach.earned && <p className="text-lg mt-1">✅</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {tab === 'activity' && (
          <div className="space-y-3">
            {activityFeed.length === 0 ? (
              <Card className="p-8 text-center">
                <Activity className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Nog geen activiteit</p>
              </Card>
            ) : (
              <Card className="divide-y divide-[#1E2A45]">
                {activityFeed.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-2xl flex-shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(item.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {item.coins !== 0 && (
                      <span className={`text-sm font-black flex-shrink-0 ${item.coins > 0 ? 'text-[#00FF87]' : 'text-red-400'}`}>
                        {item.coins > 0 ? '+' : ''}{item.coins}
                      </span>
                    )}
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}
      </motion.div>

      <DepositModal isOpen={depositOpen} onClose={() => setDepositOpen(false)} />
    </div>
  )
}
