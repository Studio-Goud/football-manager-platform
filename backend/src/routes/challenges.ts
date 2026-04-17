import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/apiResponse'

const router = Router()

// Weekly challenges definitions — rotate based on week number
const WEEKLY_CHALLENGES = [
  {
    id: 'goals_3',
    title: '3 Doelpunten',
    description: 'Heb minstens 3 spelers in je team die scoren deze week',
    icon: '⚽',
    reward_coins: 300,
    target: 3,
    metric: 'goals',
  },
  {
    id: 'assists_2',
    title: 'Assist Machine',
    description: 'Heb minstens 2 spelers die een assist geven deze week',
    icon: '🅰️',
    reward_coins: 250,
    target: 2,
    metric: 'assists',
  },
  {
    id: 'clean_sheet',
    title: 'Schone Lei',
    description: 'Heb een keeper of verdediger die een clean sheet houdt',
    icon: '🧤',
    reward_coins: 200,
    target: 1,
    metric: 'clean_sheets',
  },
  {
    id: 'points_50',
    title: '50 Punten Week',
    description: 'Scoor meer dan 50 punten in één speelronde',
    icon: '🌟',
    reward_coins: 400,
    target: 50,
    metric: 'gameweek_points',
  },
  {
    id: 'captain_scores',
    title: 'Aanvoerder Scoort',
    description: 'Laat je aanvoerder scoren voor dubbele punten',
    icon: '👑',
    reward_coins: 350,
    target: 1,
    metric: 'captain_goal',
  },
]

function getCurrentChallenge() {
  const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  return WEEKLY_CHALLENGES[weekNumber % WEEKLY_CHALLENGES.length]
}

// GET /challenges/weekly — current week's challenge
router.get('/weekly', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const challenge = getCurrentChallenge()
    const weekStart = new Date()
    weekStart.setHours(0, 0, 0, 0)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // Monday

    // Check if user already claimed this challenge
    const claimed = await prisma.transaction.findFirst({
      where: {
        user_id: req.user!.id,
        type: 'challenge_reward',
        description: { contains: challenge.id },
        created_at: { gte: weekStart },
      },
    })

    // Calculate progress based on team's recent match performances
    let progress = 0
    if (challenge.metric === 'gameweek_points') {
      const team = await prisma.team.findFirst({
        where: { user_id: req.user!.id },
        include: { gameweeks: { orderBy: { gameweek_id: 'desc' }, take: 1 } },
        orderBy: { created_at: 'desc' },
      })
      progress = team?.gameweeks[0] ? Number(team.gameweeks[0].points) : 0
    } else if (['goals', 'assists', 'clean_sheets', 'captain_goal'].includes(challenge.metric)) {
      const team = await prisma.team.findFirst({
        where: { user_id: req.user!.id },
        include: { players: { select: { player_id: true, is_captain: true } } },
        orderBy: { created_at: 'desc' },
      })
      if (team) {
        const playerIds = team.players.map(p => p.player_id)
        const captainId = team.players.find(p => p.is_captain)?.player_id

        const perfs = await prisma.matchPerformance.findMany({
          where: { player_id: { in: playerIds }, match: { status: 'FT' } },
          orderBy: { match_id: 'desc' },
          take: playerIds.length,
        })

        if (challenge.metric === 'goals') {
          progress = perfs.filter(p => p.goals > 0).length
        } else if (challenge.metric === 'assists') {
          progress = perfs.filter(p => p.assists > 0).length
        } else if (challenge.metric === 'clean_sheets') {
          progress = perfs.filter(p => p.clean_sheet).length
        } else if (challenge.metric === 'captain_goal' && captainId) {
          const captainPerf = perfs.find(p => p.player_id === captainId)
          progress = captainPerf && captainPerf.goals > 0 ? 1 : 0
        }
      }
    }

    const completed = progress >= challenge.target
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    res.json({
      success: true,
      data: {
        ...challenge,
        progress,
        completed,
        claimed: !!claimed,
        claimable: completed && !claimed,
        week_end: weekEnd.toISOString(),
      },
    })
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// POST /challenges/weekly/claim — claim the reward if completed
router.post('/weekly/claim', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const challenge = getCurrentChallenge()

    const weekStart = new Date()
    weekStart.setHours(0, 0, 0, 0)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())

    const alreadyClaimed = await prisma.transaction.findFirst({
      where: {
        user_id: userId,
        type: 'challenge_reward',
        description: { contains: challenge.id },
        created_at: { gte: weekStart },
      },
    })
    if (alreadyClaimed) {
      sendError(res, 'Al geclaimd', 400)
      return
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { balance_credits: { increment: challenge.reward_coins } } }),
      prisma.transaction.create({
        data: {
          user_id: userId,
          type: 'challenge_reward',
          amount: 0,
          credits_amount: challenge.reward_coins,
          status: 'COMPLETED',
          description: `Weekly challenge: ${challenge.id} — ${challenge.title}`,
        },
      }),
    ])

    sendSuccess(res, { reward_coins: challenge.reward_coins }, `+${challenge.reward_coins} coins verdiend!`)
  } catch {
    sendError(res, 'Claimen mislukt', 500)
  }
})

export default router
