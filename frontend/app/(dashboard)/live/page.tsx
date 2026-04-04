'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useLive } from '@/hooks/useLive'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { MatchCard } from '@/components/live/MatchCard'
import { EventFeed } from '@/components/live/EventFeed'
import { LivePoints } from '@/components/live/LivePoints'
import { LiveLeaderboard } from '@/components/live/LiveLeaderboard'
import { Card } from '@/components/ui/Card'
import { mockMatches, mockMatchEvents, mockLeaderboard } from '@/lib/mockData'
import { Match } from '@/types'
import { Zap, Radio, Trophy } from 'lucide-react'

export default function LivePage() {
  const { matches: liveMatches, livePoints } = useLive()
  const { data: leaderboard } = useLeaderboard()
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)

  const allMatches = liveMatches.length > 0 ? liveMatches : mockMatches
  const liveMatchesList = allMatches.filter(m => m.status === 'live' || m.status === 'half_time')
  const upcomingMatches = allMatches.filter(m => m.status === 'scheduled')
  const finishedMatches = allMatches.filter(m => m.status === 'finished')

  const displayedMatch = selectedMatch ?? liveMatchesList[0]
  const matchEvents = displayedMatch ? (mockMatchEvents[displayedMatch.id] ?? []) : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Live Wedstrijden</h1>
          <p className="text-gray-400 text-sm mt-1">Speelronde 28 · {liveMatchesList.length} wedstrijden live</p>
        </div>
        {liveMatchesList.length > 0 && (
          <div className="flex items-center gap-2 bg-[#00FF87]/10 border border-[#00FF87]/20 rounded-full px-3 py-1">
            <span className="w-2 h-2 bg-[#00FF87] rounded-full animate-pulse" />
            <span className="text-[#00FF87] text-sm font-semibold">{liveMatchesList.length} LIVE</span>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Matches list */}
        <div className="lg:col-span-1 space-y-4">
          {/* Live now */}
          {liveMatchesList.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Radio className="w-4 h-4 text-[#00FF87]" />
                <span className="text-sm font-semibold text-[#00FF87]">Live nu</span>
              </div>
              <div className="space-y-2">
                {liveMatchesList.map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    isExpanded={displayedMatch?.id === match.id}
                    onClick={() => setSelectedMatch(match)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcomingMatches.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-400 mb-2">Aankomend</p>
              <div className="space-y-2">
                {upcomingMatches.map(match => (
                  <MatchCard key={match.id} match={match} onClick={() => setSelectedMatch(match)} />
                ))}
              </div>
            </div>
          )}

          {/* Finished */}
          {finishedMatches.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-400 mb-2">Afgelopen</p>
              <div className="space-y-2">
                {finishedMatches.map(match => (
                  <MatchCard key={match.id} match={match} onClick={() => setSelectedMatch(match)} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center: Events */}
        <div className="lg:col-span-1 space-y-4">
          {/* Live points */}
          <LivePoints
            points={livePoints || 47}
            rank={23}
            prizeEstimate={169}
          />

          {/* Events */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-[#FFD700]" />
              <h2 className="font-bold">Match Events</h2>
              {displayedMatch && <span className="text-xs text-gray-500">({displayedMatch.home_team} vs {displayedMatch.away_team})</span>}
            </div>
            <EventFeed events={matchEvents} />
          </Card>
        </div>

        {/* Right: Leaderboard */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-[#FFD700]" />
              <h2 className="font-bold">Live Ranglijst</h2>
            </div>
            <LiveLeaderboard
              entries={leaderboard?.entries ?? mockLeaderboard}
            />
          </Card>

          {/* My players in this match */}
          {displayedMatch && displayedMatch.my_players_in_match.length > 0 && (
            <Card className="p-4">
              <h2 className="font-bold mb-3 text-sm">Mijn Spelers ({displayedMatch.my_players_in_match.length})</h2>
              <div className="space-y-2">
                {displayedMatch.my_players_in_match.slice(0, 5).map(playerId => (
                  <div key={playerId} className="flex items-center justify-between bg-[#0A0E1A] rounded-lg px-3 py-2">
                    <span className="text-sm">Speler {playerId}</span>
                    <span className="text-xs text-[#00FF87]">+6 pt</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
