'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

export type TacticStyle =
  | 'BALANCED'
  | 'HIGH_PRESS'
  | 'LOW_BLOCK'
  | 'TIKI_TAKA'
  | 'COUNTER_ATTACK'
  | 'LONG_BALL'

interface TacticMeta {
  label: string
  description: string
  icon: string
  bestFor: string
  multipliers: { GK: number; DEF: number; MID: number; FWD: number }
}

const TACTICS: Record<TacticStyle, TacticMeta> = {
  BALANCED:      { label: 'Gebalanceerd',  icon: '⚖️',  description: 'Geen bonussen, geen straffen. Veilige keuze.',        bestFor: 'Alle posities gelijk',       multipliers: { GK: 1.00, DEF: 1.00, MID: 1.00, FWD: 1.00 } },
  HIGH_PRESS:    { label: 'Hoog Druk',     icon: '🔥',  description: 'Aanvallers en middenvelders drukken hoog op.',        bestFor: 'FWD-zware teams',            multipliers: { GK: 0.95, DEF: 0.95, MID: 1.10, FWD: 1.25 } },
  LOW_BLOCK:     { label: 'Laag Blok',     icon: '🛡️',  description: 'Verdedigers en keeper slaan hun slag bij counters.',  bestFor: 'DEF/GK-zware teams',         multipliers: { GK: 1.25, DEF: 1.20, MID: 0.95, FWD: 0.85 } },
  TIKI_TAKA:     { label: 'Tiki-Taka',     icon: '🎯',  description: 'Korte passen, middenvelders domineren het spel.',     bestFor: 'MID-zware teams',            multipliers: { GK: 1.00, DEF: 1.10, MID: 1.25, FWD: 0.95 } },
  COUNTER_ATTACK:{ label: 'Counteraanval', icon: '⚡',  description: 'Snel omschakelen, spitsen profiteren maximaal.',      bestFor: 'Snelle aanvallers',          multipliers: { GK: 1.05, DEF: 1.05, MID: 0.95, FWD: 1.30 } },
  LONG_BALL:     { label: 'Lange Bal',     icon: '🎪',  description: 'Directe aanvalsstijl, sterke spitsen en back-vier.', bestFor: 'FWD + DEF combinaties',      multipliers: { GK: 1.00, DEF: 1.10, MID: 0.90, FWD: 1.20 } },
}

function MultiplierBadge({ value, position }: { value: number; position: string }) {
  const color =
    value > 1.15 ? 'text-green-400 bg-green-400/10' :
    value > 1.0  ? 'text-emerald-400 bg-emerald-400/10' :
    value < 0.9  ? 'text-red-400 bg-red-400/10' :
    value < 1.0  ? 'text-orange-400 bg-orange-400/10' :
                   'text-gray-400 bg-white/5'

  const label = value === 1.0 ? '1×' : `${value.toFixed(2)}×`

  return (
    <div className={`flex flex-col items-center rounded-lg px-2 py-1.5 ${color}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{position}</span>
      <span className="text-sm font-black">{label}</span>
    </div>
  )
}

interface Props {
  value: TacticStyle
  onChange: (tactic: TacticStyle) => void
  disabled?: boolean
}

export function TacticSelector({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const current = TACTICS[value]

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between bg-[#0A0E1A] border border-[#1E2A45] hover:border-[#00FF87]/40 rounded-xl px-4 py-3 transition-colors disabled:opacity-50"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{current.icon}</span>
          <div className="text-left">
            <p className="text-sm font-bold text-white">{current.label}</p>
            <p className="text-xs text-gray-500">{current.bestFor}</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-2 left-0 right-0 bg-[#111827] border border-[#1E2A45] rounded-xl overflow-hidden shadow-2xl"
          >
            {(Object.entries(TACTICS) as [TacticStyle, TacticMeta][]).map(([key, meta]) => (
              <button
                key={key}
                type="button"
                onClick={() => { onChange(key); setOpen(false) }}
                className={`w-full text-left px-4 py-3 hover:bg-[#1E2A45] transition-colors border-b border-[#1E2A45] last:border-0 ${value === key ? 'bg-[#00FF87]/5' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">{meta.label}</p>
                      {value === key && <span className="text-[10px] font-black text-[#00FF87] uppercase">Actief</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{meta.description}</p>

                    {/* Multiplier row */}
                    <div className="flex gap-1.5 mt-2">
                      {(['GK', 'DEF', 'MID', 'FWD'] as const).map(pos => (
                        <MultiplierBadge key={pos} position={pos} value={meta.multipliers[pos]} />
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
