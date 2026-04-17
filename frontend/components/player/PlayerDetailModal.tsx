'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, TrendingDown, Minus, ShieldCheck, Zap, Target } from 'lucide-react'
import { Player } from '@/types'
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts'

interface PlayerDetailModalProps {
  player: Player | null
  onClose: () => void
  onAddToTeam?: (player: Player) => void
  showAddButton?: boolean
}

function MiniFormBar({ values }: { values: number[] }) {
  const max = Math.max(...values, 1)
  const last = values[values.length - 1] ?? 0
  const prev = values[values.length - 2] ?? 0
  const trend = last > prev ? 'up' : last < prev ? 'down' : 'flat'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Form (laatste {values.length} GW)</span>
        <div className={`flex items-center gap-1 text-xs font-bold ${
          trend === 'up' ? 'text-[#00FF87]' : trend === 'down' ? 'text-red-400' : 'text-gray-400'
        }`}>
          {trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> :
           trend === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> :
           <Minus className="w-3.5 h-3.5" />}
          {last.toFixed(1)} pts
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1 h-12">
        {values.map((v, i) => {
          const height = max > 0 ? (v / max) * 100 : 0
          const isLast = i === values.length - 1
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-0.5">
              <span className="text-[9px] text-gray-600">{v > 0 ? v.toFixed(0) : ''}</span>
              <div
                className={`w-full rounded-sm transition-all ${
                  isLast
                    ? 'bg-[#00FF87]'
                    : v > (max * 0.7)
                    ? 'bg-[#00FF87]/50'
                    : 'bg-[#1E2A45]'
                }`}
                style={{ height: `${Math.max(height, 4)}%` }}
              />
              <span className="text-[9px] text-gray-600">GW{values.length - values.length + i + 1}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatRow({ label, value, icon: Icon, highlight }: {
  label: string
  value: string | number
  icon?: React.ComponentType<{ className?: string }>
  highlight?: boolean
}) {
  return (
    <div className={`flex items-center justify-between py-2.5 border-b border-[#1E2A45] last:border-0 ${highlight ? 'text-[#00FF87]' : ''}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-500" />}
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <span className={`text-sm font-bold ${highlight ? 'text-[#00FF87]' : 'text-white'}`}>{value}</span>
    </div>
  )
}

const POSITION_COLORS: Record<string, string> = {
  GK:  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  DEF: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  MID: 'bg-green-500/20 text-green-400 border-green-500/30',
  FWD: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export function PlayerDetailModal({ player, onClose, onAddToTeam, showAddButton }: PlayerDetailModalProps) {
  if (!player) return null

  const formHistory = player.form_history?.length > 0 ? player.form_history : [3, 5, 4, 7, 6, player.form]
  const valueScore = player.form > 0 ? ((player.total_points / Math.max(player.price, 1)) * 10).toFixed(1) : '0'
  const isHot = player.form >= 7

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-full sm:max-w-md bg-[#0F1629] rounded-t-3xl sm:rounded-2xl border border-[#1E2A45] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle (mobile) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 bg-[#1E2A45] rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-start gap-4 p-5 pb-4 border-b border-[#1E2A45]">
            {/* Avatar */}
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-[#162040] flex items-center justify-center overflow-hidden">
                {player.photo_url ? (
                  <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-gray-600">
                    {player.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                )}
              </div>
              {isHot && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#F59E0B] rounded-full flex items-center justify-center">
                  <Zap className="w-3 h-3 text-[#0A0E1A]" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-black text-lg leading-tight truncate">{player.name}</h2>
              <p className="text-gray-400 text-sm">{player.club}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${POSITION_COLORS[player.position] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                  {player.position}
                </span>
                {isHot && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30 font-bold">
                    🔥 Hot
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  player.availability === 'available'
                    ? 'bg-[#00FF87]/20 text-[#00FF87]'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {player.availability === 'available' ? '✓ Beschikbaar' : '✗ Geblesseerd'}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#162040] rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Price + points */}
          <div className="grid grid-cols-3 divide-x divide-[#1E2A45] border-b border-[#1E2A45]">
            {[
              { label: 'Prijs', value: `${Number(player.price).toFixed(0)} cr` },
              { label: 'Totaal pts', value: Number(player.total_points).toFixed(0) },
              { label: 'Waarde', value: valueScore },
            ].map(({ label, value }) => (
              <div key={label} className="py-4 text-center">
                <p className="text-xl font-black text-white">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto max-h-[50vh] p-5 space-y-5">
            {/* Form chart */}
            <MiniFormBar values={formHistory} />

            {/* Price history chart */}
            {player.price_history && player.price_history.length > 1 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Prijsgeschiedenis</p>
                <ResponsiveContainer width="100%" height={60}>
                  <AreaChart data={[...player.price_history].reverse()} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
                    <defs>
                      <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      contentStyle={{ background: '#0F1629', border: '1px solid #1E2A45', borderRadius: '6px', fontSize: '11px' }}
                      formatter={(v: number) => [`${v.toFixed(1)} cr`, 'Prijs']}
                    />
                    <Area type="monotone" dataKey="price" stroke="#3B82F6" strokeWidth={1.5} fill="url(#priceGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Stats */}
            <div>
              <h3 className="text-sm font-bold text-gray-400 mb-3">Seizoensstatistieken</h3>
              <div>
                <StatRow label="Goals" value={player.goals ?? 0} icon={Target} highlight={(player.goals ?? 0) > 5} />
                <StatRow label="Assists" value={player.assists ?? 0} icon={TrendingUp} />
                {player.position === 'GK' && (
                  <StatRow label="Saves" value={player.saves ?? 0} icon={ShieldCheck} />
                )}
                <StatRow label="Clean sheets" value={player.clean_sheets ?? 0} icon={ShieldCheck} />
                <StatRow label="Gele kaarten" value={player.yellow_cards ?? 0} />
                <StatRow label="Rode kaarten" value={player.red_cards ?? 0} />
                <StatRow label="Form score" value={`${Number(player.form).toFixed(1)}/10`} highlight />
              </div>
            </div>
          </div>

          {/* Add button */}
          {showAddButton && onAddToTeam && (
            <div className="p-5 border-t border-[#1E2A45]">
              <button
                onClick={() => { onAddToTeam(player); onClose() }}
                className="w-full bg-[#00FF87] text-[#0A0E1A] py-3.5 rounded-xl font-black text-sm hover:bg-[#00CC6A] transition-colors"
              >
                Toevoegen aan team — {Number(player.price).toFixed(0)} coins
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
