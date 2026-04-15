'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Zap } from 'lucide-react'

interface PlayerImpact {
  player_id: number
  player_name: string
  player_club: string
  position: string
  photo_url: string | null
  is_captain: boolean
  is_vice_captain: boolean
  base_points: number
  tactic_points: number
  tactic_bonus: number
  tactic_multiplier: number
}

interface PositionBreakdown {
  bonus: number
  multiplier: number
}

interface TacticImpactData {
  tactic_style: string
  tactic_label: string
  tactic_icon: string
  total_base_points: number
  total_tactic_points: number
  total_bonus: number
  best_player: PlayerImpact | null
  worst_player: PlayerImpact | null
  players: PlayerImpact[]
  position_breakdown: {
    GK: PositionBreakdown
    DEF: PositionBreakdown
    MID: PositionBreakdown
    FWD: PositionBreakdown
  }
}

function BonusBadge({ value }: { value: number }) {
  if (value > 0.05) return (
    <span className="flex items-center gap-1 text-green-400 font-bold text-sm">
      <TrendingUp className="w-3.5 h-3.5" />+{value.toFixed(1)}
    </span>
  )
  if (value < -0.05) return (
    <span className="flex items-center gap-1 text-red-400 font-bold text-sm">
      <TrendingDown className="w-3.5 h-3.5" />{value.toFixed(1)}
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-gray-500 font-bold text-sm">
      <Minus className="w-3.5 h-3.5" />0
    </span>
  )
}

function MultBar({ multiplier }: { multiplier: number }) {
  const pct = ((multiplier - 0.8) / (1.35 - 0.8)) * 100
  const color =
    multiplier > 1.15 ? '#00FF87' :
    multiplier > 1.0  ? '#34D399' :
    multiplier < 0.9  ? '#EF4444' :
    multiplier < 1.0  ? '#F97316' :
                        '#64748B'
  return (
    <div className="w-full bg-[#0A0E1A] rounded-full h-1.5 mt-1">
      <div
        className="h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${Math.max(5, Math.min(100, pct))}%`, background: color }}
      />
    </div>
  )
}

interface Props {
  tacticStyle?: string
}

