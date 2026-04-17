'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, ArrowLeftRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Player } from '@/types'
import { Skeleton } from '@/components/ui/Skeleton'
import api from '@/lib/api'

interface Props {
  initialPlayer?: Player | null
  onClose: () => void
  onSelectPlayer?: (player: Player) => void
}

function StatRow({ label, a, b }: { label: string; a: number; b: number }) {
  const max = Math.max(a, b, 0.01)
  const aWins = a > b
  const bWins = b > a

  return (
    <div className="grid grid-cols-[1fr_80px_1fr] items-center gap-2 py-1.5">
      {/* Player A bar */}
      <div className="flex items-center justify-end gap-2">
        <span className={`text-sm font-bold ${aWins ? 'text-[#00FF87]' : 'text-gray-300'}`}>{a.toFixed(1)}</span>
        <div className="w-20 h-2 bg-[#1E2A45] rounded-full overflow-hidden flex justify-end">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(a / max) * 100}%`,
              background: aWins ? '#00FF87' : '#3B82F6',
            }}
          />
        </div>
      </div>

      {/* Label */}
      <span className="text-xs text-gray-500 text-center">{label}</span>

      {/* Player B bar */}
      <div className="flex items-center gap-2">
        <div className="w-20 h-2 bg-[#1E2A45] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(b / max) * 100}%`,
              background: bWins ? '#00FF87' : '#3B82F6',
            }}
          />
        </div>
        <span className={`text-sm font-bold ${bWins ? 'text-[#00FF87]' : 'text-gray-300'}`}>{b.toFixed(1)}</span>
      </div>
    </div>
  )
}

function PlayerPicker({ onSelect, placeholder }: { onSelect: (p: Player) => void; placeholder: string }) {
  const [search, setSearch] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['compare-search', search],
    queryFn: async () => {
      if (!search) return []
      const res = await api.get('/players', { params: { search, per_page: '8' } })
      return res.data.data as Player[]
    },
    enabled: search.length >= 2,
    staleTime: 30000,
  })

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#0A0E1A] border border-[#1E2A45] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00FF87]"
        />
      </div>

      {(search.length >= 2) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#111827] border border-[#1E2A45] rounded-xl overflow-hidden z-10 max-h-48 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {[1,2,3].map(i => <Skeleton key={i} className="h-8 rounded" />)}
            </div>
          ) : data.length === 0 ? (
            <p className="p-3 text-sm text-gray-500">Geen spelers gevonden</p>
          ) : (
            data.map(p => (
              <button
                key={p.id}
                onClick={() => { onSelect(p); setSearch('') }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#1E2A45] transition-colors text-left"
              >
                {p.photo_url && (
                  <img src={p.photo_url} alt="" className="w-7 h-7 rounded-full object-cover bg-[#1E2A45]" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.club} · {p.position}</p>
                </div>
                <span className="text-xs text-gray-400">{Number(p.price).toFixed(1)} cr</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function PlayerCompareModal({ initialPlayer, onClose, onSelectPlayer }: Props) {
  const [playerA, setPlayerA] = useState<Player | null>(initialPlayer ?? null)
  const [playerB, setPlayerB] = useState<Player | null>(null)

  const stats = playerA && playerB ? [
    { label: 'Prijs', a: Number(playerA.price), b: Number(playerB.price) },
    { label: 'Form', a: Number(playerA.form), b: Number(playerB.form) },
    { label: 'Punten', a: Number(playerA.total_points), b: Number(playerB.total_points) },
  ] : []

  const posColor: Record<string, string> = {
    GK: '#FFD700', DEF: '#3B82F6', MID: '#00FF87', FWD: '#EF4444',
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          onClick={e => e.stopPropagation()}
          className="bg-[#111827] border border-[#1E2A45] rounded-2xl w-full max-w-lg overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2A45]">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-[#00FF87]" />
              <h2 className="font-black">Speler vergelijken</h2>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Pickers */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Speler A</p>
                <PlayerPicker onSelect={setPlayerA} placeholder="Zoek speler A..." />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Speler B</p>
                <PlayerPicker onSelect={setPlayerB} placeholder="Zoek speler B..." />
              </div>
            </div>

            {/* Player cards */}
            {(playerA || playerB) && (
              <div className="grid grid-cols-2 gap-3">
                {[playerA, playerB].map((p, idx) => (
                  <div key={idx} className="bg-[#0A0E1A] rounded-xl p-3 flex flex-col items-center gap-2 min-h-[100px] justify-center">
                    {p ? (
                      <>
                        {p.photo_url ? (
                          <img src={p.photo_url} alt={p.name} className="w-12 h-12 rounded-full object-cover bg-[#1E2A45]" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#1E2A45] flex items-center justify-center text-lg font-bold">
                            {(p.name)[0]}
                          </div>
                        )}
                        <p className="font-bold text-sm text-center truncate w-full">{p.name}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ background: `${posColor[p.position] ?? '#666'}20`, color: posColor[p.position] ?? '#999' }}>
                            {p.position}
                          </span>
                          <span className="text-xs text-gray-500">{p.club}</span>
                        </div>
                        {onSelectPlayer && (
                          <button
                            onClick={() => { onSelectPlayer(p); onClose() }}
                            className="text-xs text-[#00FF87] hover:underline"
                          >
                            + Toevoegen
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-600 text-sm text-center">Selecteer een speler</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Stat comparison */}
            {playerA && playerB && (
              <div className="bg-[#0A0E1A] rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-3 text-center">Statistieken vergelijking</p>
                <div className="divide-y divide-[#1E2A45]">
                  {stats.map(s => (
                    <StatRow key={s.label} label={s.label} a={s.a} b={s.b} />
                  ))}
                </div>
                <p className="text-xs text-center mt-3 text-[#00FF87] font-semibold">
                  {Number(playerA.form) > Number(playerB.form)
                    ? `${playerA.name} heeft betere form`
                    : Number(playerB.form) > Number(playerA.form)
                    ? `${playerB.name} heeft betere form`
                    : 'Gelijke form'}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
