'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Radio, Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import api from '@/lib/api'

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
