'use client'

import { Formation, TeamPlayer, Player } from '@/types'

interface PitchViewProps {
  formation: Formation
  players: TeamPlayer[]
  onPlayerClick?: (player: TeamPlayer) => void
  onSlotClick?: (slot: number) => void
}

const formationPositions: Record<Formation, { slot: number; x: number; y: number; label: string }[]> = {
  '4-4-2': [
    { slot: 1, x: 50, y: 88, label: 'GK' },
    { slot: 2, x: 15, y: 70, label: 'LB' }, { slot: 3, x: 37, y: 70, label: 'CB' }, { slot: 4, x: 63, y: 70, label: 'CB' }, { slot: 5, x: 85, y: 70, label: 'RB' },
    { slot: 6, x: 15, y: 48, label: 'LM' }, { slot: 7, x: 37, y: 48, label: 'CM' }, { slot: 8, x: 63, y: 48, label: 'CM' }, { slot: 9, x: 85, y: 48, label: 'RM' },
    { slot: 10, x: 35, y: 22, label: 'ST' }, { slot: 11, x: 65, y: 22, label: 'ST' },
  ],
  '4-3-3': [
    { slot: 1, x: 50, y: 88, label: 'GK' },
    { slot: 2, x: 15, y: 70, label: 'LB' }, { slot: 3, x: 37, y: 70, label: 'CB' }, { slot: 4, x: 63, y: 70, label: 'CB' }, { slot: 5, x: 85, y: 70, label: 'RB' },
    { slot: 6, x: 25, y: 48, label: 'CM' }, { slot: 7, x: 50, y: 48, label: 'CM' }, { slot: 8, x: 75, y: 48, label: 'CM' },
    { slot: 9, x: 20, y: 18, label: 'LW' }, { slot: 10, x: 50, y: 15, label: 'ST' }, { slot: 11, x: 80, y: 18, label: 'RW' },
  ],
  '3-5-2': [
    { slot: 1, x: 50, y: 88, label: 'GK' },
    { slot: 2, x: 25, y: 72, label: 'CB' }, { slot: 3, x: 50, y: 72, label: 'CB' }, { slot: 4, x: 75, y: 72, label: 'CB' },
    { slot: 5, x: 10, y: 50, label: 'LWB' }, { slot: 6, x: 30, y: 50, label: 'CM' }, { slot: 7, x: 50, y: 50, label: 'CM' }, { slot: 8, x: 70, y: 50, label: 'CM' }, { slot: 9, x: 90, y: 50, label: 'RWB' },
    { slot: 10, x: 35, y: 22, label: 'ST' }, { slot: 11, x: 65, y: 22, label: 'ST' },
  ],
  '4-5-1': [
    { slot: 1, x: 50, y: 88, label: 'GK' },
    { slot: 2, x: 15, y: 70, label: 'LB' }, { slot: 3, x: 37, y: 70, label: 'CB' }, { slot: 4, x: 63, y: 70, label: 'CB' }, { slot: 5, x: 85, y: 70, label: 'RB' },
    { slot: 6, x: 10, y: 48, label: 'LM' }, { slot: 7, x: 30, y: 48, label: 'CM' }, { slot: 8, x: 50, y: 48, label: 'CM' }, { slot: 9, x: 70, y: 48, label: 'CM' }, { slot: 10, x: 90, y: 48, label: 'RM' },
    { slot: 11, x: 50, y: 15, label: 'ST' },
  ],
  '5-3-2': [
    { slot: 1, x: 50, y: 88, label: 'GK' },
    { slot: 2, x: 10, y: 68, label: 'LWB' }, { slot: 3, x: 28, y: 72, label: 'CB' }, { slot: 4, x: 50, y: 72, label: 'CB' }, { slot: 5, x: 72, y: 72, label: 'CB' }, { slot: 6, x: 90, y: 68, label: 'RWB' },
    { slot: 7, x: 25, y: 46, label: 'CM' }, { slot: 8, x: 50, y: 46, label: 'CM' }, { slot: 9, x: 75, y: 46, label: 'CM' },
    { slot: 10, x: 35, y: 20, label: 'ST' }, { slot: 11, x: 65, y: 20, label: 'ST' },
  ],
  '3-4-3': [
    { slot: 1, x: 50, y: 88, label: 'GK' },
    { slot: 2, x: 25, y: 72, label: 'CB' }, { slot: 3, x: 50, y: 72, label: 'CB' }, { slot: 4, x: 75, y: 72, label: 'CB' },
    { slot: 5, x: 15, y: 50, label: 'LM' }, { slot: 6, x: 38, y: 50, label: 'CM' }, { slot: 7, x: 62, y: 50, label: 'CM' }, { slot: 8, x: 85, y: 50, label: 'RM' },
    { slot: 9, x: 20, y: 18, label: 'LW' }, { slot: 10, x: 50, y: 15, label: 'ST' }, { slot: 11, x: 80, y: 18, label: 'RW' },
  ],
}

const positionColors: Record<string, string> = {
  GK: '#FFD700', CB: '#3B82F6', LB: '#3B82F6', RB: '#3B82F6', LWB: '#3B82F6', RWB: '#3B82F6',
  CM: '#00FF87', LM: '#00FF87', RM: '#00FF87', DM: '#00FF87', AM: '#00FF87',
  ST: '#EF4444', LW: '#EF4444', RW: '#EF4444', CF: '#EF4444',
}

