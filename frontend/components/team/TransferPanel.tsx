'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Player, PlayerPosition } from '@/types'
import { Search, X } from 'lucide-react'
import { PlayerCard } from './PlayerCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { PlayerDetailModal } from '@/components/player/PlayerDetailModal'
import api from '@/lib/api'
import { PlayerCompareModal } from '@/components/player/PlayerCompareModal'

interface TransferPanelProps {
  onSelectPlayer: (player: Player) => void
  excludeIds?: (string | number)[]
  budget?: number
  defaultPosition?: PlayerPosition | 'ALL'
}

const positions: { label: string; value: PlayerPosition | 'ALL' }[] = [
  { label: 'Alle', value: 'ALL' },
  { label: 'GK', value: 'GK' },
  { label: 'DEF', value: 'DEF' },
  { label: 'MID', value: 'MID' },
  { label: 'FWD', value: 'FWD' },
]

export function TransferPanel({ onSelectPlayer, excludeIds = [], budget = 100, defaultPosition = 'ALL' }: TransferPanelProps) {
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState<PlayerPosition | 'ALL'>(defaultPosition)
  const [maxPrice, setMaxPrice] = useState(20)
  const [sortBy, setSortBy] = useState<'price' | 'form' | 'points'>('form')
  const [leagueId, setLeagueId] = useState<number | null>(null)
  const [detailPlayer, setDetailPlayer] = useState<Player | null>(null)
  const [comparePlayer, setComparePlayer] = useState<Player | null>(null)

  const { data: leagues } = useQuery({
    queryKey: ['player-leagues'],
    queryFn: async () => {
      const res = await api.get('/players/leagues')
      return res.data.data as { id: number; name: string; country: string }[]
    },
    staleTime: 300000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['players', position, maxPrice, sortBy, search, leagueId],
    queryFn: async () => {
      const params: Record<string, string> = {
        per_page: '50',
        sort: sortBy === 'points' ? 'points' : sortBy,
        max_price: String(maxPrice),
      }
      if (position !== 'ALL') params.position = position
      if (search) params.search = search
      if (leagueId) params.league_id = String(leagueId)
      const res = await api.get('/players', { params })
      return (res.data.data as (Player & { price_change?: number })[]).map(p => ({
        ...p,
        price_change_week: p.price_change ?? p.price_change_week ?? 0,
      })) as Player[]
    },
    staleTime: 30000,
  })

  const players = (data ?? [])
    .filter(p => !excludeIds.map(String).includes(String(p.id)))
    .filter(p => p.price <= budget)

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Zoek speler of club..."
          className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87]"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Position filter */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {positions.map(pos => (
          <button
            key={pos.value}
            onClick={() => setPosition(pos.value)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex-shrink-0 transition-colors ${
              position === pos.value ? 'bg-[#00FF87] text-[#0A0E1A]' : 'bg-[#1E2A45] text-gray-400 hover:bg-[#2D3A55]'
            }`}
          >
            {pos.label}
          </button>
        ))}
      </div>

      {/* League filter */}
      {leagues && leagues.length > 1 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          <button
            onClick={() => setLeagueId(null)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex-shrink-0 transition-colors ${
              leagueId === null ? 'bg-[#00FF87] text-[#0A0E1A]' : 'bg-[#1E2A45] text-gray-400 hover:bg-[#2D3A55]'
            }`}
          >
            Alle liga&apos;s
          </button>
          {leagues.map(lg => (
            <button
              key={lg.id}
              onClick={() => setLeagueId(lg.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex-shrink-0 transition-colors ${
                leagueId === lg.id ? 'bg-[#00FF87] text-[#0A0E1A]' : 'bg-[#1E2A45] text-gray-400 hover:bg-[#2D3A55]'
              }`}
            >
              {lg.name}
            </button>
          ))}
        </div>
      )}

      {/* Sort + price filter */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">Max prijs: {maxPrice} cr</label>
          <input type="range" min={1} max={20} value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))}
            className="w-full accent-[#00FF87] h-1.5" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Sorteren</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as 'price' | 'form' | 'points')}
            className="bg-[#0A0E1A] border border-[#1E2A45] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#00FF87]">
            <option value="form">Form</option>
            <option value="points">Punten</option>
            <option value="price">Prijs</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))
        ) : players.length === 0 ? (
          <div className="text-center text-gray-500 py-8 text-sm">Geen spelers gevonden</div>
        ) : (
          players.map(player => (
            <div key={player.id} className="relative group">
              <PlayerCard
                player={player}
                compact
                onClick={() => onSelectPlayer(player)}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); setDetailPlayer(player) }}
                  className="text-[9px] text-gray-500 hover:text-[#00FF87] bg-[#0A0E1A] px-1.5 py-0.5 rounded"
                >
                  info
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setComparePlayer(player) }}
                  className="text-[9px] text-gray-500 hover:text-[#3B82F6] bg-[#0A0E1A] px-1.5 py-0.5 rounded"
                >
                  vs
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-3 border-t border-[#1E2A45] mt-2">
        <p className="text-xs text-gray-500 text-center">{players.length} spelers gevonden</p>
      </div>

      <PlayerDetailModal
        player={detailPlayer}
        onClose={() => setDetailPlayer(null)}
        onAddToTeam={onSelectPlayer}
        showAddButton
      />

      {comparePlayer && (
        <PlayerCompareModal
          initialPlayer={comparePlayer}
          onClose={() => setComparePlayer(null)}
          onSelectPlayer={onSelectPlayer}
        />
      )}
    </div>
  )
}
