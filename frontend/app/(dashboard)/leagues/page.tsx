'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, LogIn, Trophy, Copy, Check, Crown, Globe, Lock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

interface PrivateLeague {
  id: string
  name: string
  code: string
  owner_id: string
  max_members: number
  league_filter: string | null
  allow_mixed: boolean
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
  { value: 'ligue1',     label: 'Ligue 1',      icon: '🇫🇷' },
  { value: 'champions',  label: 'Champions League', icon: '⭐' },
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

function LeagueCard({ league, onRefresh }: { league: PrivateLeague; onRefresh: () => void }) {
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

      {/* Join code */}
      <div className="flex items-center gap-2 bg-[#0A0E1A] rounded-xl px-4 py-3">
        <Lock className="w-4 h-4 text-gray-500" />
        <span className="text-xs text-gray-500">Code:</span>
        <span className="font-black text-white tracking-widest flex-1">{league.code}</span>
        <CopyButton text={league.code} />
      </div>

      {/* Top members */}
      <div className="space-y-2">
        {league.members.slice(0, 5).map((m) => (
          <div key={m.user.id} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1E2A45] rounded-full flex items-center justify-center text-xs font-black">
              {m.user.username.slice(0, 2).toUpperCase()}
            </div>
            <span className="text-sm flex-1">{m.user.username}</span>
            {m.is_owner && <Crown className="w-3.5 h-3.5 text-[#F59E0B]" />}
          </div>
        ))}
        {league.member_count > 5 && (
          <p className="text-xs text-gray-500 pl-11">+{league.member_count - 5} anderen</p>
        )}
      </div>
    </motion.div>
  )
}

export default function LeaguesPage() {
  const { user } = useAuthStore()
  const [leagues, setLeagues] = useState<PrivateLeague[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'none' | 'create' | 'join'>('none')
  const [createForm, setCreateForm] = useState({ name: '', max_members: 20, league_filter: null as string | null })
  const [joinCode, setJoinCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchLeagues = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leagues/my`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) setLeagues(data.data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchLeagues() }, [])

  const handleCreate = async () => {
    if (!createForm.name.trim()) { toast.error('Geef een naam op'); return }
    setSubmitting(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leagues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(createForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      toast.success(data.message)
      setModal('none')
      setCreateForm({ name: '', max_members: 20, league_filter: null })
      fetchLeagues()
    } catch (e: any) {
      toast.error(e.message ?? 'Aanmaken mislukt')
    }
    setSubmitting(false)
  }

  const handleJoin = async () => {
    if (joinCode.length !== 6) { toast.error('Code moet 6 tekens zijn'); return }
    setSubmitting(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leagues/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: joinCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      toast.success(data.message)
      setModal('none')
      setJoinCode('')
      fetchLeagues()
    } catch (e: any) {
      toast.error(e.message ?? 'Joinen mislukt')
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Vrienden Competities</h1>
          <p className="text-gray-400 text-sm mt-1">Speel mee met vrienden — net als Coach van het Jaar, maar dieper.</p>
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

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="h-48 bg-[#0F1629] border border-[#1E2A45] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : leagues.length === 0 ? (
        <Card className="p-12 text-center">
          <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Nog geen competities</h3>
          <p className="text-gray-400 text-sm mb-6">Maak een privé competitie aan of join er een met een code van een vriend.</p>
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
          {leagues.map(l => <LeagueCard key={l.id} league={l} onRefresh={fetchLeagues} />)}
        </div>
      )}

      {/* Modals */}
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
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-[#0F1629] border border-[#1E2A45] rounded-2xl p-6 z-50"
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
                          className={`py-2.5 px-3 rounded-xl text-sm text-left transition-all ${
                            createForm.league_filter === opt.value
                              ? 'bg-[#00FF87]/10 border border-[#00FF87]/30 text-[#00FF87]'
                              : 'bg-[#0A0E1A] border border-[#1E2A45] text-gray-300 hover:border-[#2D3A55]'
                          }`}
                        >
                          {opt.icon} {opt.label}
                        </button>
                      ))}
                    </div>
                    {createForm.league_filter && (
                      <p className="text-xs text-[#F59E0B] mt-2">
                        Alleen spelers uit de {LEAGUE_OPTIONS.find(o => o.value === createForm.league_filter)?.label} zijn geldig.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleCreate}
                      disabled={submitting}
                      className="flex-1 bg-[#00FF87] text-[#0A0E1A] py-3 rounded-xl font-bold disabled:opacity-50"
                    >
                      {submitting ? 'Aanmaken...' : 'Aanmaken'}
                    </button>
                    <button onClick={() => setModal('none')} className="flex-1 border border-[#1E2A45] text-white py-3 rounded-xl font-medium hover:border-[#00FF87]/30">
                      Annuleren
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <h2 className="text-xl font-black">Competitie joinen</h2>
                  <p className="text-sm text-gray-400">Vraag de 6-cijferige code op bij de beheerder van de competitie.</p>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Code</label>
                    <input
                      type="text"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                      placeholder="A1B2C3"
                      maxLength={6}
                      className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87] text-center text-2xl font-black tracking-widest"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleJoin}
                      disabled={submitting || joinCode.length !== 6}
                      className="flex-1 bg-[#00FF87] text-[#0A0E1A] py-3 rounded-xl font-bold disabled:opacity-50"
                    >
                      {submitting ? 'Joinen...' : 'Joinen'}
                    </button>
                    <button onClick={() => setModal('none')} className="flex-1 border border-[#1E2A45] text-white py-3 rounded-xl font-medium hover:border-[#00FF87]/30">
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
