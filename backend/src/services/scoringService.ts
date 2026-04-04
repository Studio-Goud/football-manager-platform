import prisma from '../config/database'
import logger from '../config/logger'

// ─── Scoring constants ────────────────────────────────────────────────────────

export const SCORING = {
  goal: { GK: 10, DEF: 10, MID: 8, FWD: 6 },
  assist: 3,
  clean_sheet: { GK: 6, DEF: 4, MID: 1, FWD: 0 },
  yellow_card: -1,
  red_card: -3,
  own_goal: -2,
  penalty_saved: 5,
  penalty_missed: -2,
  saves_per_3: 1,
  man_of_match: 3,
  rating_8plus: 2,
  brace_bonus: 4,
  hattrick_bonus: 8,
  minutes_60plus: 2,
  minutes_45plus: 1,
  captain_multiplier: 2.0,
  vice_captain_multiplier: 1.5,
} as const

type PositionKey = 'GK' | 'DEF' | 'MID' | 'FWD'

interface MatchPerformanceData {
  minutes_played: number
  goals: number
  assists: number
  clean_sheet: boolean
  yellow_cards: number
  red_cards: number
  own_goals: number
  saves: number
  penalty_saved: boolean
  penalty_missed: boolean
  rating?: number | null
}

// ─── Core scoring logic ────────────────────────────────────────────────────────

export function calculatePlayerPoints(
  performance: MatchPerformanceData,
  position: string
): number {
  let points = 0
  const pos = position as PositionKey

  // Appearance points
  if (performance.minutes_played >= 60) {
    points += SCORING.minutes_60plus
  } else if (performance.minutes_played >= 45) {
    points += SCORING.minutes_45plus
  } else if (performance.minutes_played === 0) {
    return 0 // Did not play
  }

  // Goals
  const goalPoints = SCORING.goal[pos] ?? SCORING.goal.MID
  points += performance.goals * goalPoints

  // Brace / Hattrick bonus
  if (performance.goals >= 3) {
    points += SCORING.hattrick_bonus
  } else if (performance.goals === 2) {
    points += SCORING.brace_bonus
  }

  // Assists
  points += performance.assists * SCORING.assist

  // Clean sheet (per 90 min of play - approximate: if played >= 60)
  if (performance.clean_sheet && performance.minutes_played >= 60) {
    points += SCORING.clean_sheet[pos] ?? 0
  }

  // Saves (GK only, per 3 saves)
  if (pos === 'GK') {
    points += Math.floor(performance.saves / 3) * SCORING.saves_per_3
  }

  // Penalty saved
  if (performance.penalty_saved) {
    points += SCORING.penalty_saved
  }

  // Penalty missed
  if (performance.penalty_missed) {
    points += SCORING.penalty_missed
  }

  // Discipline
  points += performance.yellow_cards * SCORING.yellow_card
  points += performance.red_cards * SCORING.red_card
  points += performance.own_goals * SCORING.own_goal

  // Bonus for high rating
  if (performance.rating && performance.rating >= 8) {
    points += SCORING.rating_8plus
  }

  return points
}

// ─── Team gameweek points ──────────────────────────────────────────────────────

export async function calculateTeamGameweekPoints(
  teamId: string,
  gameweekId: number
): Promise<number> {
  try {
    const teamPlayers = await prisma.teamPlayer.findMany({
      where: { team_id: teamId },
      include: {
        player: true,
        team: { select: { captain_player_id: true, vice_captain_player_id: true } },
      },
    })

    const gameweek = await prisma.gameweek.findUnique({
      where: { id: gameweekId },
      include: { matches: { include: { performances: true } } },
    })

    if (!gameweek) return 0

    let totalPoints = 0

    for (const tp of teamPlayers) {
      if (tp.slot_position.startsWith('BENCH')) continue // Skip bench initially

      const performance = gameweek.matches
        .flatMap(m => m.performances)
        .find(p => p.player_id === tp.player_id)

      if (!performance) continue

      let playerPoints = calculatePlayerPoints(
        {
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
        },
        tp.player.position
      )

      // Captain multiplier
      if (tp.is_captain) {
        playerPoints *= SCORING.captain_multiplier
      } else if (tp.is_vice_captain) {
        playerPoints *= SCORING.vice_captain_multiplier
      }

      totalPoints += playerPoints
    }

    // Check for power-ups
    const activePowerups = await prisma.userPowerup.findMany({
      where: {
        team: { id: teamId },
        status: 'ACTIVE',
        gameweek_id: gameweekId,
      },
    } as Parameters<typeof prisma.userPowerup.findMany>[0])

    for (const pu of activePowerups) {
      if (pu.powerup_type === 'DOUBLE_POINTS') {
        totalPoints *= 2
      } else if (pu.powerup_type === 'STREAK_BOOST') {
        totalPoints *= 1.5
      }
    }

    return Math.round(totalPoints * 100) / 100
  } catch (err) {
    logger.error('Error calculating team gameweek points', { teamId, gameweekId, err })
    return 0
  }
}

// ─── Prize distribution ────────────────────────────────────────────────────────

export interface PrizeDistribution {
  rank: number
  percentage: number
  prize: number
}

export function calculatePrizeDistribution(
  totalPot: number,
  numParticipants: number
): PrizeDistribution[] {
  const platformFee = totalPot * 0.2 // 20% platform fee
  const prizePot = totalPot - platformFee

  const topPercent = Math.ceil(numParticipants * 0.2) // Top 20% wins

  const distributions: PrizeDistribution[] = []

  // Position-based distribution for top
  const prizes = [
    { rank: 1, pct: 0.30 },
    { rank: 2, pct: 0.20 },
    { rank: 3, pct: 0.12 },
  ]

  let allocated = 0
  for (const p of prizes) {
    if (p.rank <= topPercent) {
      const prize = prizePot * p.pct
      distributions.push({ rank: p.rank, percentage: p.pct * 100, prize })
      allocated += p.pct
    }
  }

  // Remaining 38% shared among rank 4 to topPercent
  if (topPercent > 3) {
    const remaining = 1 - allocated
    const prizePerRank = (prizePot * remaining) / (topPercent - 3)
    for (let rank = 4; rank <= topPercent; rank++) {
      distributions.push({
        rank,
        percentage: (remaining / (topPercent - 3)) * 100,
        prize: prizePerRank,
      })
    }
  }

  return distributions
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function calculateLeaderboard(seasonId: number) {
  const teams = await prisma.team.findMany({
    where: { season_id: seasonId },
    include: {
      user: { select: { id: true, username: true, tier: true } },
      gameweeks: { orderBy: { gameweek_id: 'desc' }, take: 1 },
    },
    orderBy: { total_points: 'desc' },
  })

  return teams.map((team, index) => ({
    rank: index + 1,
    team_id: team.id,
    team_name: team.name,
    user: {
      id: team.user.id,
      username: team.user.username,
      tier: team.user.tier.toLowerCase(),
    },
    total_points: Number(team.total_points),
    gameweek_points: team.gameweeks[0] ? Number(team.gameweeks[0].points) : 0,
    prize: 0, // To be calculated with calculatePrizeDistribution
  }))
}
