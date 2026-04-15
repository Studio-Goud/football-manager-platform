import prisma from '../config/database'
import { calculatePlayerPoints, TACTIC_MULTIPLIERS, TacticStyle } from './scoringService'

export interface PlayerTacticImpact {
  player_id: number
  player_name: string
  player_club: string
  position: string
  photo_url: string | null
  is_captain: boolean
  is_vice_captain: boolean
  base_points: number
  tactic_points: number
  tactic_bonus: number         // tactic_points - base_points (can be negative)
  tactic_multiplier: number
}

export interface TacticImpactSummary {
  tactic_style: TacticStyle
  tactic_label: string
  tactic_icon: string
  total_base_points: number
  total_tactic_points: number
  total_bonus: number
  best_player: PlayerTacticImpact | null
  worst_player: PlayerTacticImpact | null
  players: PlayerTacticImpact[]
  position_breakdown: {
    GK: { bonus: number; multiplier: number }
    DEF: { bonus: number; multiplier: number }
    MID: { bonus: number; multiplier: number }
    FWD: { bonus: number; multiplier: number }
  }
}

const TACTIC_LABELS: Record<TacticStyle, { label: string; icon: string }> = {
  BALANCED:      { label: 'Gebalanceerd',  icon: '⚖️' },
  HIGH_PRESS:    { label: 'Hoog Druk',     icon: '🔥' },
  LOW_BLOCK:     { label: 'Laag Blok',     icon: '🛡️' },
  TIKI_TAKA:     { label: 'Tiki-Taka',     icon: '🎯' },
  COUNTER_ATTACK:{ label: 'Counteraanval', icon: '⚡' },
  LONG_BALL:     { label: 'Lange Bal',     icon: '🎪' },
}

type PositionKey = 'GK' | 'DEF' | 'MID' | 'FWD'

export async function getTacticImpact(userId: string): Promise<TacticImpactSummary | null> {
  // Get user's active team
  const currentSeason = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })

  const team = await prisma.team.findFirst({
    where: {
      user_id: userId,
      ...(currentSeason ? { season_id: currentSeason.id } : {}),
    },
    include: {
      players: {
        include: { player: true },
      },
    },
    orderBy: { created_at: 'desc' },
  })

  if (!team) return null

  // Get last completed gameweek
  const lastGameweek = await prisma.gameweek.findFirst({
    where: { status: 'COMPLETED' },
    include: {
      matches: {
        include: { performances: true },
      },
    },
    orderBy: { number: 'desc' },
  })

  // If no completed gameweek yet, use current live one or return projected data
  const gameweek = lastGameweek ?? await prisma.gameweek.findFirst({
    where: { status: { in: ['LIVE', 'UPCOMING'] } },
    include: { matches: { include: { performances: true } } },
    orderBy: { number: 'asc' },
  })

  const tacticStyle = (team.tactic_style ?? 'BALANCED') as TacticStyle
  const multipliers = TACTIC_MULTIPLIERS[tacticStyle]
  const meta = TACTIC_LABELS[tacticStyle]

  const playerResults: PlayerTacticImpact[] = []

  for (const tp of team.players) {
    if (tp.slot_position.startsWith('BENCH')) continue

    const player = tp.player
    const pos = player.position as PositionKey

    // Find performance data if available, otherwise use form-based projection
    const performance = gameweek?.matches
      .flatMap(m => m.performances)
      .find(p => p.player_id === tp.player_id)

    const perfData = performance
      ? {
          minutes_played: performance.minutes_played,
          goals: performance.goals,
          assists: performance.assists,
          clean_sheet: performance.clean_sheet,
          yellow_cards: performance.yellow_cards,
          red_cards: performance.red_cards,
          own_goals: performance.own_goals,
          saves: performance.saves,
          penalty_saved: performance.penalty_saved,
          penalty_missed: performance.penalty_missed,
          rating: performance.rating ? Number(performance.rating) : null,
        }
      : {
          // Projected based on form score — used when no real gameweek data yet
          minutes_played: 90,
          goals: 0,
          assists: 0,
          clean_sheet: false,
          yellow_cards: 0,
          red_cards: 0,
          own_goals: 0,
          saves: 0,
          penalty_saved: false,
          penalty_missed: false,
          rating: Number(player.form) >= 7 ? Number(player.form) : null,
        }

    const basePoints = calculatePlayerPoints(perfData, player.position, 'BALANCED')
    const tacticPoints = calculatePlayerPoints(perfData, player.position, tacticStyle)

    const captainMult = tp.is_captain ? 2.0 : tp.is_vice_captain ? 1.5 : 1.0
    const finalBase = basePoints * captainMult
    const finalTactic = tacticPoints * captainMult

    playerResults.push({
      player_id: player.id,
      player_name: player.display_name || player.name,
      player_club: player.club,
      position: player.position,
      photo_url: player.photo_url,
      is_captain: tp.is_captain,
      is_vice_captain: tp.is_vice_captain,
      base_points: Math.round(finalBase * 10) / 10,
      tactic_points: Math.round(finalTactic * 10) / 10,
      tactic_bonus: Math.round((finalTactic - finalBase) * 10) / 10,
      tactic_multiplier: multipliers[pos] ?? 1.0,
    })
  }

  // Sort by tactic_bonus descending
  playerResults.sort((a, b) => b.tactic_bonus - a.tactic_bonus)

  const totalBase = playerResults.reduce((s, p) => s + p.base_points, 0)
  const totalTactic = playerResults.reduce((s, p) => s + p.tactic_points, 0)

  const posBreakdown = (['GK', 'DEF', 'MID', 'FWD'] as PositionKey[]).reduce((acc, pos) => {
    const mult = multipliers[pos] ?? 1.0
    const posPlayers = playerResults.filter(p => p.position === pos)
    const bonus = posPlayers.reduce((s, p) => s + p.tactic_bonus, 0)
    acc[pos] = { bonus: Math.round(bonus * 10) / 10, multiplier: mult }
    return acc
  }, {} as TacticImpactSummary['position_breakdown'])

  return {
    tactic_style: tacticStyle,
    tactic_label: meta.label,
    tactic_icon: meta.icon,
    total_base_points: Math.round(totalBase * 10) / 10,
    total_tactic_points: Math.round(totalTactic * 10) / 10,
    total_bonus: Math.round((totalTactic - totalBase) * 10) / 10,
    best_player: playerResults[0] ?? null,
    worst_player: playerResults[playerResults.length - 1] ?? null,
    players: playerResults,
    position_breakdown: posBreakdown,
  }
}
