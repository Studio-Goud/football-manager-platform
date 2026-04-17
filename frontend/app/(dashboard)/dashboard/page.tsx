'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, TrendingUp, Zap, ArrowUp, ArrowDown, Star, Users, Calendar, Target, ChevronRight, BarChart2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useLive } from '@/hooks/useLive'
import { useTeam } from '@/hooks/useTeam'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import api from '@/lib/api'
import Link from 'next/link'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { RoundReportModal } from '@/components/team/RoundReportModal'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { livePoints, matches } = useLive()
  const { data: leaderboard } = useLeaderboard()
  const { team, isLoading: teamLoading } = useTeam()
  const [showRoundReport, setShowRoundReport] = useState(false)

  interface WeeklyChallenge {
    id: string; title: string; description: string; icon: string
    reward_coins: number; target: number; progress: number
    completed: boolean; claimed: boolean; claimable: boolean; week_end: string
  }
  const { data: challenge, refetch: refetchChallenge } = useQuery<WeeklyChallenge>({
    queryKey: ['weekly-challenge'],
    queryFn: async () => {
      const res = await api.get('/challenges/weekly')
      return res.data.data
    },
    staleTime: 300000,
  })

  const { data: pointsHistory = [] } = useQuery<{ gameweek: number; points: number; rank: number | null }[]>({
    queryKey: ['points-history'],
    queryFn: async () => {
      const res = await api.get('/teams/my/points-history')
      return res.data.data
    },
    staleTime: 300000,
  })

  interface UpcomingFixture {
    player_id: number
    player_name: string
    club: string
    position: string
    photo_url: string | null
    fixture: { home_team: string; away_team: string; kickoff: string; is_home: boolean } | null
  }
  const { data: upcomingFixtures = [] } = useQuery<UpcomingFixture[]>({
    queryKey: ['my-upcoming-fixtures'],
    queryFn: async () => {
      const res = await api.get('/teams/my/upcoming-fixtures')
      return res.data.data
    },
    staleTime: 300000,
    enabled: !!team,
  })

  const { data: todayFixtures = [] } = useQuery({
    queryKey: ['today-fixtures'],
    queryFn: async () => {
      const res = await api.get('/matches/today')
      return res.data.data as Array<{ fixture_id: string; home_team: string; away_team: string; kickoff_time: string; status: string; home_score?: number; away_score?: number }>
    },
    staleTime: 300000,
  })

  const myClubs = new Set((team?.players ?? []).map(tp => tp.player?.club).filter(Boolean))

  const liveMatch = matches.find(m => {
    const s = (m.status as string).toUpperCase()
    return s === 'LIVE' || s === '1H' || s === '2H' || s === 'HT'
  })
  const myRank = leaderboard?.entries?.find((e: { is_current_user?: boolean }) => e.is_current_user)?.rank

  const stats = [
    { label: 'Huidige Rang', value: myRank ? `#${myRank}` : '—', icon: Trophy, color: '#FFD700', delta: 'Ranglijst' },
    { label: 'Totale Punten', value: team?.total_points ? team.total_points.toLocaleString() : '—', icon: Star, color: '#00FF87', delta: 'Dit seizoen' },
    { label: 'GW Punten', value: String(livePoints || team?.gameweek_points || 0), icon: Zap, color: '#3B82F6', delta: 'Speelronde' },
    { label: 'Coins', value: user ? Number(user.balance_credits).toLocaleString() : '—', icon: TrendingUp, color: '#9B59B6', delta: 'Saldo' },
  ]

  return (
    <div className="space-y-6">
      {/* Round Report Modal */}
      <AnimatePresence>
        {showRoundReport && <RoundReportModal onClose={() => setShowRoundReport(false)} />}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">
            Welkom terug, <span className="text-[#00FF87]">{user?.username ?? '...'}</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {leaderboard?.gameweek ? `Speelronde ${leaderboard.gameweek}` : 'Speelronde —'}
            {' · Eredivisie 2024/25'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRoundReport(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1E2A45] rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-[#2D3A55] transition-colors"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">GW Rapport</span>
          </button>
          <Badge variant="default" className="hidden sm:flex">
            {(user?.tier ?? 'bronze').toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Live alert */}
      {liveMatch && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#00FF87]/10 border border-[#00FF87]/30 rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-[#00FF87] rounded-full animate-pulse" />
            <span className="font-semibold text-[#00FF87]">LIVE</span>
            <span className="text-white">
              {liveMatch.home_team} {liveMatch.home_score ?? 0}–{liveMatch.away_score ?? 0} {liveMatch.away_team}
            </span>
            {liveMatch.minute && <span className="text-gray-400 text-sm">{liveMatch.minute}&apos;</span>}
          </div>
          <Link href="/live" className="text-[#00FF87] text-sm font-medium hover:underline">
            Bekijk live →
          </Link>
        </motion.div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}20` }}>
                  <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#00FF87]/10 text-[#00FF87]">
                  {stat.delta}
                </span>
              </div>
              <p className="text-2xl font-black">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Rank climb motivator */}
      {myRank && myRank > 1 && leaderboard?.entries && (() => {
        const entries = leaderboard.entries
        const myEntry = entries.find((e: { is_current_user?: boolean; total_points: number }) => e.is_current_user)
        const aboveEntry = entries.find((e: { rank: number }) => e.rank === (myRank ?? 1) - 1) as { rank: number; user: { username: string }; total_points: number } | undefined
        if (!myEntry || !aboveEntry) return null
        const diff = aboveEntry.total_points - (myEntry as { total_points: number }).total_points
        return (
          <div className="bg-gradient-to-r from-[#00FF87]/5 to-transparent border border-[#00FF87]/15 rounded-xl p-4 flex items-center gap-4">
            <div className="text-2xl">🏃</div>
            <div className="flex-1">
              <p className="font-bold text-sm">Nog <span className="text-[#00FF87]">{diff} punten</span> voor rang #{myRank - 1}</p>
              <p className="text-xs text-gray-500 mt-0.5">Achtervolg {aboveEntry.user.username} ({aboveEntry.total_points} pt)</p>
            </div>
            <Link href="/leaderboard" className="text-xs text-[#00FF87] hover:underline flex-shrink-0">
              Ranglijst →
            </Link>
          </div>
        )
      })()}

      {/* Weekly Challenge */}
      {challenge && (
        <Card className={`p-5 border ${challenge.completed ? 'border-[#00FF87]/30 bg-[#00FF87]/3' : 'border-[#1E2A45]'}`}>
          <div className="flex items-start gap-4">
            <div className="text-3xl flex-shrink-0">{challenge.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-bold text-sm">Weekelijkse Challenge</h2>
                <span className="text-[10px] bg-[#3B82F6]/10 text-blue-400 px-2 py-0.5 rounded-full font-bold">WEEK</span>
              </div>
              <p className="font-black">{challenge.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{challenge.description}</p>

              {/* Progress bar */}
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Voortgang</span>
                  <span className={challenge.completed ? 'text-[#00FF87]' : 'text-gray-400'}>
                    {challenge.progress}/{challenge.target}
                  </span>
                </div>
                <div className="h-2 bg-[#1E2A45] rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${challenge.completed ? 'bg-[#00FF87]' : 'bg-blue-400'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((challenge.progress / challenge.target) * 100, 100)}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[#00FF87] font-black">+{challenge.reward_coins}</p>
              <p className="text-[10px] text-gray-500">coins</p>
              {challenge.claimable && (
                <button
                  onClick={async () => {
                    await api.post('/challenges/weekly/claim')
                    refetchChallenge()
                  }}
                  className="mt-2 px-3 py-1.5 bg-[#00FF87] text-[#0A0E1A] rounded-lg text-xs font-black hover:bg-[#00CC6A] transition-colors"
                >
                  Claim!
                </button>
              )}
              {challenge.claimed && <p className="text-[10px] text-[#00FF87] mt-1">✓ Geclaimd</p>}
            </div>
          </div>
        </Card>
      )}

      {/* Points history chart */}
      {pointsHistory.length > 1 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00FF87]" />
              Punten per speelronde
            </h2>
            <span className="text-xs text-gray-500">Laatste {pointsHistory.length} rondes</span>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={pointsHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="pointsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF87" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00FF87" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="gameweek" tick={{ fontSize: 10, fill: '#6B7280' }} tickFormatter={v => `GW${v}`} />
              <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
              <Tooltip
                contentStyle={{ background: '#0F1629', border: '1px solid #1E2A45', borderRadius: '8px', fontSize: '12px' }}
                formatter={(v: number) => [`${v} pt`, 'Punten']}
                labelFormatter={l => `Speelronde ${l}`}
              />
              <Area type="monotone" dataKey="points" stroke="#00FF87" strokeWidth={2} fill="url(#pointsGradient)" dot={{ fill: '#00FF87', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Upcoming fixtures for my players */}
      {upcomingFixtures.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#3B82F6]" />
              Komende Wedstrijden
            </h2>
            <span className="text-xs text-gray-500">Jouw spelers</span>
          </div>
          <div className="overflow-x-auto -mx-5 px-5">
            <div className="flex gap-3 pb-1" style={{ minWidth: 'max-content' }}>
              {upcomingFixtures.filter(f => f.fixture).map(f => {
                const fixture = f.fixture!
                const opponent = fixture.is_home ? fixture.away_team : fixture.home_team
                const kickoff = new Date(fixture.kickoff)
                const posColor = f.position === 'GK' ? '#9B59B6' : f.position === 'DEF' ? '#3B82F6' : f.position === 'MID' ? '#00FF87' : '#F59E0B'
                return (
                  <div key={f.player_id} className="flex-shrink-0 bg-[#0A0E1A] border border-[#1E2A45] rounded-xl p-3 w-36 text-center">
                    <div className="w-10 h-10 rounded-full bg-[#1E2A45] flex items-center justify-center overflow-hidden mx-auto mb-2">
                      {f.photo_url
                        ? <img src={f.photo_url} alt={f.player_name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        : <span className="text-xs font-black" style={{ color: posColor }}>{f.position}</span>
                      }
                    </div>
                    <p className="text-xs font-bold truncate">{f.player_name?.split(' ').pop()}</p>
                    <p className="text-[10px] text-gray-500 mb-2">{f.club}</p>
                    <div className="bg-[#1E2A45] rounded-lg px-2 py-1.5">
                      <p className="text-[10px] font-black">
                        {fixture.is_home ? '🏠' : '✈️'} {opponent.length > 10 ? opponent.slice(0, 8) + '…' : opponent}
                      </p>
                      <p className="text-[9px] text-gray-500 mt-0.5">
                        {kickoff.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* My team preview */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">
              {team ? team.name : 'Mijn Team'}
            </h2>
            <Link href="/team" className="text-[#00FF87] text-sm hover:underline">Bewerken →</Link>
          </div>
          {teamLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : team && team.players.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {team.players.slice(0, 6).map((tp) => {
                const player = tp.player
                if (!player) return null
                return (
                  <div key={tp.player_id} className="bg-[#0A0E1A] rounded-xl p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1E2A45] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {player.photo_url
                        ? <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        : <span className="text-xs font-bold text-gray-400">{player.name.charAt(0)}</span>
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{player.name}</p>
                      <p className="text-xs text-gray-500">{player.position} · {Number(player.total_points)}pt</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="w-10 h-10 text-gray-600 mb-3" />
              <p className="text-gray-500 text-sm mb-3">Je hebt nog geen team</p>
              <Link href="/team" className="bg-[#00FF87] text-[#0A0E1A] px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#00CC6A] transition-colors">
                Team aanmaken
              </Link>
            </div>
          )}
          {team && (
            <div className="mt-4 flex items-center justify-between bg-[#0A0E1A] rounded-xl p-3">
              <span className="text-sm text-gray-400">Teamwaarde</span>
              <span className="font-bold text-[#00FF87]">
                {team.players.reduce((sum, tp) => sum + (tp.player?.price ?? 0), 0).toFixed(1)} cr
              </span>
            </div>
          )}
        </Card>

        {/* Quick actions */}
        <Card className="p-5">
          <h2 className="font-bold text-lg mb-4">Snel starten</h2>
          <div className="space-y-3">
            {[
              { href: '/leagues',     label: 'Vrienden uitdagen',  sub: 'Privé competitie aanmaken', color: '#00FF87',  icon: '🏆' },
              { href: '/duels',       label: 'Duel starten',       sub: 'Head-to-head tegen een vriend', color: '#3B82F6', icon: '⚔️' },
              { href: '/marketplace', label: 'Transfermarkt',      sub: 'Spelers kopen & verkopen',  color: '#8B5CF6',  icon: '🛒' },
              { href: '/team',        label: 'Team beheren',       sub: 'Opstelling & tactiek',       color: '#F59E0B',  icon: '👥' },
            ].map(action => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 p-3 rounded-xl bg-[#0A0E1A] hover:bg-[#162040] transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${action.color}15` }}>
                  {action.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{action.label}</p>
                  <p className="text-xs text-gray-500">{action.sub}</p>
                </div>
                <ArrowUp className="w-4 h-4 text-gray-600 group-hover:text-gray-400 rotate-90 transition-colors" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Today's fixtures */}
      {todayFixtures.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#3B82F6]" />
              Wedstrijden vandaag
            </h2>
            <Link href="/live" className="text-[#00FF87] text-sm hover:underline">Live →</Link>
          </div>
          <div className="space-y-2">
            {todayFixtures.slice(0, 5).map((f) => {
              const hasMyPlayer = myClubs.has(f.home_team) || myClubs.has(f.away_team)
              const isLive = ['LIVE', '1H', '2H', 'HT'].includes((f.status ?? '').toUpperCase())
              const kickoff = f.kickoff_time ? new Date(f.kickoff_time).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : ''
              return (
                <div
                  key={f.fixture_id}
                  className={`flex items-center gap-3 p-3 rounded-xl ${hasMyPlayer ? 'bg-[#00FF87]/5 border border-[#00FF87]/20' : 'bg-[#0A0E1A]'}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{f.home_team}</span>
                      <span className="text-gray-600 text-xs">vs</span>
                      <span className="text-sm font-semibold">{f.away_team}</span>
                    </div>
                    {hasMyPlayer && <span className="text-xs text-[#00FF87]">⚡ Jouw speler speelt</span>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {isLive ? (
                      <span className="text-xs text-[#00FF87] font-bold animate-pulse">LIVE {f.home_score}–{f.away_score}</span>
                    ) : (
                      <span className="text-xs text-gray-400">{kickoff}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Mini leaderboard */}
      {leaderboard?.entries && leaderboard.entries.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Ranglijst Top 5</h2>
            <Link href="/leaderboard" className="text-[#00FF87] text-sm hover:underline">Volledig →</Link>
          </div>
          <div className="space-y-2">
            {leaderboard.entries.slice(0, 5).map((entry: {
              rank: number
              is_current_user?: boolean
              user: { username: string }
              total_points: number
              prize?: number
              previous_rank?: number
            }) => (
              <div key={entry.rank} className={`flex items-center gap-3 p-3 rounded-xl ${entry.is_current_user ? 'bg-[#00FF87]/10 border border-[#00FF87]/20' : 'bg-[#0A0E1A]'}`}>
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                  entry.rank === 1 ? 'bg-[#FFD700]/20 text-[#FFD700]' :
                  entry.rank === 2 ? 'bg-[#C0C0C0]/20 text-[#C0C0C0]' :
                  entry.rank === 3 ? 'bg-[#CD7F32]/20 text-[#CD7F32]' : 'bg-[#1E2A45] text-gray-400'
                }`}>
                  {entry.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{entry.user.username}</p>
                  <p className="text-xs text-gray-500">{entry.total_points} pt</p>
                </div>
                {entry.previous_rank != null && (
                  <div className="flex items-center gap-1 justify-end">
                    {entry.previous_rank > entry.rank
                      ? <ArrowUp className="w-3 h-3 text-[#00FF87]" />
                      : entry.previous_rank < entry.rank
                      ? <ArrowDown className="w-3 h-3 text-red-400" />
                      : null
                    }
                    <span className="text-xs text-gray-600">
                      {Math.abs(entry.previous_rank - entry.rank)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
