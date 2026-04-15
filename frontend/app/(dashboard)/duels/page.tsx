'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Trophy, Clock, XCircle, Send, ChevronRight, Shield, Zap, Target, Flame } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────

type DuelStatus = 'PENDING' | 'ACCEPTED' | 'LIVE' | 'COMPLETED' | 'DECLINED'

interface Duel {
  id: string
  status: DuelStatus
  stake: number
  gameweek_id: number
  message?: string
  created_at: string
  i_am: 'challenger' | 'opponent'
  my_tactic: string
  opponent_tactic: string
  my_points: number
  opponent_points: number
  winner_id: string | null
  i_won: boolean
  me: { id: string; username: string; tier: string }
  opponent: { id: string; username: string; tier: string }
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_DUELS: Duel[] = [
  {
    id: '1',
    status: 'PENDING',
    stake: 50,
    gameweek_id: 28,
    message: 'Kom op dan 😏',
    created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    i_am: 'opponent',
    my_tactic: 'TIKI_TAKA',
    opponent_tactic: 'HIGH_PRESS',
    my_points: 0,
    opponent_points: 0,
    winner_id: null,
    i_won: false,
    me:       { id: '2', username: 'jij', tier: 'GOLD' },
    opponent: { id: '1', username: 'Xavi2023', tier: 'GOLD' },
  },
  {
    id: '2',
    status: 'COMPLETED',
    stake: 100,
    gameweek_id: 27,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    i_am: 'challenger',
    my_tactic: 'COUNTER_ATTACK',
    opponent_tactic: 'LOW_BLOCK',
    my_points: 87.5,
    opponent_points: 74.2,
    winner_id: 'me',
    i_won: true,
    me:       { id: '2', username: 'jij', tier: 'GOLD' },
    opponent: { id: '3', username: 'PepFan99', tier: 'SILVER' },
  },
  {
    id: '3',
    status: 'ACCEPTED',
    stake: 25,
    gameweek_id: 28,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    i_am: 'challenger',
    my_tactic: 'HIGH_PRESS',
    opponent_tactic: 'BALANCED',
    my_points: 0,
    opponent_points: 0,
    winner_id: null,
    i_won: false,
    me:       { id: '2', username: 'jij', tier: 'GOLD' },
    opponent: { id: '4', username: 'KloppIsGod', tier: 'BRONZE' },
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

const TACTIC_META: Record<string, { label: string; icon: string }> = {
  BALANCED:      { label: 'Gebalanceerd',  icon: '⚖️' },
  HIGH_PRESS:    { label: 'Hoog Druk',     icon: '🔥' },
  LOW_BLOCK:     { label: 'Laag Blok',     icon: '🛡️' },
  TIKI_TAKA:     { label: 'Tiki-Taka',     icon: '🎯' },
  COUNTER_ATTACK:{ label: 'Counteraanval', icon: '⚡' },
  LONG_BALL:     { label: 'Lange Bal',     icon: '🎪' },
}

function statusBadge(status: DuelStatus, iWon: boolean) {
  if (status === 'COMPLETED') return iWon
    ? <span className="text-[10px] font-black text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Gewonnen</span>
    : <span className="text-[10px] font-black text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">Verloren</span>
  if (status === 'PENDING')  return <span className="text-[10px] font-black text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full">Wacht op reactie</span>
  if (status === 'ACCEPTED') return <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">Geaccepteerd</span>
  if (status === 'LIVE')     return <span className="text-[10px] font-black text-[#00FF87] bg-[#00FF87]/10 px-2 py-0.5 rounded-full animate-pulse">Live</span>
  if (status === 'DECLINED') return <span className="text-[10px] font-black text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">Geweigerd</span>
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m geleden`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}u geleden`
  return `${Math.floor(hrs / 24)}d geleden`
}

// ── DuelCard ──────────────────────────────────────────────────────────────────

function DuelCard({ duel, onAccept, onDecline }: { duel: Duel; onAccept: (id: string) => void; onDecline: (id: string) => void }) {
  const myMeta = TACTIC_META[duel.my_tactic] ?? TACTIC_META.BALANCED
  const oppMeta = TACTIC_META[duel.opponent_tactic] ?? TACTIC_META.BALANCED

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-[#111827] border rounded-2xl p-4 ${
        duel.status === 'COMPLETED' && duel.i_won ? 'border-green-400/30' :
        duel.status === 'COMPLETED' && !duel.i_won ? 'border-red-400/20' :
        duel.status === 'PENDING' && duel.i_am === 'opponent' ? 'border-orange-400/40' :
        'border-[#1E2A45]'
      }`}
    >
      {/* Top: status + stake */}
      <div className="flex items-center justify-between mb-4">
        {statusBadge(duel.status, duel.i_won)}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          {timeAgo(duel.created_at)}
          {duel.stake > 0 && (
            <span className="ml-2 font-bold text-[#00FF87]">💰 {duel.stake} cr inzet</span>
          )}
        </div>
      </div>

      {/* Versus row */}
      <div className="flex items-center gap-3">
        {/* Me */}
        <div className="flex-1 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#1E2A45] flex items-center justify-center text-lg mx-auto mb-1">
            {myMeta.icon}
          </div>
          <p className="text-xs font-bold truncate">{duel.me.username}</p>
          <p className="text-[10px] text-gray-500">{myMeta.label}</p>
          {duel.status === 'COMPLETED' && (
            <p className={`text-lg font-black mt-1 ${duel.i_won ? 'text-green-400' : 'text-white'}`}>
              {duel.my_points.toFixed(1)}
            </p>
          )}
        </div>

        {/* VS */}
        <div className="text-center">
          <Swords className="w-5 h-5 text-gray-600 mx-auto" />
          <p className="text-[10px] text-gray-600 mt-1">GW{duel.gameweek_id}</p>
        </div>

        {/* Opponent */}
        <div className="flex-1 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#1E2A45] flex items-center justify-center text-lg mx-auto mb-1">
            {oppMeta.icon}
          </div>
          <p className="text-xs font-bold truncate">{duel.opponent.username}</p>
          <p className="text-[10px] text-gray-500">{oppMeta.label}</p>
          {duel.status === 'COMPLETED' && (
            <p className={`text-lg font-black mt-1 ${!duel.i_won ? 'text-red-400' : 'text-white'}`}>
              {duel.opponent_points.toFixed(1)}
            </p>
          )}
        </div>
      </div>

      {/* Message */}
      {duel.message && (
        <p className="text-xs text-gray-500 italic text-center mt-3 border-t border-[#1E2A45] pt-3">
          "{duel.message}"
        </p>
      )}

      {/* Actions for incoming pending duel */}
      {duel.status === 'PENDING' && duel.i_am === 'opponent' && (
        <div className="flex gap-2 mt-4">
          <Button onClick={() => onAccept(duel.id)} className="flex-1 text-sm py-2">
            Accepteren
          </Button>
          <button
            onClick={() => onDecline(duel.id)}
            className="flex-1 border border-red-500/30 text-red-400 py-2 rounded-xl text-sm hover:bg-red-500/10 transition-colors"
          >
            Weigeren
          </button>
        </div>
      )}
    </motion.div>
  )
}

// ── Challenge form ────────────────────────────────────────────────────────────

function ChallengeForm({ onSend }: { onSend: (data: { username: string; stake: number; message: string }) => void }) {
  const [username, setUsername] = useState('')
  const [stake, setStake] = useState(0)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) { toast.error('Voer een gebruikersnaam in'); return }
    setSending(true)
    await new Promise(r => setTimeout(r, 600))
    onSend({ username: username.trim(), stake, message })
    setUsername(''); setStake(0); setMessage('')
    setSending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Gebruikersnaam tegenstander</label>
        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="bijv. Xavi2023"
          className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87]/50"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Inzet (credits, optioneel)</label>
        <div className="flex gap-2">
          {[0, 10, 25, 50, 100].map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setStake(v)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${stake === v ? 'bg-[#00FF87] text-black' : 'bg-[#0A0E1A] border border-[#1E2A45] text-gray-400 hover:border-[#00FF87]/30'}`}
            >
              {v === 0 ? 'Gratis' : `${v} cr`}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Bericht (optioneel)</label>
        <input
          value={message}
          onChange={e => setMessage(e.target.value.slice(0, 140))}
          placeholder="Iets zeggen?"
          className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87]/50"
        />
      </div>
      <Button type="submit" isLoading={sending} className="w-full">
        <Send className="w-4 h-4 mr-2" />
        Uitdaging sturen
      </Button>
    </form>
  )
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({ duels }: { duels: Duel[] }) {
  const completed = duels.filter(d => d.status === 'COMPLETED')
  const wins   = completed.filter(d => d.i_won).length
  const losses = completed.filter(d => !d.i_won).length
  const earned = completed.filter(d => d.i_won).reduce((s, d) => s + d.stake, 0)

  return (
    <div className="grid grid-cols-4 gap-3">
      {[
        { icon: <Trophy className="w-4 h-4" />, val: wins,           lbl: 'Gewonnen',  color: 'text-green-400' },
        { icon: <XCircle className="w-4 h-4" />,val: losses,         lbl: 'Verloren',  color: 'text-red-400' },
        { icon: <Swords className="w-4 h-4" />, val: completed.length,lbl: 'Gespeeld', color: 'text-white' },
        { icon: <Zap className="w-4 h-4" />,    val: `${earned} cr`, lbl: 'Verdiend',  color: 'text-[#00FF87]' },
      ].map((s, i) => (
        <div key={i} className="bg-[#111827] border border-[#1E2A45] rounded-xl p-3 text-center">
          <div className={`${s.color} flex justify-center mb-1`}>{s.icon}</div>
          <p className={`font-black text-lg ${s.color}`}>{s.val}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">{s.lbl}</p>
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DuelsPage() {
  const [duels, setDuels] = useState<Duel[]>(MOCK_DUELS)
  const [showChallenge, setShowChallenge] = useState(false)
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all')

  const handleSend = (data: { username: string; stake: number; message: string }) => {
    toast.success(`Uitdaging gestuurd naar ${data.username}!`)
    setShowChallenge(false)
  }

  const handleAccept = (id: string) => {
    setDuels(prev => prev.map(d => d.id === id ? { ...d, status: 'ACCEPTED' as DuelStatus } : d))
    toast.success('Duel geaccepteerd! De strijd begint.')
  }

  const handleDecline = (id: string) => {
    setDuels(prev => prev.map(d => d.id === id ? { ...d, status: 'DECLINED' as DuelStatus } : d))
    toast('Duel geweigerd.')
  }

  const filtered = duels.filter(d =>
    filter === 'all'  ? true :
    filter === 'open' ? ['PENDING', 'ACCEPTED', 'LIVE'].includes(d.status) :
                        d.status === 'COMPLETED'
  )

  const incoming = duels.filter(d => d.status === 'PENDING' && d.i_am === 'opponent')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Swords className="w-6 h-6 text-[#00FF87]" />
            Manager Duels
          </h1>
          <p className="text-gray-400 text-sm mt-1">Daag andere managers uit. Jouw tactiek bepaalt alles.</p>
        </div>
        <Button onClick={() => setShowChallenge(v => !v)}>
          {showChallenge ? 'Annuleren' : '+ Uitdagen'}
        </Button>
      </div>

      {/* Incoming challenge banner */}
      {incoming.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-orange-400/10 border border-orange-400/40 rounded-2xl p-4 flex items-center gap-3"
        >
          <Flame className="w-5 h-5 text-orange-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-orange-400">{incoming.length} uitdaging{incoming.length > 1 ? 'en' : ''} wacht op jou!</p>
            <p className="text-xs text-gray-400">Scroll naar beneden om te reageren</p>
          </div>
        </motion.div>
      )}

      {/* Challenge form */}
      <AnimatePresence>
        {showChallenge && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-5">
              <h2 className="font-bold mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-[#00FF87]" />
                Nieuwe uitdaging
              </h2>
              <ChallengeForm onSend={handleSend} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <StatsBar duels={duels} />

      {/* How it works */}
      <Card className="p-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Hoe werkt het?</p>
        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          {[
            { icon: '⚔️', title: 'Daag uit', desc: 'Kies een tegenstander en stel een inzet in' },
            { icon: '🎯', title: 'Tactiek bepaalt alles', desc: 'Jouw tactiekstijl geeft jouw spelers multiplicatoren' },
            { icon: '🏆', title: 'Hoogste punten wint', desc: 'Zelfde echte wedstrijden, andere tactische uitkomst' },
          ].map((s, i) => (
            <div key={i} className="bg-[#0A0E1A] rounded-xl p-3">
              <div className="text-2xl mb-1">{s.icon}</div>
              <p className="font-bold text-white mb-1">{s.title}</p>
              <p className="text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'open', 'done'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filter === f ? 'bg-[#00FF87] text-black' : 'bg-[#111827] border border-[#1E2A45] text-gray-400 hover:text-white'}`}
          >
            {f === 'all' ? 'Alle' : f === 'open' ? 'Open' : 'Afgerond'}
          </button>
        ))}
      </div>

      {/* Duel list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Swords className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Geen duels gevonden</p>
            <p className="text-sm mt-1">Daag iemand uit om te beginnen</p>
          </div>
        ) : (
          filtered.map(duel => (
            <DuelCard key={duel.id} duel={duel} onAccept={handleAccept} onDecline={handleDecline} />
          ))
        )}
      </div>
    </div>
  )
}
