'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Telescope, Flame, TrendingUp, Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { PlayerCompareModal } from '@/components/player/PlayerCompareModal'
import { Player } from '@/types'
import api from '@/lib/api'
import Link from 'next/link'

type Position = 'GK' | 'DEF' | 'MID' | 'FWD'

const POS_LABEL: Record<Position, string> = {
  GK: 'Doelwachter', DEF: 'Verdediger', MID: 'Middenvelder', FWD: 'Aanvaller',
}

const POS_COLOR: Record<Position, string> = {
  GK: '#FFD700', DEF: '#3B82F6', MID: '#00FF87', FWD: '#EF4444',
}

interface ValuePlayer {
  id: number
  name: string
  display_name: string
  club: string
  position: Position
  price: number
  form: number
  total_points: number
  photo_url?: string
  value_score: number
}

function ValueCard({ player, rank, onCompare }: { player: ValuePlayer; rank: number; onCompare: (p: Player) => void }) {
  const posColor = POS_COLOR[player.position]
  const isHot = player.form >= 7

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.06 }}
      className="bg-[#0A0E1A] border border-[#1E2A45] rounded-xl p-3 flex items-center gap-3 hover:border-[#00FF87]/30 transition-colors"
    >
      {/* Rank */}
      <span className="w-6 text-center text-xs font-black text-gray-600 flex-shrink-0">{rank + 1}</span>

      {/* Photo */}
      <div className="w-10 h-10 rounded-full bg-[#1E2A45] overflow-hidden flex-shrink-0 flex items-center justify-center">
        {player.photo_url ? (
          <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-gray-400">{player.name[0]}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm truncate">{player.display_name ?? player.name}</span>
          {isHot && <span className="text-[9px] text-orange-400 bg-orange-400/10 px-1 rounded flex-shrink-0">🔥</span>}
        </div>
        <span className="text-xs text-gray-500">{player.club}</span>
      </div>

      {/* Stats */}
      <div className="text-right flex-shrink-0 space-y-0.5">
        <p className="text-sm font-black" style={{ color: posColor }}>{player.price.toFixed(1)} cr</p>
        <p className="text-xs text-gray-500">form {player.form.toFixed(1)}</p>
      </div>

      {/* Compare button */}
      <button
        onClick={() => onCompare(player as unknown as Player)}
        className="text-xs text-gray-600 hover:text-[#3B82F6] flex-shrink-0 px-1.5 py-1 rounded hover:bg-[#1E2A45] transition-colors"
      >
        vs
      </button>
    </motion.div>
  )
}

export default function ScoutPage() {
  const [activePos, setActivePos] = useState<Position>('MID')
  const [comparePlayer, setComparePlayer] = useState<Player | null>(null)

  const { data: bestValue, isLoading } = useQuery({
    queryKey: ['best-value'],
    queryFn: async () => {
      const res = await api.get('/players/best-value')
      return res.data.data as Record<Position, ValuePlayer[]>
    },
    staleTime: 300000,
  })

  const { data: hotPlayers = [], isLoading: hotLoading } = useQuery({
    queryKey: ['hot-players'],
    queryFn: async () => {
      const res = await api.get('/players/hot')
      return res.data.data as ValuePlayer[]
    },
    staleTime: 60000,
  })

  const positions: Position[] = ['GK', 'DEF', 'MID', 'FWD']
  const activePlayers = bestValue?.[activePos] ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Telescope className="w-6 h-6 text-[#00FF87]" />
          Scout
        </h1>
        <p className="text-gray-400 text-sm mt-1">Beste waarde spelers per positie + topvorm picks</p>
      </div>

      {/* Hot this week */}
      <Card className="p-5">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          Hot deze week
          <span className="text-xs text-gray-500 font-normal ml-1">Hoogste form score</span>
        </h2>
        {hotLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="w-24 h-28 rounded-xl flex-shrink-0" />)}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {hotPlayers.slice(0, 8).map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex-shrink-0 w-24 bg-[#0A0E1A] border border-[#1E2A45] rounded-xl p-3 flex flex-col items-center gap-1.5 cursor-pointer hover:border-orange-400/30 transition-colors"
                onClick={() => setComparePlayer(p as unknown as Player)}
              >
                <div className="w-10 h-10 rounded-full bg-[#1E2A45] overflow-hidden flex items-center justify-center">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-gray-400">{p.name[0]}</span>
                  )}
                </div>
                <p className="text-xs font-bold text-center truncate w-full">{p.display_name ?? p.name}</p>
                <span className="text-xs font-black text-orange-400">
                  🔥 {p.form.toFixed(1)}
                </span>
                <span className="text-[10px] text-gray-500">{p.club}</span>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* Best value per position */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold flex items-center gap-2">
            <Star className="w-5 h-5 text-[#00FF87]" />
            Beste waarde
            <span className="text-xs text-gray-500 font-normal ml-1">Form ÷ prijs ratio</span>
          </h2>
          <Link href="/team" className="text-xs text-[#00FF87] hover:underline">Transfer →</Link>
        </div>

        {/* Position tabs */}
        <div className="flex gap-2 mb-4">
          {positions.map(pos => (
            <button
              key={pos}
              onClick={() => setActivePos(pos)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0"
              style={{
                background: activePos === pos ? `${POS_COLOR[pos]}20` : '#1E2A45',
                color: activePos === pos ? POS_COLOR[pos] : '#9CA3AF',
                border: `1px solid ${activePos === pos ? POS_COLOR[pos] + '40' : 'transparent'}`,
              }}
            >
              {pos}
              <span className="ml-1 text-gray-500 font-normal">{POS_LABEL[pos]}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : activePlayers.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">Geen data beschikbaar</p>
        ) : (
          <div className="space-y-2">
            {activePlayers.map((p, i) => (
              <ValueCard key={p.id} player={p} rank={i} onCompare={setComparePlayer} />
            ))}
          </div>
        )}

        {/* Value score explanation */}
        <div className="mt-4 p-3 bg-[#0A0E1A] rounded-xl">
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#00FF87]" />
            Waarde score = form ÷ prijs. Hogere score = meer punten per credit.
          </p>
        </div>
      </Card>

      {comparePlayer && (
        <PlayerCompareModal
          initialPlayer={comparePlayer}
          onClose={() => setComparePlayer(null)}
        />
      )}
    </div>
  )
}
