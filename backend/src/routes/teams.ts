import { Router, Response } from 'express'
import { body, validationResult } from 'express-validator'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/apiResponse'
import { authenticate, AuthRequest } from '../middleware/auth'
import { calculateTeamGameweekPoints, calculateLeaderboard, calculatePrizeDistribution } from '../services/scoringService'

const router = Router()

// GET /teams/my
router.get('/my', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentSeason = await prisma.season.findFirst({
      where: { status: 'ACTIVE' },
    })

    const team = await prisma.team.findFirst({
      where: { user_id: req.user!.id, ...(currentSeason ? { season_id: currentSeason.id } : {}) },
      include: {
        players: {
          include: { player: true },
        },
        gameweeks: {
          orderBy: { gameweek_id: 'desc' },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
    })

    if (!team) {
      sendError(res, 'Geen team gevonden voor dit seizoen', 404)
      return
    }

    sendSuccess(res, {
      id: team.id,
      name: team.name,
      formation: team.formation,
      captain_id: team.captain_player_id?.toString(),
      vice_captain_id: team.vice_captain_player_id?.toString(),
      total_points: Number(team.total_points),
      gameweek_points: team.gameweeks[0] ? Number(team.gameweeks[0].points) : 0,
      players: team.players.map(tp => ({
        player_id: tp.player_id.toString(),
        slot: tp.slot_position,
        is_captain: tp.is_captain,
        is_vice_captain: tp.is_vice_captain,
        purchase_price: Number(tp.purchase_price),
        player: tp.player ? {
          id: tp.player.id,
          name: tp.player.name,
          club: tp.player.club,
          position: tp.player.position,
          price: Number(tp.player.price),
          form: Number(tp.player.form),
          photo_url: tp.player.photo_url,
          total_points: Number(tp.player.total_points),
        } : null,
      })),
    })
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// POST /teams — create team
router.post(
  '/',
  authenticate,
  [
    body('name').isLength({ min: 3, max: 50 }).trim(),
    body('formation').isIn(['4-4-2', '4-3-3', '3-5-2', '4-5-1', '5-3-2', '3-4-3']),
    body('entry_fee').isFloat({ min: 5, max: 100 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      sendError(res, 'Ongeldige invoer', 400)
      return
    }

    const { name, formation, entry_fee } = req.body

    try {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
      if (!user || Number(user.balance_credits) < entry_fee) {
        sendError(res, 'Onvoldoende saldo', 402)
        return
      }

      const currentSeason = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })
      if (!currentSeason) {
        sendError(res, 'Geen actief seizoen', 400)
        return
      }

      const [team] = await prisma.$transaction([
        prisma.team.create({
          data: {
            user_id: req.user!.id,
            season_id: currentSeason.id,
            name,
            formation,
            entry_fee,
          },
        }),
        prisma.user.update({
          where: { id: req.user!.id },
          data: { balance_credits: { decrement: entry_fee } },
        }),
        prisma.transaction.create({
          data: {
            user_id: req.user!.id,
            type: 'ENTRY_FEE',
            amount: -entry_fee,
            credits_amount: -entry_fee,
            description: `Inschrijfgeld seizoen ${currentSeason.name}`,
            status: 'COMPLETED',
          },
        }),
        prisma.season.update({
          where: { id: currentSeason.id },
          data: { total_pot: { increment: entry_fee } },
        }),
      ])

      sendSuccess(res, team, 'Team aangemaakt', 201)
    } catch {
      sendError(res, 'Aanmaken mislukt', 500)
    }
  }
)

// PUT /teams/:id/captain
router.post('/:id/captain', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { player_id } = req.body

  try {
    const team = await prisma.team.findFirst({
      where: { id: req.params.id, user_id: req.user!.id },
    })

    if (!team) {
      sendError(res, 'Team niet gevonden', 404)
      return
    }

    await prisma.$transaction([
      prisma.teamPlayer.updateMany({
        where: { team_id: req.params.id },
        data: { is_captain: false },
      }),
      prisma.teamPlayer.updateMany({
        where: { team_id: req.params.id, player_id: parseInt(player_id) },
        data: { is_captain: true },
      }),
      prisma.team.update({
        where: { id: req.params.id },
        data: { captain_player_id: parseInt(player_id) },
      }),
    ])

    sendSuccess(res, null, 'Aanvoerder gewijzigd')
  } catch {
    sendError(res, 'Wijzigen mislukt', 500)
  }
})

// GET /teams/leaderboard
router.get('/leaderboard', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentSeason = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })
    if (!currentSeason) {
      sendSuccess(res, { entries: [], total_participants: 0, prize_pool: 0 })
      return
    }

    const entries = await calculateLeaderboard(currentSeason.id)
    const prizeDistribution = calculatePrizeDistribution(
      Number(currentSeason.total_pot),
      entries.length
    )

    const entriesWithPrizes = entries.map(entry => {
      const prize = prizeDistribution.find(p => p.rank === entry.rank)
      return { ...entry, prize: prize ? Math.round(prize.prize) : 0 }
    })

    sendSuccess(res, {
      season_id: currentSeason.id.toString(),
      gameweek: 28, // TODO: dynamic
      entries: entriesWithPrizes,
      total_participants: entries.length,
      prize_pool: Number(currentSeason.total_pot),
      updated_at: new Date().toISOString(),
    })
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

export default router
