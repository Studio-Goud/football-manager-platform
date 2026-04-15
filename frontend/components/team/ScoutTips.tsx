'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, TrendingUp, ChevronRight } from 'lucide-react'
import { Player } from '@/types'
import { getScoutTips, calcValueScore, isHotPlayer } from '@/lib/playerValue'
import { PlayerDetailModal } from '@/components/player/PlayerDetailModal'

const POSITION_COLORS: Record<string, string> = {
  GK:  'bg-yellow-500/20 text-yellow-400',
  DEF: 'bg-blue-500/20 text-blue-400',
  MID: 'bg-green-500/20 text-green-400',
  FWD: 'bg-red-500/20 text-red-400',
}

interface ScoutTipsProps {
  players: Player[]
  onAddPlayer?: (player: Player) => void
}

export function ScoutTips({ players, onAddPlayer }: ScoutTipsProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const tips = getScoutTips(players, 5)

  if (tips.length === 0) return null

  return (
    <>
      <div className="bg-[#0F1629] border border-[#1E2A45] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-[#00FF87]/10 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-[#00FF87]" />
          </div>
          <div>
            <h3 className="font-black text-sm">Scout Tips</h3>
            <p className="text-xs text-gray-500">Beste waarde deze week</p>
          </div>
        </div>

        <div className="space-y-2">
          {tips.map((player, i) => {
            const hot = isHotPlayer(player)
            const value = calcValueScore(player).toFixed(1)

            return (
              <motion.button
                key={player.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedPlayer(player)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#0A0E1A] hover:bg-[#162040] transition-colors text-left group"
              >
                {/* Rank */}
                <span className="text-xs text-gray-600 font-bold w-4">#{i + 1}</span>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl bg-[#1E2A45] flex items-center justify-center text-xs font-black text-gray-400 flex-shrink-0">
                  {player.name.split(' ').slice(-1)[0].slice(0, 3)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold truncate">{player.name}</span>
                    {hot && <Zap className="w-3 h-3 text-[#F59E0B] flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${POSITION_COLORS[player.position] ?? ''}`}>
                      {player.position}
                    </span>
                    <span className="text-[10px] text-gray-500 truncate">{player.club}</span>
                  </div>
                </div>

                {/* Value + price */}
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black text-[#00FF87]">{value}</p>
                  <p className="text-[10px] text-gray-500">{Number(player.price).toFixed(0)} cr</p>
                </div>

                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
              </motion.button>
            )
          })}
        </div>
      </div>

      <PlayerDetailModal
        player={selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        onAddToTeam={onAddPlayer}
        showAddButton={!!onAddPlayer}
      />
    </>
  )
}