export function TacticImpactPanel({ tacticStyle }: Props) {
  const [data, setData] = useState<TacticImpactData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    // In productie: fetch from /api/teams/my/tactic-impact
    // Voor nu: mock data gebaseerd op geselecteerde tactiek
    const mockImpact = generateMockImpact(tacticStyle ?? 'BALANCED')
    setData(mockImpact)
    setLoading(false)
  }, [tacticStyle])

  if (loading) return (
    <div className="animate-pulse space-y-2">
      <div className="h-4 bg-[#1E2A45] rounded w-2/3" />
      <div className="h-20 bg-[#1E2A45] rounded" />
    </div>
  )

  if (!data) return null

  const bonusColor = data.total_bonus > 0 ? 'text-green-400' : data.total_bonus < 0 ? 'text-red-400' : 'text-gray-500'

  return (
    <div className="space-y-3">
      {/* Summary row */}
      <div className="bg-[#0A0E1A] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#00FF87]" />
            <span className="text-sm font-bold">Tactiek Effect</span>
          </div>
          <span className="text-lg">{data.tactic_icon}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-gray-500 mb-1">Basis</p>
            <p className="font-black text-white">{data.total_base_points.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Met tactiek</p>
            <p className="font-black text-[#00FF87]">{data.total_tactic_points.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Bonus</p>
            <p className={`font-black ${bonusColor}`}>
              {data.total_bonus > 0 ? '+' : ''}{data.total_bonus.toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      {/* Position breakdown */}
      <div className="grid grid-cols-4 gap-2">
        {(Object.entries(data.position_breakdown) as [string, PositionBreakdown][]).map(([pos, info]) => (
          <div key={pos} className="bg-[#0A0E1A] rounded-xl p-2.5 text-center">
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{pos}</p>
            <p className="text-xs font-black" style={{
              color: info.multiplier > 1.05 ? '#00FF87' : info.multiplier < 0.95 ? '#EF4444' : '#64748B'
            }}>
              {info.multiplier.toFixed(2)}×
            </p>
            <MultBar multiplier={info.multiplier} />
          </div>
        ))}
      </div>

      {/* Best / Worst player highlight */}
      {data.best_player && Math.abs(data.best_player.tactic_bonus) > 0.1 && (
        <div className="bg-green-400/5 border border-green-400/20 rounded-xl px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <div>
              <p className="text-xs font-bold text-green-400">Beste keuze voor {data.tactic_label}</p>
              <p className="text-xs text-gray-400">{data.best_player.player_name} · {data.best_player.player_club}</p>
            </div>
          </div>
          <span className="text-green-400 font-black text-sm">+{data.best_player.tactic_bonus.toFixed(1)}</span>
        </div>
      )}

      {/* Expand/collapse player list */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between text-xs text-gray-500 hover:text-white transition-colors py-1"
      >
        <span>Per speler breakdown</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5">
              {data.players.map(player => (
                <div key={player.player_id} className="flex items-center gap-3 bg-[#0A0E1A] rounded-xl px-3 py-2">
                  <div className="w-7 h-7 rounded-lg bg-[#1E2A45] flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">
                    {player.position.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold truncate">{player.player_name}</p>
                      {player.is_captain && <span className="text-[9px] font-black text-[#00FF87] bg-[#00FF87]/10 px-1 rounded">C</span>}
                    </div>
                    <p className="text-[10px] text-gray-500">{player.tactic_multiplier.toFixed(2)}× · {player.tactic_points.toFixed(1)} pts</p>
                  </div>
                  <BonusBadge value={player.tactic_bonus} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Mock data generator (vervangt API call tot backend live is) ───────────────

type TacticMultipliers = { GK: number; DEF: number; MID: number; FWD: number }

const MULT_MAP: Record<string, TacticMultipliers> = {
  BALANCED:      { GK: 1.00, DEF: 1.00, MID: 1.00, FWD: 1.00 },
  HIGH_PRESS:    { GK: 0.95, DEF: 0.95, MID: 1.10, FWD: 1.25 },
  LOW_BLOCK:     { GK: 1.25, DEF: 1.20, MID: 0.95, FWD: 0.85 },
  TIKI_TAKA:     { GK: 1.00, DEF: 1.10, MID: 1.25, FWD: 0.95 },
  COUNTER_ATTACK:{ GK: 1.05, DEF: 1.05, MID: 0.95, FWD: 1.30 },
  LONG_BALL:     { GK: 1.00, DEF: 1.10, MID: 0.90, FWD: 1.20 },
}

const TACTIC_LABELS: Record<string, { label: string; icon: string }> = {
  BALANCED:      { label: 'Gebalanceerd',  icon: '⚖️' },
  HIGH_PRESS:    { label: 'Hoog Druk',     icon: '🔥' },
  LOW_BLOCK:     { label: 'Laag Blok',     icon: '🛡️' },
  TIKI_TAKA:     { label: 'Tiki-Taka',     icon: '🎯' },
  COUNTER_ATTACK:{ label: 'Counteraanval', icon: '⚡' },
  LONG_BALL:     { label: 'Lange Bal',     icon: '🎪' },
}

const MOCK_PLAYERS: { name: string; club: string; position: keyof TacticMultipliers; base: number; captain?: boolean }[] = [
  { name: 'Raya',       club: 'Arsenal',   position: 'GK',  base: 8 },
  { name: 'Alexander-Arnold', club: 'Liverpool', position: 'DEF', base: 10 },
  { name: 'Saliba',     club: 'Arsenal',   position: 'DEF', base: 9 },
  { name: 'Pedro Porro',club: 'Spurs',     position: 'DEF', base: 7 },
  { name: 'De Bruyne',  club: 'Man City',  position: 'MID', base: 14, captain: true },
  { name: 'Salah',      club: 'Liverpool', position: 'MID', base: 12 },
  { name: 'Saka',       club: 'Arsenal',   position: 'MID', base: 10 },
  { name: 'Haaland',    club: 'Man City',  position: 'FWD', base: 16 },
  { name: 'Watkins',    club: 'Aston Villa',position: 'FWD', base: 9 },
  { name: 'Isak',       club: 'Newcastle', position: 'FWD', base: 8 },
  { name: 'Mbeumo',     club: 'Brentford', position: 'FWD', base: 7 },
]

function generateMockImpact(tacticStyle: string): TacticImpactData {
  const mults = MULT_MAP[tacticStyle] ?? MULT_MAP.BALANCED
  const meta = TACTIC_LABELS[tacticStyle] ?? TACTIC_LABELS.BALANCED

  const players: PlayerImpact[] = MOCK_PLAYERS.map((p, i) => {
    const captainMult = p.captain ? 2.0 : 1.0
    const base = p.base * captainMult
    const tactic = base * mults[p.position]
    return {
      player_id: i + 1,
      player_name: p.name,
      player_club: p.club,
      position: p.position,
      photo_url: null,
      is_captain: !!p.captain,
      is_vice_captain: false,
      base_points: Math.round(base * 10) / 10,
      tactic_points: Math.round(tactic * 10) / 10,
      tactic_bonus: Math.round((tactic - base) * 10) / 10,
      tactic_multiplier: mults[p.position],
    }
  }).sort((a, b) => b.tactic_bonus - a.tactic_bonus)

  const totalBase = players.reduce((s, p) => s + p.base_points, 0)
  const totalTactic = players.reduce((s, p) => s + p.tactic_points, 0)

  const posBreakdown = (['GK', 'DEF', 'MID', 'FWD'] as (keyof TacticMultipliers)[]).reduce((acc, pos) => {
    const posPlayers = players.filter(p => p.position === pos)
    const bonus = posPlayers.reduce((s, p) => s + p.tactic_bonus, 0)
    acc[pos] = { bonus: Math.round(bonus * 10) / 10, multiplier: mults[pos] }
    return acc
  }, {} as TacticImpactData['position_breakdown'])

  return {
    tactic_style: tacticStyle,
    tactic_label: meta.label,
    tactic_icon: meta.icon,
    total_base_points: Math.round(totalBase * 10) / 10,
    total_tactic_points: Math.round(totalTactic * 10) / 10,
    total_bonus: Math.round((totalTactic - totalBase) * 10) / 10,
    best_player: players[0] ?? null,
    worst_player: players[players.length - 1] ?? null,
    players,
    position_breakdown: posBreakdown,
  }
}
