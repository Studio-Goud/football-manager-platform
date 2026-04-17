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
    const userId = req.user!.id
    const report = await generateScoutReport(userId)
    if (!report) {
      sendError(res, 'Geen team gevonden', 404)
      return
    }

    // Track scout usage for scout_master achievement
    await prisma.transaction.create({
      data: {
        user_id: userId,
        type: 'scout_usage',
        amount: 0,
        credits_amount: 0,
        status: 'COMPLETED',
        description: 'Scout AI gebruikt',
      },
    })

    // Check scout_master achievement (10 uses)
    const { awardAchievement } = await import('../services/achievementService')
    const scoutCount = await prisma.transaction.count({
      where: { user_id: userId, type: 'scout_usage' },
    })
    if (scoutCount >= 10) {
      await awardAchievement(userId, 'scout_master')
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

// GET /teams/my/match-performances — recent match data for team players
router.get('/my/match-performances', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentSeason = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })
    const team = await prisma.team.findFirst({
      where: { user_id: req.user!.id, ...(currentSeason ? { season_id: currentSeason.id } : {}) },
      include: { players: { select: { player_id: true, is_captain: true, is_vice_captain: true } } },
      orderBy: { created_at: 'desc' },
    })
    if (!team) {
      sendSuccess(res, [])
      return
    }

    const playerIds = team.players.map(p => p.player_id)
    const captainId = team.players.find(p => p.is_captain)?.player_id
    const vcId = team.players.find(p => p.is_vice_captain)?.player_id

    const performances = await prisma.matchPerformance.findMany({
      where: { player_id: { in: playerIds } },
      include: {
        match: { select: { id: true, home_team: true, away_team: true, home_score: true, away_score: true, status: true } },
        player: { select: { id: true, name: true, display_name: true, position: true, club: true, photo_url: true } },
      },
      orderBy: { match_id: 'desc' },
      take: 50,
    })

    sendSuccess(res, performances.map(p => ({
      ...p,
      is_captain: p.player_id === captainId,
      is_vice_captain: p.player_id === vcId,
      total_points: Number(p.total_points),
    })))
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

// GET /teams/user/:userId — public view of another user's team
router.get('/user/:userId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params
    const currentSeason = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })
    const team = await prisma.team.findFirst({
      where: { user_id: userId, ...(currentSeason ? { season_id: currentSeason.id } : {}) },
      include: {
        players: { include: { player: true } },
        gameweeks: { orderBy: { gameweek_id: 'desc' }, take: 1 },
      },
      orderBy: { created_at: 'desc' },
    })

    if (!team) { sendError(res, 'Team niet gevonden', 404); return }

    const tacticStyle = team.tactic_style as TacticStyle
    sendSuccess(res, {
      id: team.id,
      name: team.name,
      formation: team.formation,
      tactic_style: tacticStyle,
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

// PUT /teams/:id — save team lineup (add/remove players, log transfers)
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { players } = req.body as { players: Array<{ player_id: string; slot: string; is_captain?: boolean; is_vice_captain?: boolean }> }

    const team = await prisma.team.findFirst({ where: { id, user_id: req.user!.id } })
    if (!team) {
      sendError(res, 'Team niet gevonden', 404)
      return
    }

    // Get current player IDs to detect transfers
    const currentPlayers = await prisma.teamPlayer.findMany({ where: { team_id: id } })
    const currentPlayerIds = new Set(currentPlayers.map(p => p.player_id.toString()))
    const newPlayerIds = new Set(players.map(p => p.player_id.toString()))

    // Detect in/out
    const transfersOut = [...currentPlayerIds].filter(pid => !newPlayerIds.has(pid))
    const transfersIn = [...newPlayerIds].filter(pid => !currentPlayerIds.has(pid))

    // Replace all team players
    await prisma.teamPlayer.deleteMany({ where: { team_id: id } })

    if (players.length > 0) {
      await prisma.teamPlayer.createMany({
        data: players.map(p => ({
          team_id: id,
          player_id: parseInt(p.player_id),
          slot_position: p.slot,
          is_captain: p.is_captain ?? false,
          is_vice_captain: p.is_vice_captain ?? false,
          purchase_price: 0,
        })),
      })
    }

    // Log transfer history in Transaction table
    const transferLogs: Array<{ user_id: string; type: string; amount: number; credits_amount: number; status: string; description: string }> = []

    for (const pid of transfersOut) {
      const player = await prisma.player.findUnique({ where: { id: parseInt(pid) } })
      if (player) {
        transferLogs.push({
          user_id: req.user!.id,
          type: 'transfer_out',
          amount: 0,
          credits_amount: 0,
          status: 'COMPLETED',
          description: `Transfer out: ${player.name} (${player.position})`,
        })
      }
    }
    for (const pid of transfersIn) {
      const player = await prisma.player.findUnique({ where: { id: parseInt(pid) } })
      if (player) {
        transferLogs.push({
          user_id: req.user!.id,
          type: 'transfer_in',
          amount: 0,
          credits_amount: 0,
          status: 'COMPLETED',
          description: `Transfer in: ${player.name} (${player.position})`,
        })
      }
    }

    if (transferLogs.length > 0) {
      await prisma.transaction.createMany({ data: transferLogs })
    }

    sendSuccess(res, { id }, 'Team opgeslagen')
  } catch {
    sendError(res, 'Opslaan mislukt', 500)
  }
})

