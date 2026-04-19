import { Router, Response } from 'express'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/apiResponse'
import { authenticate, AuthRequest } from '../middleware/auth'
import { fetchLiveMatches, fetchTodayFixtures, fetchWeekFixtures } from '../services/footballApiService'
import { nextTickAt } from '../services/simulationService'

const router = Router()

// GET /matches/next-tick — wanneer is de volgende simulatie tick
router.get('/next-tick', (_req, res) => {
  res.json({ success: true, data: { next_tick_at: nextTickAt.toISOString() } })
})

// GET /matches/current-gameweek
router.get('/current-gameweek', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const season = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })
    if (!season) { sendError(res, 'Geen actief seizoen', 404); return }

    const gw = await prisma.gameweek.findFirst({
      where: { season_id: season.id, status: 'ACTIVE' },
      orderBy: { number: 'desc' },
    })
    if (!gw) { sendError(res, 'Geen actieve speelronde', 404); return }

    sendSuccess(res, {
      id: gw.id,
      number: gw.number,
      status: gw.status,
      start_date: gw.start_date,
      end_date: gw.end_date,
      deadline: gw.deadline,
      next_tick_at: nextTickAt.toISOString(),
      season_name: season.name,
    })
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// GET /matches/live — live wedstrijden direct van API-Sports (gecached 60s)
router.get('/live', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const apiMatches = await fetchLiveMatches()

    if (apiMatches.length > 0) {
      sendSuccess(res, apiMatches)
      return
    }

    // Fallback: database
    const matches = await prisma.match.findMany({
      where: { status: { in: ['LIVE', 'HALFTIME'] } },
      orderBy: { kickoff: 'asc' },
    })
    sendSuccess(res, matches.map(m => ({
      fixture_id:  m.external_id,
      home_team:   m.home_team,
      away_team:   m.away_team,
      home_score:  m.home_score ?? 0,
      away_score:  m.away_score ?? 0,
      status:      m.status,
      minute:      m.minute ?? 0,
      league_name: 'Eredivisie',
      league_flag: '🇳🇱',
    })))
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// GET /matches/today — wedstrijden van vandaag (gecached 5 min)
router.get('/today', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const fixtures = await fetchTodayFixtures()
    sendSuccess(res, fixtures)
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// GET /matches/week — wedstrijden vandaag + komende 3 dagen (gecached 5 min)
router.get('/week', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const fixtures = await fetchWeekFixtures()
    sendSuccess(res, fixtures)
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
