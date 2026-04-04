'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRequireAdmin } from '@/hooks/useAuth'
import { Card } from '@/components/ui/Card'
import { Users, DollarSign, TrendingUp, AlertTriangle, Shield, Settings, BarChart2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

const revenueData = [
  { month: 'Jan', revenue: 4200, deposits: 21000 },
  { month: 'Feb', revenue: 5800, deposits: 29000 },
  { month: 'Mar', revenue: 6100, deposits: 30500 },
  { month: 'Apr', revenue: 7300, deposits: 36500 },
  { month: 'May', revenue: 8900, deposits: 44500 },
  { month: 'Jun', revenue: 9200, deposits: 46000 },
]

const mockUsers = [
  { id: '1', username: 'JanDeVoetbalfan', email: 'jan@example.nl', balance: 47.5, kyc: 'verified', tier: 'gold', total_deposits: 680, status: 'active' },
  { id: '2', username: 'MoMoMaster', email: 'mo@example.nl', balance: 123.0, kyc: 'verified', tier: 'platinum', total_deposits: 1240, status: 'active' },
  { id: '3', username: 'SuspiciousUser', email: 'sus@example.nl', balance: 0, kyc: 'pending', tier: 'bronze', total_deposits: 50, status: 'flagged' },
  { id: '4', username: 'StreetManager', email: 'street@example.nl', balance: 12.5, kyc: 'verified', tier: 'silver', total_deposits: 340, status: 'active' },
]

type AdminTab = 'overview' | 'users' | 'seasons' | 'payouts'

export default function AdminPage() {
  const { isAdmin } = useRequireAdmin()
  const [tab, setTab] = useState<AdminTab>('overview')
  const [userSearch, setUserSearch] = useState('')

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <p>Geen toegang — admin vereist</p>
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'Totale gebruikers', value: '12.847', icon: Users, color: '#3B82F6', delta: '+247 deze week' },
    { label: 'Platform revenue', value: '€29.062', icon: DollarSign, color: '#00FF87', delta: '+€2.100 vs vorige week' },
    { label: 'Actief deze week', value: '4.231', icon: TrendingUp, color: '#FFD700', delta: '32.9% van totaal' },
    { label: 'Openstaande alerts', value: '3', icon: AlertTriangle, color: '#EF4444', delta: '2 nieuw' },
  ]

  const filteredUsers = mockUsers.filter(u =>
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-[#EF4444]" />
        <h1 className="text-2xl font-black">Admin Dashboard</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0F1629] rounded-xl p-1 border border-[#1E2A45]">
        {([['overview', 'Overzicht'], ['users', 'Gebruikers'], ['seasons', 'Seizoenen'], ['payouts', 'Uitbetalingen']] as [AdminTab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-[#EF4444] text-white' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                    <span className="text-xs text-gray-500">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-black">{stat.value}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{stat.delta}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <h2 className="font-bold mb-4">Revenue per maand</h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0F1629', border: '1px solid #1E2A45', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="revenue" fill="#00FF87" radius={[4, 4, 0, 0]} name="Revenue €" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="font-bold mb-4">Stortingen per maand</h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#0F1629', border: '1px solid #1E2A45', borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="deposits" stroke="#3B82F6" strokeWidth={2} dot={false} name="Stortingen €" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Alerts */}
          <Card className="p-5">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#F97316]" />
              Actieve Alerts
            </h2>
            <div className="space-y-3">
              {[
                { type: 'Verdacht patroon', user: 'SuspiciousUser', detail: 'Circulaire markt-trades gedetecteerd', severity: 'high' },
                { type: 'Ongebruikelijke storting', user: 'MoMoMaster', detail: '€500 storting — boven daggemiddelde', severity: 'medium' },
                { type: 'Meerdere accounts', user: '??', detail: '3 accounts gedetecteerd vanuit zelfde IP', severity: 'high' },
              ].map((alert, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${alert.severity === 'high' ? 'border-red-500/30 bg-red-500/10' : 'border-[#F97316]/30 bg-[#F97316]/10'}`}>
                  <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${alert.severity === 'high' ? 'text-red-400' : 'text-[#F97316]'}`} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{alert.type} — {alert.user}</p>
                    <p className="text-xs text-gray-400">{alert.detail}</p>
                  </div>
                  <button className="text-xs border border-[#1E2A45] px-2 py-1 rounded-lg hover:bg-[#1E2A45] transition-colors flex-shrink-0">
                    Bekijken
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Zoek gebruiker..."
              className="flex-1 bg-[#0F1629] border border-[#1E2A45] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87]"
            />
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1E2A45] text-left">
                    {['Gebruiker', 'Email', 'Saldo', 'Tier', 'KYC', 'Totaal gestort', 'Status', 'Acties'].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2A45]">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-[#0F1629] transition-colors">
                      <td className="px-4 py-3 font-medium">{u.username}</td>
                      <td className="px-4 py-3 text-gray-400">{u.email}</td>
                      <td className="px-4 py-3 text-[#00FF87] font-bold">{u.balance.toFixed(1)} cr</td>
                      <td className="px-4 py-3 capitalize">{u.tier}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.kyc === 'verified' ? 'bg-[#00FF87]/10 text-[#00FF87]' : 'bg-[#F97316]/10 text-[#F97316]'}`}>
                          {u.kyc}
                        </span>
                      </td>
                      <td className="px-4 py-3">€{u.total_deposits}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-[#00FF87]/10 text-[#00FF87]' : u.status === 'flagged' ? 'bg-red-500/10 text-red-400' : 'bg-gray-700 text-gray-400'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button className="text-xs text-[#3B82F6] hover:underline">Detail</button>
                          <button className="text-xs text-red-400 hover:underline">Suspend</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === 'seasons' && (
        <Card className="p-5">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Seizoen Beheer
          </h2>
          <div className="space-y-4">
            <div className="bg-[#0A0E1A] rounded-xl p-4 border border-[#00FF87]/30">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold">Eredivisie 2024/25</p>
                  <p className="text-sm text-gray-400">Speelronde 28/38 · 1.247 deelnemers</p>
                </div>
                <span className="bg-[#00FF87]/20 text-[#00FF87] text-xs px-2 py-0.5 rounded-full font-bold">ACTIEF</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm text-center">
                <div className="bg-[#0F1629] rounded-lg p-2">
                  <p className="font-bold text-[#00FF87]">€37.410</p>
                  <p className="text-xs text-gray-500">Totale pot</p>
                </div>
                <div className="bg-[#0F1629] rounded-lg p-2">
                  <p className="font-bold">€7.482</p>
                  <p className="text-xs text-gray-500">Platform fee</p>
                </div>
                <div className="bg-[#0F1629] rounded-lg p-2">
                  <p className="font-bold">10 GW resterend</p>
                  <p className="text-xs text-gray-500">Einddatum: 19 mei</p>
                </div>
              </div>
            </div>

            <button className="w-full border border-dashed border-[#1E2A45] rounded-xl p-4 text-gray-500 hover:border-[#00FF87]/30 hover:text-[#00FF87] transition-colors text-sm">
              + Nieuw seizoen aanmaken
            </button>
          </div>
        </Card>
      )}

      {tab === 'payouts' && (
        <Card className="p-5">
          <h2 className="font-bold mb-4">Openstaande Uitbetalingen</h2>
          <div className="space-y-3">
            {[
              { user: 'JanDeVoetbalfan', amount: 847, iban: 'NL91 ABNA 0417 1643 00', requested: '1 apr 2026' },
              { user: 'GoalMachine99', amount: 564, iban: 'NL39 RABO 0300 0652 64', requested: '2 apr 2026' },
              { user: 'TacticoMaster', amount: 338, iban: 'NL20 INGB 0001 2345 67', requested: '3 apr 2026' },
            ].map((payout, i) => (
              <div key={i} className="flex items-center gap-4 bg-[#0A0E1A] rounded-xl p-4">
                <div className="flex-1">
                  <p className="font-semibold">{payout.user}</p>
                  <p className="text-xs text-gray-500 font-mono">{payout.iban}</p>
                  <p className="text-xs text-gray-600">Aangevraagd: {payout.requested}</p>
                </div>
                <p className="font-black text-[#00FF87]">€{payout.amount}</p>
                <button className="bg-[#00FF87] text-[#0A0E1A] px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#00CC6A] transition-colors">
                  Verwerken
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
