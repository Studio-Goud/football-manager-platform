'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Radio, Clock, Zap } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'

interface Fixture {
  fixture_id: number
  home_team: string
  home_logo?: string
  away_team: string
  away_logo?: string
  home_score?: number
  away_score?: number
  minute?: number
  status: string
  kickoff?: string
  league_id: number
  league_name: string
  league_flag: string
}

const STATUS_LIVE = new Set(['1H', '2H', 'ET', 'BT', 'P', 'LIVE'])
const STATUS_HT   = new Set(['HT'])
const STATUS_FT   = new Set(['FT', 'AET', 'PEN'])

function statusLabel(s: string, minute?: number) {
  if (STATUS_HT.has(s)) return 'HT'
  if (STATUS_FT.has(s)) return 'FT'
  if (STATUS_LIVE.has(s) && minute) return `${minute}'`
  return s
}

function MatchRow({ f }: { f: Fixture }) {
  const isLive = STATUS_LIVE.has(f.status) || STATUS_HT.has(f.status)
  const isFt   = STATUS_FT.has(f.status)
  const hasScore = f.home_score != null

  return (
    <div className="flex items-center gap-3 py-3 px-4 hover:bg-[#1E2A45]/30 transition-colors">
      {/* Status */}
      <div className="w-14 text-center flex-shrink-0">
        {isLive ? (
          <span className="text-xs font-black text-[#00FF87] flex items-center gap-1 justify-center">
            <span className="w-1.5 h-1.5 bg-[#00FF87] rounded-full animate-pulse" />
            {statusLabel(f.status, f.minute)}
          </span>
        ) : isFt ? (
          <span className="text-xs text-gray-500 font-medium">FT</span>
        ) : (
          <span className="text-xs text-gray-400">
            {f.kickoff ? new Date(f.kickoff).toLocaleTimeString('nl', { hour: '2-digit', minute: '2-digit' }) : '—'}
          </span>
        )}
      </div>

      {/* Home */}
      <div className="flex items-center gap-2 flex-1 justify-end">
        {f.home_logo && <img src={f.home_logo} alt="" className="w-5 h-5 object-contain" />}
        <span className="text-sm font-semibold text-right truncate max-w-[120px]">{f.home_team}</span>
      </div>

      {/* Score */}
      <div className="w-16 text-center flex-shrink-0">
        {hasScore ? (
          <span className={`text-lg font-black ${isLive ? 'text-[#00FF87]' : 'text-white'}`}>
            {f.home_score} – {f.away_score}
          </span>
        ) : (
          <span className="text-gray-500 text-sm">vs</span>
        )}
      </div>

      {/* Away */}
      <div className="flex items-center gap-2 flex-1">
        <span className="text-sm font-semibold truncate max-w-[120px]">{f.away_team}</span>
        {f.away_logo && <img src={f.away_logo} alt="" className="w-5 h-5 object-contain" />}
      </div>
    </div>
  )
}

function LeagueGroup({ group, isLive }: { group: { name: string; flag: string; matches: Fixture[] }; isLive?: boolean }) {
  const liveCount = group.matches.filter(m => STATUS_LIVE.has(m.status) || STATUS_HT.has(m.status)).length
  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[#1E2A45] flex items-center gap-2">
        <span className="text-base">{group.flag}</span>
        <span className="text-sm font-bold">{group.name}</span>
        {liveCount > 0 && (
          <span className="ml-auto text-xs text-[#00FF87] font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-[#00FF87] rounded-full animate-pulse" />
            {liveCount} live
          </span>
        )}
      </div>
      <div className="divide-y divide-[#1E2A45]/50">
        {group.matches.map(f => (
          <motion.div key={f.fixture_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <MatchRow f={f} />
          </motion.div>
        ))}
      </div>
    </Card>
  )
}

function groupByLeague(matches: Fixture[]) {
  const map = new Map<string, { name: string; flag: string; matches: Fixture[] }>()
  for (const m of matches) {
    if (!map.has(m.league_name)) map.set(m.league_name, { name: m.league_name, flag: m.league_flag, matches: [] })
    map.get(m.league_name)!.matches.push(m)
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.name.includes('Champions')) return -1
    if (b.name.includes('Champions')) return 1
    if (a.name.includes('Europa')) return -1
    if (b.name.includes('Europa')) return 1
    return a.name.localeCompare(b.name)
  })
}

interface MatchPerf {
  id: number
  goals: number
  assists: number
  yellow_cards: number
  red_cards: number
  minutes_played: number
  total_points: number
  is_captain: boolean
  is_vice_captain: boolean
  player: { id: number; name: string; display_name: string | null; position: string; club: string; photo_url: string | null }
  match: { home_team: string; away_team: string; home_score: number | null; away_score: number | null; status: string }
}

