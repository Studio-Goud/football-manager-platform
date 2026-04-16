'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, LogIn, Trophy, Copy, Check, Crown, Lock, ChevronRight, Euro } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import Link from 'next/link'
import toast from 'react-hot-toast'
import api from '@/lib/api'

interface PrivateLeague {
  id: string
  name: string
  code: string
  owner_id: string
  max_members: number
  league_filter: string | null
  pot_amount: number | null
  member_count: number
  is_owner: boolean
  members: Array<{ user: { id: string; username: string; tier: string }; joined_at: string; is_owner: boolean }>
}

const LEAGUE_OPTIONS = [
  { value: null,         label: 'Alle liga\'s', icon: '🌍' },
  { value: 'eredivisie', label: 'Eredivisie',   icon: '🇳🇱' },
  { value: 'premier',    label: 'Premier League', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { value: 'laliga',     label: 'La Liga',      icon: '🇪🇸' },
  { value: 'bundesliga', label: 'Bundesliga',   icon: '🇩🇪' },
  { value: 'seriea',     label: 'Serie A',      icon: '🇮🇹' },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-[#1E2A45] transition-colors">
      {copied ? <Check className="w-4 h-4 text-[#00FF87]" /> : <Copy className="w-4 h-4 text-gray-400" />}
    </button>
  )
}

function LeagueCard({ league }: { league: PrivateLeague }) {
  const leagueOption = LEAGUE_OPTIONS.find(o => o.value === league.league_filter) ?? LEAGUE_OPTIONS[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0F1629] border border-[#1E2A45] rounded-2xl p-5 space-y-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-lg">{league.name}</h3>
            {league.is_owner && <Crown className="w-4 h-4 text-[#F59E0B]" />}
          </div>
          <p className="text-sm text-gray-400 mt-0.5">{leagueOption.icon} {leagueOption.label}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Deelnemers</p>
          <p className="font-black text-[#00FF87]">{league.member_count}/{league.max_members}</p>
        </div>
      </div>

      {/* Pot */}
      {league.pot_amount && (
        <div className="flex items-center gap-2 bg-[#F59E0B]/5 border border-[#F59E0B]/20 rounded-xl px-4 py-2.5">
          <Euro className="w-4 h-4 text-[#F59E0B]" />
          <span className="text-sm text-[#F59E0B] font-medium">Pot: €{league.pot_amount} p.p. · onderling te verrekenen</span>
        </div>
      )}

      {/* Join code */}
      <div className="flex items-center gap-2 bg-[#0A0E1A] rounded-xl px-4 py-3">
        <Lock className="w-4 h-4 text-gray-500" />
        <span className="text-xs text-gray-500">Code:</span>
        <span className="font-black text-white tracking-widest flex-1">{league.code}</span>
        <CopyButton text={league.code} />
      </div>

      {/* Members */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {league.members.slice(0, 8).map((m) => (
          <div key={m.user.id} className="relative">
            <div className="w-8 h-8 bg-[#1E2A45] rounded-full flex items-center justify-center text-xs font-black">
              {m.user.username.slice(0, 2).toUpperCase()}
            </div>
            {m.is_owner && (
              <Crown className="w-3 h-3 text-[#F59E0B] absolute -top-1 -right-1" />
            )}
          </div>
        ))}
        {league.member_count > 8 && (
          <div className="w-8 h-8 bg-[#1E2A45] rounded-full flex items-center justify-center text-xs text-gray-400">
            +{league.member_count - 8}
          </div>
        )}
      </div>

      <Link
        href={`/leagues/${league.id}`}
        className="flex items-center justify-between px-4 py-2.5 bg-[#00FF87]/5 border border-[#00FF87]/20 rounded-xl hover:bg-[#00FF87]/10 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-[#00FF87]">
          <Trophy className="w-4 h-4" />
          Bekijk ranglijst
        </div>
        <ChevronRight className="w-4 h-4 text-[#00FF87]" />
      </Link>
    </motion.div>
  )
}

export default function LeaguesPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<'none' | 'create' | 'join'>('none')
  const [createForm, setCreateForm] = useState({
    name: '',
    max_members: 20,
    league_filter: null as string | null,
    pot_amount: '' as string,
  })
  const [joinCode, setJoinCode] = useState('')

  const { data: leagues = [], isLoading } = useQuery({
    queryKey: ['private-leagues'],
    queryFn: async () => {
      const res = await api.get('/leagues/my')
      return res.data.data as PrivateLeague[]
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: object) => api.post('/leagues', data),
    onSuccess: (res) => {
      toast.success(res.data.message)
      qc.invalidateQueries({ queryKey: ['private-leagues'] })
      setModal('none')
      setCreateForm({ name: '', max_members: 20, league_filter: null, pot_amount: '' })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Aanmaken mislukt'),
  })

  const joinMutation = useMutation({
    mutationFn: (code: string) => api.post('/leagues/join', { code }),
    onSuccess: (res) => {
      toast.success(res.data.message)
      qc.invalidateQueries({ queryKey: ['private-leagues'] })
      setModal('none')
      setJoinCode('')
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Joinen mislukt'),
  })

  const handleCreate = () => {
    if (!createForm.name.trim()) { toast.error('Geef een naam op'); return }
    createMutation.mutate({
      name: createForm.name,
      max_members: createForm.max_members,
      league_filter: createForm.league_filter || null,
      pot_amount: createForm.pot_amount ? Number(createForm.pot_amount) : null,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Vrienden Competities</h1>
          <p className="text-gray-400 text-sm mt-1">Speel met vrienden — met een privépot als je wilt.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModal('join')}
            className="flex items-center gap-2 px-4 py-2.5 border border-[#1E2A45] text-white rounded-xl text-sm font-medium hover:border-[#00FF87]/30 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">Joinen</span>
          </button>
          <button
            onClick={() => setModal('create')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#00FF87] text-[#0A0E1A] rounded-xl text-sm font-bold hover:bg-[#00CC6A] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Aanmaken</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : leagues.length === 0 ? (
        <Card className="p-12 text-center">
          <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Nog geen competities</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
            Maak een privé competitie aan voor je vrienden. Optioneel kun je een pot instellen — jullie regelen de betaling zelf onderling.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setModal('join')} className="px-5 py-2.5 border border-[#1E2A45] text-white rounded-xl text-sm font-medium hover:border-[#00FF87]/30 transition-colors">
              Code invoeren
            </button>
            <button onClick={() => setModal('create')} className="px-5 py-2.5 bg-[#00FF87] text-[#0A0E1A] rounded-xl text-sm font-bold hover:bg-[#00CC6A] transition-colors">
              Aanmaken
            </button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {leagues.map(l => <LeagueCard key={l.id} league={l} />)}
        </div>
      )}

      <AnimatePresence>
        {modal !== 'none' && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setModal('none')}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-[#0F1629] border border-[#1E2A45] rounded-2xl p-6 z-50 max-h-[90vh] overflow-y-auto"
            >
              {modal === 'create' ? (
                <div className="space-y-5">
                  <h2 className="text-xl font-black">Competitie aanmaken</h2>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Naam</label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="bijv. FC Kantoor 2026"
                      className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Liga filter</label>
                    <div className="grid grid-cols-2 gap-2">
                      {LEAGUE_OPTIONS.map(opt => (
                        <button
                          key={String(opt.value)}
                          onClick={() => setCreateForm(f => ({ ...f, league_filter: opt.value }))}
                          className={`py-2 px-3 rounded-xl text-sm text-left transition-all ${
                            createForm.league_filter === opt.value
                              ? 'bg-[#00FF87]/10 border border-[#00FF87]/30 text-[#00FF87]'
                              : 'bg-[#0A0E1A] border border-[#1E2A45] text-gray-300 hover:border-[#2D3A55]'
                          }`}
                        >
                          {opt.icon} {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Pot per persoon (optioneel)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Informatief — jullie regelen dit zelf onderling. Het platform beheert geen geld.
                    </p>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                      <input
                        type="number"
                        min={0}
                        value={createForm.pot_amount}
                        onChange={e => setCreateForm(f => ({ ...f, pot_amount: e.target.value }))}
                        placeholder="0"
                        className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-xl pl-8 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max deelnemers</label>
                    <div className="flex gap-2">
                      {[10, 20, 50, 100].map(n => (
                        <button
                          key={n}
                          onClick={() => setCreateForm(f => ({ ...f, max_members: n }))}
                          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                            createForm.max_members === n
                              ? 'bg-[#00FF87]/10 border border-[#00FF87]/30 text-[#00FF87]'
                              : 'bg-[#0A0E1A] border border-[#1E2A45] text-gray-400'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleCreate}
                      disabled={createMutation.isPending}
                      className="flex-1 bg-[#00FF87] text-[#0A0E1A] py-3 rounded-xl font-bold disabled:opacity-50"
                    >
                      {createMutation.isPending ? 'Aanmaken...' : 'Aanmaken'}
                    </button>
                    <button onClick={() => setModal('none')} className="flex-1 border border-[#1E2A45] text-white py-3 rounded-xl font-medium">
                      Annuleren
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <h2 className="text-xl font-black">Competitie joinen</h2>
                  <p className="text-sm text-gray-400">Vraag de 6-tekens code op bij de beheerder.</p>

                  <input
                    type="text"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="A1B2C3"
                    maxLength={6}
                    className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87] text-center text-3xl font-black tracking-widest"
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => joinMutation.mutate(joinCode)}
                      disabled={joinMutation.isPending || joinCode.length !== 6}
                      className="flex-1 bg-[#00FF87] text-[#0A0E1A] py-3 rounded-xl font-bold disabled:opacity-50"
                    >
                      {joinMutation.isPending ? 'Joinen...' : 'Joinen'}
                    </button>
                    <button onClick={() => setModal('none')} className="flex-1 border border-[#1E2A45] text-white py-3 rounded-xl font-medium">
                      Annuleren
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
