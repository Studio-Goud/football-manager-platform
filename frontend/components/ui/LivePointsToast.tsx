'use client'

const EVENT_EMOJI: Record<string, string> = {
  goal: '⚽',
  assist: '🎯',
  yellow_card: '🟨',
  red_card: '🟥',
  clean_sheet: '🧤',
  save: '🧤',
  penalty_save: '🦸',
  own_goal: '😬',
}

interface LivePointsToastProps {
  playerName: string
  eventType: string
  delta: number
  totalPoints: number
  photoUrl?: string | null
}

export function LivePointsToast({ playerName, eventType, delta, totalPoints, photoUrl }: LivePointsToastProps) {
  const emoji = EVENT_EMOJI[eventType] ?? '⚽'
  const eventLabel: Record<string, string> = {
    goal: 'Doelpunt',
    assist: 'Assist',
    yellow_card: 'Gele kaart',
    red_card: 'Rode kaart',
    clean_sheet: 'Clean sheet',
    save: 'Redding',
    penalty_save: 'Penalty gestopt',
    own_goal: 'Eigen doelpunt',
  }

  return (
    <div className="flex items-center gap-3 min-w-[240px]">
      <div className="relative flex-shrink-0">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={playerName}
            className="w-10 h-10 rounded-full object-cover bg-[#1E2A45]"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#1E2A45] flex items-center justify-center text-lg">
            {emoji}
          </div>
        )}
        {photoUrl && (
          <span className="absolute -bottom-1 -right-1 text-sm">{emoji}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-white truncate">{playerName}</p>
        <p className="text-xs text-gray-400">{eventLabel[eventType] ?? eventType}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[#00FF87] font-black text-base">+{delta}</p>
        <p className="text-gray-500 text-[10px]">{totalPoints} totaal</p>
      </div>
    </div>
  )
}
