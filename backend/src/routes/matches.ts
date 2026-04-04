import { Router, Response } from 'express'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/apiResponse'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /matches/live
router.get('/live', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const matches = await prisma.match.findMany({
      where: { status: { in: ['LIVE', 'HALFTIME'] } },
      include: { events: { orderBy: { minute: 'desc' } } },
      orderBy: { kickoff: 'asc' },
    })

    // Get user's team to mark their players
    const team = await prisma.team.findFirst({
      where: { user: { id: req.user!.id } },
      include: { players: true },
      orderBy: { created_at: 'desc' },
    })

    const myPlayerIds = team?.players.map(p => p.player_id) ?? []

    sendSuccess(res, matches.map(m => ({
      id: m.id,
      home_team: m.home_team,
      away_team: m.away_team,
      home_score: m.home_score ?? 0,
      away_score: m.away_score ?? 0,
      status: m.status.toLowerCase(),
      minute: m.minute ?? 0,
      kickoff_time: m.kickoff.toISOString(),
      events: m.events.map(e => ({
        id: e.id,
        type: e.event_type.toLowerCase(),
        player_id: e.player_id?.toString(),
        minute: e.minute,
        points_awarded: Number(e.points_awarded),
        is_my_player: e.player_id ? myPlayerIds.includes(e.player_id) : false,
      })),
      my_players_in_match: [],
      my_points_from_match: 0,
    })))
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// GET /matches/upcoming
router.get('/upcoming', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const matches = await prisma.match.findMany({
      where: {
        status: 'SCHEDULED',
        kickoff: { gte: new Date() },
      },
      orderBy: { kickoff: 'asc' },
      take: 20,
    })

    sendSuccess(res, matches.map(m => ({
      id: m.id,
      home_team: m.home_team,
      away_team: m.away_team,
      status: m.status.toLowerCase(),
      kickoff_time: m.kickoff.toISOString(),
    })))
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// GET /matches/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const match = await prisma.match.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        events: { orderBy: { minute: 'asc' } },
        performances: { include: { player: true } },
      },
    })

    if (!match) {
      sendError(res, 'Wedstrijd niet gevonden', 404)
      return
    }

    sendSuccess(res, match)
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

export default router
