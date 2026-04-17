'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Target, Trophy, CheckCircle, Clock, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Avatar } from '@/components/ui/Avatar'
import toast from 'react-hot-toast'
import api from '@/lib/api'

interface UpcomingMatch {
  id: number
  home_team: string
  away_team: string
  kickoff: string
  status: string
  already_predicted: boolean
}

interface MyPrediction {
  id: number
  match_id: number
  home_goals: number
  away_goals: number
  top_scorer: string | null
  points: number
  scored: boolean
  match: {
    home_team: string
    away_team: string
    home_score: number | null
    away_score: number | null
    status: string
    kickoff: string
  }
}

interface LeaderboardEntry {
  rank: number
  user: { id: string; username: string; tier: string } | undefined
  total_points: number
  predictions: number
}

function PredictForm({ match, onDone }: { match: UpcomingMatch; onDone: () => void }) {
  const [homeGoals, setHomeGoals] = useState(1)
  const [awayGoals, setAwayGoals] = useState(1)
  const [topScorer, setTopScorer] = useState('')
  const qc = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.post('/predictions', {
      match_id: match.id,
      home_goals: homeGoals,
      away_goals: awayGoals,
      top_scorer: topScorer || undefined,
    }),
    onSuccess: () => {
      toast.success('Voorspelling opgeslagen!')
      qc.invalidateQueries({ queryKey: ['upcoming-matches'] })
      qc.invalidateQueries({ queryKey: ['my-predictions'] })
      onDone()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Opslaan mislukt')
    },
  })

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-3 pt-3 border-t border-[#1E2A45] space-y-3"
    >
      <div className="flex items-center gap-4 justify-center">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1.5">{match.home_team}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setHomeGoals(Math.max(0, homeGoals - 1))} className="w-8 h-8 rounded-lg bg-[#0A0E1A] text-white font-bold hover:bg-[#1E2A45]">−</button>
            <span className="text-2xl font-black w-8 text-center">{homeGoals}</span>
            <button onClick={() => setHomeGoals(homeGoals + 1)} className="w-8 h-8 rounded-lg bg-[#0A0E1A] text-white font-bold hover:bg-[#1E2A45]">+</button>
          </div>
        </div>
        <span className="text-gray-600 font-black text-xl mt-4">—</span>
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1.5">{match.away_team}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setAwayGoals(Math.max(0, awayGoals - 1))} className="w-8 h-8 rounded-lg bg-[#0A0E1A] text-white font-bold hover:bg-[#1E2A45]">−</button>
            <span className="text-2xl font-black w-8 text-center">{awayGoals}</span>
            <button onClick={() => setAwayGoals(awayGoals + 1)} className="w-8 h-8 rounded-lg bg-[#0A0E1A] text-white font-bold hover:bg-[#1E2A45]">+</button>
          </div>
        </div>
      </div>

      <input
        type="text"
        value={topScorer}
        onChange={e => setTopScorer(e.target.value)}
        placeholder="Topscorer (optioneel, +5 punten)"
        className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87]"
      />

      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 py-2 rounded-xl text-sm text-gray-400 bg-[#0A0E1A] border border-[#1E2A45] hover:border-gray-600">
          Annuleren
        </button>
        <button
          onClick={() => mutate()}
          disabled={isPending}
          className="flex-1 py-2 rounded-xl text-sm font-bold bg-[#00FF87] text-[#0A0E1A] hover:bg-[#00E077] disabled:opacity-50"
        >
          {isPending ? 'Opslaan...' : 'Voorspelling opslaan'}
        </button>
      </div>
    </motion.div>
  )
}

export default function PredictionsPage() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'my' | 'leaderboard'>('upcoming')
  const [openMatchId, setOpenMatchId] = useState<number | null>(null)

  const { data: upcoming = [], isLoading: upcomingLoading } = useQuery({
    queryKey: ['upcoming-matches'],
    queryFn: async () => {
      const res = await api.get('/predictions/upcoming')
      return res.data.data as UpcomingMatch[]
    },
    enabled: activeTab === 'upcoming',
    staleTime: 60000,
  })

  const { data: myPreds = [], isLoading: myLoading } = useQuery({
    queryKey: ['my-predictions'],
    queryFn: async () => {
      const res = await api.get('/predictions/my')
      return res.data.data as MyPrediction[]
    },
    enabled: activeTab === 'my',
    staleTime: 60000,
  })

  const { data: leaderboard = [], isLoading: lbLoading } = useQuery({
    queryKey: ['predictions-leaderboard'],
    queryFn: async () => {
      const res = await api.get('/predictions/leaderboard')
      return res.data.data as LeaderboardEntry[]
    },
    enabled: activeTab === 'leaderboard',
    staleTime: 120000,
  })

  const tabs = [
    { key: 'upcoming', label: 'Voorspellen' },
    { key: 'my', label: 'Mijn voorspellingen' },
    { key: 'leaderboard', label: 'Ranglijst' },
  ] as const

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Target className="w-6 h-6 text-[#00FF87]" />
          Voorspellen
        </h1>
        <p className="text-gray-400 text-sm mt-1">Voorspel wedstrijduitslagen en verzamel punten.</p>
        <p className="text-[10px] text-gray-600 mt-0.5">Coins zijn virtueel betaalmiddel en hebben geen geldwaarde.</p>
      </div>

      {/* Points explanation */}
      <Card className="p-4 flex gap-6 justify-center text-center text-xs text-gray-400">
        <div><span className="text-lg font-black text-[#00FF87]">8</span><br />Exacte uitslag</div>
        <div><span className="text-lg font-black text-white">3</span><br />Winnaar correct</div>
        <div><span className="text-lg font-black text-gray-300">1</span><br />Gelijkspel correct</div>
        <div><span className="text-lg font-black text-[#FFD700]">+5</span><br />Topscorer correct</div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0A0E1A] p-1 rounded-xl">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === t.key ? 'bg-[#1E2A45] text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'upcoming' && (
        <div className="space-y-3">
          {upcomingLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : upcoming.length === 0 ? (
            <Card className="p-8 text-center text-gray-500 text-sm">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Geen wedstrijden beschikbaar om te voorspellen
            </Card>
          ) : (
            upcoming.map((match, i) => (
              <motion.div key={match.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{match.home_team} vs {match.away_team}</p>
                      <p className="text-xs text-gray-500">{new Date(match.kickoff).toLocaleString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    {match.already_predicted ? (
                      <CheckCircle className="w-5 h-5 text-[#00FF87] flex-shrink-0" />
                    ) : (
                      <button
                        onClick={() => setOpenMatchId(openMatchId === match.id ? null : match.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#1E2A45] rounded-xl text-xs font-bold hover:bg-[#2D3A55] transition-colors flex-shrink-0"
                      >
                        Voorspel
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${openMatchId === match.id ? 'rotate-90' : ''}`} />
                      </button>
                    )}
                  </div>
                  {openMatchId === match.id && !match.already_predicted && (
                    <PredictForm match={match} onDone={() => setOpenMatchId(null)} />
                  )}
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}

      {activeTab === 'my' && (
        <div className="space-y-3">
          {myLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : myPreds.length === 0 ? (
            <Card className="p-8 text-center text-gray-500 text-sm">Nog geen voorspellingen</Card>
          ) : (
            myPreds.map((pred, i) => {
              const isFinished = pred.match.status === 'FT' || pred.scored
              return (
                <motion.div key={pred.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{pred.match.home_team} vs {pred.match.away_team}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Jouw: <span className="text-white font-bold">{pred.home_goals}–{pred.away_goals}</span>
                          {pred.top_scorer && <span className="ml-2">⚽ {pred.top_scorer}</span>}
                        </p>
                        {isFinished && pred.match.home_score != null && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Uitslag: <span className="text-[#00FF87] font-bold">{pred.match.home_score}–{pred.match.away_score}</span>
                          </p>
                        )}
                      </div>
                      {pred.scored ? (
                        <div className="text-right flex-shrink-0">
                          <p className={`text-xl font-black ${pred.points >= 8 ? 'text-[#00FF87]' : pred.points >= 3 ? 'text-white' : 'text-gray-500'}`}>
                            +{pred.points}
                          </p>
                          <p className="text-xs text-gray-500">punten</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600 flex-shrink-0 mt-1">Wachten...</span>
                      )}
                    </div>
                  </Card>
                </motion.div>
              )
            })
          )}
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-[#1E2A45] flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#FFD700]" />
            <h2 className="font-bold">Top voorspellers</h2>
          </div>
          {lbLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : (
            <div className="divide-y divide-[#1E2A45]">
              {leaderboard.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <span className={`w-7 h-7 flex items-center justify-center text-xs font-black rounded-lg flex-shrink-0 ${i === 0 ? 'bg-[#FFD700]/20 text-[#FFD700]' : i === 1 ? 'bg-[#C0C0C0]/20 text-[#C0C0C0]' : i === 2 ? 'bg-[#CD7F32]/20 text-[#CD7F32]' : 'text-gray-500'}`}>
                    {entry.rank}
                  </span>
                  <Avatar fallback={entry.user?.username ?? '?'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{entry.user?.username ?? '—'}</p>
                    <p className="text-xs text-gray-500">{entry.predictions} voorspellingen</p>
                  </div>
                  <span className="font-black text-[#00FF87]">{entry.total_points}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
