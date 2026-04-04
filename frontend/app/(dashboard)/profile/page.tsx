'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useWallet } from '@/hooks/useWallet'
import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { DepositModal } from '@/components/profile/DepositModal'
import { WithdrawModal } from '@/components/profile/WithdrawModal'
import { TransactionTable } from '@/components/profile/TransactionTable'
import { TierProgress } from '@/components/profile/TierProgress'
import { ResponsibleGaming } from '@/components/profile/ResponsibleGaming'
import { mockTransactions } from '@/lib/mockData'
import { PlusCircle, MinusCircle, Shield, CreditCard, BarChart2, User } from 'lucide-react'

type Tab = 'overview' | 'transactions' | 'tier' | 'responsible'

export default function ProfilePage() {
  const { user } = useAuthStore()
  const { transactions } = useWallet()
  const [tab, setTab] = useState<Tab>('overview')
  const [depositOpen, setDepositOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)

  const currentUser = user ?? {
    username: 'Demo User', email: 'demo@example.nl', balance_credits: 47.5,
    tier: 'gold' as const, kyc_status: 'verified' as const, role: 'user' as const,
    seasons_played: 4, best_finish: 12, total_winnings: 234.5, total_invested: 680,
  }

  const txData = transactions.length > 0 ? transactions : mockTransactions

  const tabs = [
    { key: 'overview' as Tab, label: 'Overzicht', icon: User },
    { key: 'transactions' as Tab, label: 'Transacties', icon: CreditCard },
    { key: 'tier' as Tab, label: 'Tier', icon: BarChart2 },
    { key: 'responsible' as Tab, label: 'Verantwoord', icon: Shield },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">Mijn Profiel</h1>

      {/* Profile header */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <Avatar username={currentUser.username} tier={currentUser.tier} size="xl" />
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-black">{currentUser.username}</h2>
            <p className="text-gray-400 text-sm">{currentUser.email}</p>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                currentUser.kyc_status === 'verified' ? 'bg-[#00FF87]/20 text-[#00FF87]' :
                currentUser.kyc_status === 'pending' ? 'bg-[#F97316]/20 text-[#F97316]' :
                'bg-red-500/20 text-red-400'
              }`}>
                KYC: {currentUser.kyc_status === 'verified' ? '✓ Geverifieerd' : currentUser.kyc_status === 'pending' ? '⏳ In behandeling' : '✗ Niet geverifieerd'}
              </span>
              <span className="text-xs bg-[#1E2A45] text-gray-300 px-2 py-0.5 rounded-full capitalize">
                {currentUser.tier}
              </span>
            </div>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-3xl font-black text-[#00FF87]">{currentUser.balance_credits.toFixed(1)}</p>
            <p className="text-sm text-gray-400">credits</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setDepositOpen(true)} className="flex items-center gap-1.5 bg-[#00FF87] text-[#0A0E1A] px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-[#00CC6A] transition-colors">
                <PlusCircle className="w-4 h-4" />
                Storten
              </button>
              <button onClick={() => setWithdrawOpen(true)} className="flex items-center gap-1.5 border border-[#1E2A45] text-white px-3 py-1.5 rounded-lg text-sm hover:border-[#00FF87]/30 transition-colors">
                <MinusCircle className="w-4 h-4" />
                Opnemen
              </button>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-[#1E2A45]">
          {[
            { label: 'Seizoenen', value: currentUser.seasons_played },
            { label: 'Beste finish', value: `#${currentUser.best_finish}` },
            { label: 'Totale winst', value: `€${currentUser.total_winnings?.toFixed(0) ?? '0'}` },
            { label: 'Geïnvesteerd', value: `€${currentUser.total_invested?.toFixed(0) ?? '0'}` },
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
          <Card className="p-5">
            <h2 className="font-bold mb-4">Account Informatie</h2>
            <div className="space-y-3">
              {[
                { label: 'Gebruikersnaam', value: currentUser.username },
                { label: 'E-mail', value: currentUser.email },
                { label: 'Lid sinds', value: '15 jan 2024' },
                { label: 'Laatste login', value: '4 apr 2026' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 border-b border-[#1E2A45] last:border-0">
                  <span className="text-sm text-gray-400">{label}</span>
                  <span className="text-sm font-medium">{value}</span>
                </div>
              ))}
            </div>
          </Card>
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
            <TierProgress currentTier={currentUser.tier} totalInvested={currentUser.total_invested ?? 680} />
          </Card>
        )}

        {tab === 'responsible' && (
          <Card className="p-5">
            <h2 className="font-bold mb-4">Verantwoord Spelen</h2>
            <ResponsibleGaming />
          </Card>
        )}
      </motion.div>

      <DepositModal isOpen={depositOpen} onClose={() => setDepositOpen(false)} />
      <WithdrawModal isOpen={withdrawOpen} onClose={() => setWithdrawOpen(false)} />
    </div>
  )
}
