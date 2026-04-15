'use client'

import { motion } from 'framer-motion'
import { Trophy, TrendingUp, Zap, ArrowUp, ArrowDown, Star, Users } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { useLive } from '@/hooks/useLive'
import { useTeam } from '@/hooks/useTeam'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { mockCurrentUser, mockMatches, mockLeaderboard } from '@/lib/mockData'
import Link from 'next/link'

const statCards = (user: typeof mockCurrentUser, livePoints: number, rank?: number, totalPoints?: number) => [
  { label: 'Huidige Rang', value: rank ? `#${rank}` : '—', icon: Trophy, color: '#FFD700', delta: 'Ranglijst', positive: true },
  { label: 'Totale Punten', value: totalPoints ? totalPoints.toLocaleString() : '—', icon: Star, color: '#00FF87', delta: 'Dit seizoen', positive: true },
  { label: 'GW Punten', value: String(livePoints), icon: Zap, color: '#3B82F6', delta: 'Speelronde', positive: true },
  { label: 'Coins', value: Number(user.balance_credits).toLocaleString(), icon: TrendingUp, color: '#9B59B6', delta: 'Saldo', positive: true },
]

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { livePoints, matches } = useLive()
  const { data: leaderboard } = useLeaderboard()
  const { team, isLoading: teamLoading } = useTeam()

  const currentUser = user ?? mockCurrentUser
  const liveMatch = matches.find(m => m.status === 'live') ?? mockMatches.find(m => m.status === 'live')
  const myRank = leaderboard?.entries?.find((e: { is_current_user?: boolean }) => e.is_current_user)?.rank

  const stats = statCards(currentUser, livePoints || (team?.gameweek_points ?? 0), myRank, team?.total_points)

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
            <h2 className="font-bold text-lg">
              {team ? team.name : 'Mijn Team'}
            </h2>
            <Link href="/team" className="text-[#00FF87] text-sm hover:underline">Bewerken →</Link>
          </div>
          {teamLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-[#0A0E1A] rounded-xl p-3 flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-[#1E2A45] flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-[#1E2A45] rounded w-3/4" />
                    <div className="h-2.5 bg-[#1E2A45] rounded w-1/2" />
                  </div>
                </div>
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