function MyPlayersWidget() {
  const { isAuthenticated } = useAuthStore()
  const { data: perfs = [], isLoading } = useQuery<MatchPerf[]>({
    queryKey: ['my-match-perfs'],
    queryFn: async () => {
      const res = await api.get('/teams/my/match-performances')
      return res.data.data
    },
    enabled: isAuthenticated,
    staleTime: 60000,
    refetchInterval: 60000,
  })

  if (!isAuthenticated || (perfs.length === 0 && !isLoading)) return null

  const recentMatchId = perfs[0]?.match
  if (!recentMatchId) return null

  // Get unique players from most recent match data
  const playerMap = new Map<number, MatchPerf>()
  for (const p of perfs) {
    if (!playerMap.has(p.player.id)) playerMap.set(p.player.id, p)
  }
  const players = Array.from(playerMap.values()).slice(0, 11)

  return (
    <Card className="p-5 border border-[#00FF87]/10">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-[#00FF87]" />
        <h2 className="font-bold text-sm">Mijn Spelers (laatste data)</h2>
        <span className="text-xs text-gray-500 ml-auto">{players.length} spelers</span>
      </div>
      {isLoading ? (
        <div className="flex gap-2 overflow-x-auto">
          {[1,2,3,4].map(i => <Skeleton key={i} className="w-16 h-20 flex-shrink-0 rounded-xl" />)}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {players.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="flex-shrink-0 w-18 flex flex-col items-center gap-1 bg-[#0A0E1A] rounded-xl p-2.5 min-w-[68px]"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-[#1E2A45] overflow-hidden flex items-center justify-center">
                  {p.player.photo_url
                    ? <img src={p.player.photo_url} alt={p.player.name} className="w-full h-full object-cover" />
                    : <span className="text-sm font-bold text-gray-400">{p.player.name[0]}</span>
                  }
                </div>
                {p.is_captain && <span className="absolute -top-1 -right-1 text-[9px] bg-[#FFD700] text-black font-black rounded-full w-4 h-4 flex items-center justify-center">C</span>}
                {p.is_vice_captain && <span className="absolute -top-1 -right-1 text-[9px] bg-blue-400 text-black font-black rounded-full w-4 h-4 flex items-center justify-center">V</span>}
              </div>
              <p className="text-[10px] font-semibold text-center truncate w-full">{p.player.display_name ?? p.player.name.split(' ').pop()}</p>
              <p className={`text-xs font-black ${p.total_points > 0 ? 'text-[#00FF87]' : 'text-gray-500'}`}>
                {p.total_points > 0 ? `+${p.total_points}` : '0'} pt
              </p>
              <div className="flex gap-0.5 text-[9px]">
                {p.goals > 0 && <span>⚽{p.goals}</span>}
                {p.assists > 0 && <span>🅰️{p.assists}</span>}
                {p.yellow_cards > 0 && <span>🟨</span>}
                {p.red_cards > 0 && <span>🟥</span>}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default function LivePage() {
  const { data: liveMatches = [], isLoading: loadingLive } = useQuery({
    queryKey: ['live-matches'],
    queryFn: async () => {
      const res = await api.get('/matches/live')
      return res.data.data as Fixture[]
    },
    refetchInterval: 60000,
  })

  const { data: todayMatches = [], isLoading: loadingToday } = useQuery({
    queryKey: ['today-matches'],
    queryFn: async () => {
      const res = await api.get('/matches/today')
      return res.data.data as Fixture[]
    },
    refetchInterval: 300000,
  })

  const liveGroups     = groupByLeague(liveMatches)
  const scheduledToday = todayMatches.filter(m => !STATUS_FT.has(m.status) && !STATUS_LIVE.has(m.status) && !STATUS_HT.has(m.status))
  const finishedToday  = todayMatches.filter(m => STATUS_FT.has(m.status))
  const scheduledGroups = groupByLeague(scheduledToday)
  const finishedGroups  = groupByLeague(finishedToday)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Radio className="w-5 h-5 text-red-400" />
        <div>
          <h1 className="text-2xl font-black">Live Scores</h1>
          <p className="text-gray-400 text-sm">
            Premier League · La Liga · Bundesliga · Serie A · Ligue 1 · Eredivisie · Champions League + meer
          </p>
        </div>
      </div>

      {/* My players widget */}
      <MyPlayersWidget />

      {/* Live nu */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <h2 className="font-bold text-red-400 uppercase text-sm tracking-wider">Nu Live</h2>
        </div>

        {loadingLive ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : liveGroups.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500 text-sm">Geen live wedstrijden op dit moment.</p>
            <p className="text-gray-600 text-xs mt-1">Bekijk hieronder de wedstrijden van vandaag.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {liveGroups.map(g => <LeagueGroup key={g.name} group={g} isLive />)}
          </div>
        )}
      </section>

      {/* Vandaag gepland */}
      {!loadingToday && scheduledGroups.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="font-bold text-gray-300 text-sm uppercase tracking-wider">Vandaag gepland</h2>
          </div>
          <div className="space-y-3">
            {scheduledGroups.map(g => <LeagueGroup key={g.name} group={g} />)}
          </div>
        </section>
      )}

      {/* Afgelopen vandaag */}
      {finishedGroups.length > 0 && (
        <section>
          <h2 className="font-bold text-gray-500 text-sm uppercase tracking-wider mb-3">Afgelopen</h2>
          <div className="space-y-3 opacity-70">
            {finishedGroups.map(g => <LeagueGroup key={g.name} group={g} />)}
          </div>
        </section>
      )}
    </div>
  )
}
