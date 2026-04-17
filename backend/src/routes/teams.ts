import { Router, Response } from 'express'
import { body, validationResult } from 'express-validator'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/apiResponse'
import { authenticate, AuthRequest } from '../middleware/auth'
import { calculateTeamGameweekPoints, calculateLeaderboard, calculatePrizeDistribution, TACTIC_META, TacticStyle } from '../services/scoringService'
import { getTacticImpact } from '../services/tacticImpactService'
import { generateScoutReport } from '../services/scoutService'

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

    const tacticStyle = team.tactic_style as TacticStyle
    sendSuccess(res, {
      id: team.id,
      name: team.name,
      formation: team.formation,
      tactic_style: tacticStyle,
      tactic_meta: TACTIC_META[tacticStyle] ?? TACTIC_META.BALANCED,
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

// PATCH /teams/my/name — update team name
router.patch('/my/name', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name } = req.body
  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 30) {
    sendError(res, 'Naam moet tussen 2 en 30 tekens zijn', 400)
    return
  }

  try {
    const currentSeason = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })
    const team = await prisma.team.findFirst({
      where: { user_id: req.user!.id, ...(currentSeason ? { season_id: currentSeason.id } : {}) },
      orderBy: { created_at: 'desc' },
    })
    if (!team) { sendError(res, 'Geen team gevonden', 404); return }

    const updated = await prisma.team.update({ where: { id: team.id }, data: { name: name.trim() } })
    sendSuccess(res, { name: updated.name }, 'Teamnaam bijgewerkt')
  } catch {
    sendError(res, 'Bijwerken mislukt', 500)
  }
})

// PATCH /teams/my/tactic — update tactic style
router.patch('/my/tactic', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const VALID_TACTICS: TacticStyle[] = ['BALANCED', 'HIGH_PRESS', 'LOW_BLOCK', 'TIKI_TAKA', 'COUNTER_ATTACK', 'LONG_BALL']
  const { tactic_style } = req.body

  if (!tactic_style || !VALID_TACTICS.includes(tactic_style)) {
    sendError(res, `Ongeldige tactiek. Kies uit: ${VALID_TACTICS.join(', ')}`, 400)
    return
  }

  try {
    const currentSeason = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })

    const team = await prisma.team.findFirst({
      where: {
        user_id: req.user!.id,
        ...(currentSeason ? { season_id: currentSeason.id } : {}),
      },
      orderBy: { created_at: 'desc' },
    })

    if (!team) {
      sendError(res, 'Geen team gevonden', 404)
      return
    }

    const updated = await prisma.team.update({
      where: { id: team.id },
      data: { tactic_style },
    })

    sendSuccess(res, {
      tactic_style: updated.tactic_style,
      tactic_meta: TACTIC_META[tactic_style as TacticStyle],
    }, 'Tactiek bijgewerkt')
  } catch {
    sendError(res, 'Bijwerken mislukt', 500)
  }
})

// GET /tactics — list all available tactics with metadata
router.get('/tactics', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  sendSuccess(res, Object.entries(TACTIC_META).map(([key, meta]) => ({
    id: key,
    ...meta,
  })))
})

// GET /teams/my/tactic-impact — per-speler tactiek bonus breakdown
router.get('/my/tactic-impact', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const impact = await getTacticImpact(req.user!.id)
    if (!impact) {
      sendError(res, 'Geen team gevonden', 404)
      return
    }
    sendSuccess(res, impact)
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// GET /teams/my/scout — AI transfer tips
router.get('/my/scout', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const report = await generateScoutReport(req.user!.id)
    if (!report) {
      sendError(res, 'Geen team gevonden', 404)
      return
    }
    sendSuccess(res, report)
  } catch {
    sendError(res, 'Scout analyse mislukt', 500)
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

// GET /teams/my/points-history — last 10 gameweek scores
router.get('/my/points-history', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentSeason = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })
    const team = await prisma.team.findFirst({
      where: { user_id: req.user!.id, ...(currentSeason ? { season_id: currentSeason.id } : {}) },
      orderBy: { created_at: 'desc' },
    })
    if (!team) {
      sendSuccess(res, [])
      return
    }

    const history = await prisma.teamGameweek.findMany({
      where: { team_id: team.id },
      include: { gameweek: { select: { number: true } } },
      orderBy: { gameweek_id: 'asc' },
      take: 10,
    })

    sendSuccess(res, history.map(h => ({
      gameweek: h.gameweek.number,
      points: Number(h.points),
      rank: h.rank,
    })))
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

export default router