function PlayerSlot({
  pos,
  player,
  onClick,
  isEmpty,
}: {
  pos: { slot: number; x: number; y: number; label: string }
  player?: TeamPlayer & { player?: Player }
  onClick: () => void
  isEmpty: boolean
}) {
  const color = positionColors[pos.label] ?? '#9B59B6'
  const isCaptain = player?.is_captain
  const isViceCaptain = player?.is_vice_captain

  return (
    <g
      transform={`translate(${pos.x}, ${pos.y})`}
      onClick={onClick}
      className="cursor-pointer"
    >
      {/* Player circle */}
      <circle
        r="7"
        fill={isEmpty ? '#1E2A45' : color}
        stroke={isCaptain ? '#FFD700' : isEmpty ? '#2D3748' : `${color}80`}
        strokeWidth={isCaptain ? 2 : 1}
        opacity={isEmpty ? 0.5 : 1}
      />

      {/* Captain badge */}
      {isCaptain && (
        <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" fill="#0A0E1A" fontSize="5" fontWeight="bold">C</text>
      )}
      {isViceCaptain && !isCaptain && (
        <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" fill="#0A0E1A" fontSize="5" fontWeight="bold">V</text>
      )}
      {!isCaptain && !isViceCaptain && !isEmpty && (
        <text x="0" y="1" textAnchor="middle" dominantBaseline="middle" fill="#0A0E1A" fontSize="4" fontWeight="bold">
          {player?.player?.name?.split(' ').pop()?.substring(0, 4) ?? '?'}
        </text>
      )}
      {isEmpty && (
        <text x="0" y="0.5" textAnchor="middle" dominantBaseline="middle" fill="#4A5568" fontSize="6">+</text>
      )}

      {/* Position label below */}
      <rect x="-5" y="9" width="10" height="5" rx="1" fill="#0F1629" opacity="0.9" />
      <text x="0" y="13" textAnchor="middle" dominantBaseline="middle" fill={isEmpty ? '#4A5568' : color} fontSize="3.5" fontWeight="bold">
        {pos.label}
      </text>

      {/* Points badge */}
      {player?.player && (
        <>
          <rect x="-5" y="-17" width="10" height="5" rx="1" fill="#0A0E1A" opacity="0.9" />
          <text x="0" y="-14" textAnchor="middle" dominantBaseline="middle" fill="#00FF87" fontSize="3.5" fontWeight="bold">
            {player.player.points_this_week}pt
          </text>
        </>
      )}
    </g>
  )
}

export function PitchView({ formation, players, onPlayerClick, onSlotClick }: PitchViewProps) {
  const positions = formationPositions[formation]

  const getPlayerForSlot = (slot: number) =>
    players.find(p => p.slot === slot) as (TeamPlayer & { player?: Player }) | undefined

  return (
    <div className="relative w-full aspect-[2/3] max-w-sm mx-auto">
      <svg viewBox="0 0 100 140" className="w-full h-full" style={{ filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.5))' }}>
        {/* Pitch background */}
        <defs>
          <linearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d2c1a" />
            <stop offset="50%" stopColor="#0f3520" />
            <stop offset="100%" stopColor="#0d2c1a" />
          </linearGradient>
        </defs>
        <rect width="100" height="140" fill="url(#pitchGrad)" rx="3" />

        {/* Pitch markings */}
        <rect x="5" y="5" width="90" height="130" rx="2" fill="none" stroke="#1a5c30" strokeWidth="0.5" />
        <line x1="5" y1="70" x2="95" y2="70" stroke="#1a5c30" strokeWidth="0.5" />
        <circle cx="50" cy="70" r="12" fill="none" stroke="#1a5c30" strokeWidth="0.5" />
        <circle cx="50" cy="70" r="1" fill="#1a5c30" />

        {/* Penalty areas */}
        <rect x="22" y="5" width="56" height="20" fill="none" stroke="#1a5c30" strokeWidth="0.4" />
        <rect x="22" y="115" width="56" height="20" fill="none" stroke="#1a5c30" strokeWidth="0.4" />
        <rect x="35" y="5" width="30" height="10" fill="none" stroke="#1a5c30" strokeWidth="0.4" />
        <rect x="35" y="125" width="30" height="10" fill="none" stroke="#1a5c30" strokeWidth="0.4" />

        {/* Goal areas */}
        <rect x="42" y="2" width="16" height="4" fill="none" stroke="#1a5c30" strokeWidth="0.4" />
        <rect x="42" y="134" width="16" height="4" fill="none" stroke="#1a5c30" strokeWidth="0.4" />

        {/* Penalty spots */}
        <circle cx="50" cy="18" r="0.8" fill="#1a5c30" />
        <circle cx="50" cy="122" r="0.8" fill="#1a5c30" />

        {/* Stripe pattern (subtle) */}
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <rect key={i} x="5" y={5 + i * 19} width="90" height="9.5" fill="#0e3319" opacity="0.3" />
        ))}

        {/* Players */}
        {positions.map((pos) => {
          const player = getPlayerForSlot(pos.slot)
          return (
            <PlayerSlot
              key={pos.slot}
              pos={pos}
              player={player}
              isEmpty={!player}
              onClick={() => player ? onPlayerClick?.(player) : onSlotClick?.(pos.slot)}
            />
          )
        })}
      </svg>

      {/* Bench */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        {[12, 13, 14, 15].map((slot) => {
          const player = getPlayerForSlot(slot)
          return (
            <button
              key={slot}
              onClick={() => player ? onPlayerClick?.(player as TeamPlayer) : onSlotClick?.(slot)}
              className="bg-[#0F1629] border border-[#1E2A45] rounded-lg p-2 text-center hover:border-[#00FF87]/30 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#1E2A45] mx-auto mb-1 flex items-center justify-center">
                {player?.player
                  ? <span className="text-xs font-bold text-white">{player.player.name.split(' ').pop()?.substring(0, 3)}</span>
                  : <span className="text-gray-600 text-lg">+</span>
                }
              </div>
              <span className="text-xs text-gray-500">Bank {slot - 11}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
