'use client'

import { Player } from '@/types'
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { formatCredits } from '@/lib/utils'

interface PlayerCardProps {
  player: Player
  isSelected?: boolean
  isCaptain?: boolean
  isViceCaptain?: boolean
  onClick?: () => void
  showPoints?: boolean
  compact?: boolean
}

const positionBg: Record<string, string> = {
  GK: 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30',
  DEF: 'bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/30',
  MID: 'bg-[#00FF87]/20 text-[#00FF87] border-[#00FF87]/30',
  FWD: 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/30',
}

const availabilityIcon = (av: Player['availability']) => {
  switch (av) {
    case 'injured': return <AlertCircle className="w-3 h-3 text-red-400" />
    case 'suspended': return <AlertCircle className="w-3 h-3 text-yellow-400" />
    case 'doubt': return <AlertCircle className="w-3 h-3 text-orange-400" />
    default: return null
  }
}

export function PlayerCard({ player, isSelected, isCaptain, isViceCaptain, onClick, showPoints = true, compact = false }: PlayerCardProps) {
  const formPct = (player.form / 10) * 100

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
          isSelected ? 'border-[#00FF87] bg-[#00FF87]/10' : 'border-[#1E2A45] bg-[#0A0E1A] hover:border-[#00FF87]/30'
        }`}
      >
        <div className="w-10 h-10 rounded-full bg-[#1E2A45] flex items-center justify-center overflow-hidden flex-shrink-0">
          {player.photo_url
            ? <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            : <span className="text-xs font-bold">{player.name.charAt(0)}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-sm truncate">{player.name}</span>
            {availabilityIcon(player.availability)}
            {player.form >= 8 && <span className="text-[9px] font-black bg-orange-500/20 text-orange-400 px-1 rounded">🔥</span>}
          </div>
          <span className="text-xs text-gray-500">{player.club} · {player.position}</span>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-sm text-[#00FF87]">{formatCredits(player.price)}</p>
          {showPoints && <p className="text-xs text-gray-500">{player.points_this_week}pt</p>}
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`relative w-full bg-[#0F1629] border rounded-xl p-4 text-left transition-all hover:scale-[1.02] ${
        isSelected ? 'border-[#00FF87] shadow-lg shadow-[#00FF87]/10' : 'border-[#1E2A45] hover:border-[#00FF87]/30'
      }`}
    >
      {/* Captain/VC badge */}
      {(isCaptain || isViceCaptain) && (
        <span className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${isCaptain ? 'bg-[#FFD700] text-[#0A0E1A]' : 'bg-gray-600 text-white'}`}>
          {isCaptain ? 'C' : 'V'}
        </span>
      )}

      {/* Hot form badge */}
      {player.form >= 8 && !isCaptain && !isViceCaptain && (
        <span className="absolute top-2 right-2 text-[10px] font-black bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full border border-orange-500/30">
          🔥 Hot
        </span>
      )}

      {/* Availability indicator */}
      {player.availability !== 'available' && (
        <span className="absolute top-2 left-2">{availabilityIcon(player.availability)}</span>
      )}

      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl bg-[#1E2A45] flex items-center justify-center overflow-hidden flex-shrink-0">
          {player.photo_url
            ? <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            : <span className="text-lg font-black text-gray-400">{player.name.charAt(0)}</span>
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{player.name}</p>
          <p className="text-xs text-gray-500 mb-2">{player.club}</p>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${positionBg[player.position]}`}>
            {player.position}
          </span>
        </div>
      </div>

      {/* Form bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Form</span>
          <span className="text-xs font-bold text-[#00FF87]">{player.form.toFixed(1)}</span>
        </div>
        <div className="h-1.5 bg-[#1E2A45] rounded-full overflow-hidden">
          <div className="h-full bg-[#00FF87] rounded-full" style={{ width: `${formPct}%` }} />
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-center">
          <p className="text-sm font-bold text-[#00FF87]">{formatCredits(player.price)}</p>
          <p className="text-xs text-gray-600">prijs</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold">{player.total_points}</p>
          <p className="text-xs text-gray-600">punten</p>
        </div>
        <div className="text-center">
          <div className="flex items-center gap-0.5 justify-center">
            {player.price_change_week >= 0
              ? <TrendingUp className="w-3 h-3 text-[#00FF87]" />
              : <TrendingDown className="w-3 h-3 text-red-400" />
            }
            <span className={`text-xs font-bold ${player.price_change_week >= 0 ? 'text-[#00FF87]' : 'text-red-400'}`}>
              {player.price_change_week >= 0 ? '+' : ''}{player.price_change_week.toFixed(1)}
            </span>
          </div>
          <p className="text-xs text-gray-600">wijziging</p>
        </div>
      </div>
    </button>
  )
}
