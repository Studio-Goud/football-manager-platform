'use client'

import { motion } from 'framer-motion'
import { Trophy, TrendingUp, Zap, Calendar, ArrowUp, ArrowDown, Star } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useLive } from '@/hooks/useLive'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { mockCurrentUser, mockPlayers, mockMatches, mockLeaderboard } from '@/lib/mockData'
import { formatCredits } from '@/lib/utils'
import Link from 'next/link'

const statCards = (user: typeof mockCurrentUser, livePoints: number) => [
  { label: 'Huidige Rang', value: '#23', icon: Trophy, color: '#FFD700', delta: '+5', positive: true },
  { label: 'Totale Punten', value: '1.284', icon: Star, color: '#00FF87', delta: '+47 dit GW', positive: true },
  { label: 'Live Punten', value: String(livePoints), icon: Zap, color: '#3B82F6', delta: 'Live', positive: true },
  { label: 'Credits', value: formatCredits(user.balance_credits), icon: TrendingUp, color: '#9B59B6', delta: 'Saldo', positive: true },
]

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { livePoints, matches } = useLive()
  const { data: leaderboard } = useLeaderboard()

  const currentUser = user ?? mockCurrentUser
  const liveMatch = matches.find(m => m.status === 'live') ?? mockMatches.find(m => m.status === 'live')

  const stats = statCards(currentUser, livePoints || 47)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">
            Welkom terug, <span className="text-[#00FF87]">{currentUser.username}</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Speelronde 28 · Eredivisie 2024/25</p>
        </div>
        <Badge variant="default" className="hidden sm:flex">
          {currentUser.tier.toUpperCase()}
        </Badge>
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
              {liveMatch.home_team} {liveMatch.home_score}–{liveMatch.away_score} {liveMatch.away_team}
            </span>
            <span className="text-gray-400 text-sm">{liveMatch.minute}&apos;</span>
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
                <span className={`text-xs px-2 py-0.5 rounded-full ${stat.positive ? 'bg-[#00FF87]/10 text-[#00FF87]' : 'bg-red-500/10 text-red-400'}`}>
                  {stat.delta}
                </span>
              </div>
              <p className="text-2xl font-black">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* My team preview */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Mijn Team</h2>
            <Link href="/team" className="text-[#00FF87] text-sm hover:underline">Bewerken →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {mockPlayers.slice(0, 6).map((player) => (
              <div key={player.id} className="bg-[#0A0E1A] rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1E2A45] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {player.photo_url
                    ? <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    : <span className="text-xs font-bold text-gray-400">{player.name.charAt(0)}</span>
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{player.name}</p>
                  <p className="text-xs text-gray-500">{player.position} · {player.points_this_week}pt</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between bg-[#0A0E1A] rounded-xl p-3">
            <span className="text-sm text-gray-400">Teamwaarde</span>
            <span className="font-bold text-[#00FF87]">82.5 credits</span>
          </div>
        </Card>

        {/* Prize pool */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">Prijzenpot</h2>
            <span className="text-[#00FF87] font-black text-lg">€12.480</span>
          </div>
          <div className="space-y-3 text-sm">
            {[
              { label: '1e plaats', pct: '30%', amount: '€3.744' },
              { label: '2e plaats', pct: '20%', amount: '€2.496' },
              { label: '3e plaats', pct: '12%', amount: '€1.498' },
              { label: 'Top 10', pct: '38% verdeeld', amount: '€4.742' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-gray-400">{row.label}</span>
                <div className="text-right">
                  <span className="text-white font-medium">{row.amount}</span>
                  <span className="text-gray-600 text-xs ml-1">({row.pct})</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-[#1E2A45]">
            <p className="text-xs text-gray-500 mb-2">Mijn huidige prijs op rang #23</p>
            <ProgressBar value={23} max={100} color="#00FF87" />
            <p className="text-[#00FF87] font-bold mt-2">€169 (top 20%)</p>
          </div>
        </Card>
      </div>

      {/* Upcoming fixtures */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Aankomende Wedstrijden</h2>
          <Link href="/live" className="text-[#00FF87] text-sm hover:underline">Alle →</Link>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {mockMatches.slice(0, 3).map((match) => (
            <div key={match.id} className="bg-[#0A0E1A] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  match.status === 'live' ? 'bg-[#00FF87]/10 text-[#00FF87]' :
                  match.status === 'finished' ? 'bg-gray-700 text-gray-400' :
                  'bg-[#3B82F6]/10 text-[#3B82F6]'
                }`}>
                  {match.status === 'live' ? `${match.minute}'` : match.status === 'finished' ? 'Afgelopen' : 'Gepland'}
                </span>
                <span className="text-xs text-gray-500">{match.my_players_in_match.length} spelers</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{match.home_team}</span>
                <span className="text-sm font-black mx-2 text-[#00FF87]">{match.home_score}–{match.away_score}</span>
                <span className="text-sm font-medium truncate text-right">{match.away_team}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">{match.my_points_from_match} punten verdiend</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Mini leaderboard */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Ranglijst Top 5</h2>
          <Link href="/leaderboard" className="text-[#00FF87] text-sm hover:underline">Volledig →</Link>
        </div>
        <div className="space-y-2">
          {(leaderboard?.entries ?? mockLeaderboard).slice(0, 5).map((entry) => (
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
              <div className="text-right">
                <p className="text-[#00FF87] font-bold text-sm">€{entry.prize}</p>
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
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