// GET /teams/my/transfers — transfer history for current user
router.get('/my/transfers', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const transfers = await prisma.transaction.findMany({
      where: {
        user_id: req.user!.id,
        type: { in: ['transfer_in', 'transfer_out'] },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    })

    sendSuccess(res, transfers.map(t => ({
      id: t.id,
      type: t.type,
      description: t.description,
      date: t.created_at,
    })))
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// GET /teams/my/value — current team market value vs purchase prices
router.get('/my/value', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentSeason = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })
    const team = await prisma.team.findFirst({
      where: { user_id: req.user!.id, ...(currentSeason ? { season_id: currentSeason.id } : {}) },
      include: {
        players: {
          include: { player: { select: { id: true, name: true, position: true, price: true, photo_url: true } } },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    if (!team) { sendError(res, 'Geen team', 404); return }

    const playerValues = team.players.map(tp => {
      const currentPrice = Number(tp.player?.price ?? 0)
      const purchasePrice = Number(tp.purchase_price)
      return {
        player_id: tp.player_id,
        player_name: tp.player?.name,
        position: tp.player?.position,
        photo_url: tp.player?.photo_url,
        purchase_price: purchasePrice,
        current_price: currentPrice,
        profit: currentPrice - purchasePrice,
      }
    })

    const totalPurchase = playerValues.reduce((s, p) => s + p.purchase_price, 0)
    const totalCurrent = playerValues.reduce((s, p) => s + p.current_price, 0)

    sendSuccess(res, {
      total_purchase_value: totalPurchase,
      total_current_value: totalCurrent,
      total_profit: totalCurrent - totalPurchase,
      players: playerValues,
    })
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// GET /teams/gameweek-winners — top scorer per gameweek (Hall of Fame)
router.get('/gameweek-winners', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get all finished gameweeks
    const gameweeks = await prisma.gameweek.findMany({
      where: { status: 'FINISHED' },
      orderBy: { number: 'desc' },
      take: 10,
    })

    const winners = []
    for (const gw of gameweeks) {
      const topTeamGw = await prisma.teamGameweek.findFirst({
        where: { gameweek_id: gw.id },
        orderBy: { points: 'desc' },
        include: {
          team: {
            include: { user: { select: { username: true, tier: true } } },
          },
        },
      })
      if (topTeamGw) {
        winners.push({
          gameweek: gw.number,
          username: topTeamGw.team?.user?.username ?? 'Onbekend',
          team_name: topTeamGw.team?.name ?? '—',
          tier: topTeamGw.team?.user?.tier ?? 'bronze',
          points: Number(topTeamGw.points),
        })
      }
    }

    sendSuccess(res, winners)
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// GET /teams/my/upcoming-fixtures — next match for each club in user's team
router.get('/my/upcoming-fixtures', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentSeason = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })
    const team = await prisma.team.findFirst({
      where: { user_id: req.user!.id, ...(currentSeason ? { season_id: currentSeason.id } : {}) },
      include: { players: { include: { player: { select: { id: true, name: true, club: true, position: true, photo_url: true } } } } },
      orderBy: { created_at: 'desc' },
    })

    if (!team) { sendError(res, 'Geen team', 404); return }

    // Get unique clubs
    const clubs = [...new Set(team.players.map(tp => tp.player?.club).filter(Boolean))] as string[]

    // Find upcoming matches for each club
    const fixtures: Record<string, { home_team: string; away_team: string; kickoff: string; is_home: boolean }> = {}
    for (const club of clubs) {
      const match = await prisma.match.findFirst({
        where: {
          OR: [{ home_team: club }, { away_team: club }],
          status: 'SCHEDULED',
          kickoff: { gte: new Date() },
        },
        orderBy: { kickoff: 'asc' },
      })
      if (match) {
        fixtures[club] = {
          home_team: match.home_team,
          away_team: match.away_team,
          kickoff: match.kickoff.toISOString(),
          is_home: match.home_team === club,
        }
      }
    }

    const result = team.players
      .filter(tp => !tp.slot_position.startsWith('BENCH'))
      .map(tp => ({
        player_id: tp.player_id,
        player_name: tp.player?.name,
        club: tp.player?.club,
        position: tp.player?.position,
        photo_url: tp.player?.photo_url,
        fixture: tp.player?.club ? fixtures[tp.player.club] ?? null : null,
      }))

    sendSuccess(res, result)
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

export default router
