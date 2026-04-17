import { Router, Response } from 'express'
import { body, validationResult } from 'express-validator'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/apiResponse'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// Scoring: correct winner=3, exact score=8, correct draw=1, top scorer=5 bonus
function calculatePoints(
  pred: { home_goals: number; away_goals: number; top_scorer?: string | null },
  actual: { home_score: number; away_score: number }
): number {
  let pts = 0
  const predWinner = pred.home_goals > pred.away_goals ? 'home' : pred.home_goals < pred.away_goals ? 'away' : 'draw'
  const actualWinner = actual.home_score > actual.away_score ? 'home' : actual.home_score < actual.away_score ? 'away' : 'draw'

  if (pred.home_goals === actual.home_score && pred.away_goals === actual.away_score) {
    pts += 8 // exact score includes winner
  } else if (predWinner === actualWinner) {
    pts += predWinner === 'draw' ? 1 : 3
  }

  return pts
}

// GET /predictions/upcoming — wedstrijden beschikbaar voor voorspellen
router.get('/upcoming', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000)

    const matches = await prisma.match.findMany({
      where: {
        status: { in: ['SCHEDULED', 'UPCOMING'] },
        kickoff: { gte: new Date(), lte: oneHourFromNow === oneHourFromNow ? undefined : oneHourFromNow },
      },
      orderBy: { kickoff: 'asc' },
      take: 20,
    })

    // Check which ones user already predicted
    const matchIds = matches.map(m => m.id)
    const existing = await prisma.prediction.findMany({
      where: { user_id: req.user!.id, match_id: { in: matchIds } },
    })
    const predictedIds = new Set(existing.map(p => p.match_id))

    sendSuccess(res, matches.map(m => ({
      id: m.id,
      home_team: m.home_team,
      away_team: m.away_team,
      kickoff: m.kickoff,
      status: m.status,
      already_predicted: predictedIds.has(m.id),
    })))
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// GET /predictions/my — mijn voorspellingen
router.get('/my', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const predictions = await prisma.prediction.findMany({
      where: { user_id: req.user!.id },
      include: {
        match: {
          select: { id: true, home_team: true, away_team: true, home_score: true, away_score: true, status: true, kickoff: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    })
    sendSuccess(res, predictions)
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// GET /predictions/leaderboard — top voorspellers
router.get('/leaderboard', authenticate, async (_req, res: Response): Promise<void> => {
  try {
    const top = await prisma.prediction.groupBy({
      by: ['user_id'],
      _sum: { points: true },
      _count: { id: true },
      orderBy: { _sum: { points: 'desc' } },
      take: 10,
    })

    const userIds = top.map(t => t.user_id)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, tier: true },
    })
    const userMap = new Map(users.map(u => [u.id, u]))

    sendSuccess(res, top.map((t, i) => ({
      rank: i + 1,
      user: userMap.get(t.user_id),
      total_points: t._sum.points ?? 0,
      predictions: t._count.id,
    })))
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// POST /predictions — nieuwe voorspelling
router.post(
  '/',
  authenticate,
  [
    body('match_id').isInt(),
    body('home_goals').isInt({ min: 0, max: 20 }),
    body('away_goals').isInt({ min: 0, max: 20 }),
    body('top_scorer').optional().isString().trim().isLength({ max: 100 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) { sendError(res, 'Ongeldige invoer', 400); return }

    const { match_id, home_goals, away_goals, top_scorer } = req.body

    try {
      const match = await prisma.match.findUnique({ where: { id: parseInt(match_id) } })
      if (!match) { sendError(res, 'Wedstrijd niet gevonden', 404); return }

      // Deadline: 1 hour before kickoff
      const deadline = new Date(match.kickoff.getTime() - 60 * 60 * 1000)
      if (new Date() > deadline) {
        sendError(res, 'Deadline verstreken (1 uur voor aftrap)', 400)
        return
      }

      const existing = await prisma.prediction.findFirst({
        where: { user_id: req.user!.id, match_id: parseInt(match_id) },
      })
      if (existing) { sendError(res, 'Je hebt al een voorspelling voor deze wedstrijd', 409); return }

      const prediction = await prisma.prediction.create({
        data: {
          user_id: req.user!.id,
          match_id: parseInt(match_id),
          home_goals: parseInt(home_goals),
          away_goals: parseInt(away_goals),
          top_scorer: top_scorer ?? null,
        },
      })

      sendSuccess(res, prediction, 'Voorspelling opgeslagen!', 201)
    } catch {
      sendError(res, 'Opslaan mislukt', 500)
    }
  }
)

// POST /predictions/score-match/:matchId — admin: scoor voorspellingen na wedstrijd
router.post('/score-match/:matchId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user?.is_admin) { sendError(res, 'Geen toegang', 403); return }

  try {
    const match = await prisma.match.findUnique({ where: { id: parseInt(req.params.matchId) } })
    if (!match || match.home_score == null || match.away_score == null) {
      sendError(res, 'Wedstrijd nog niet afgelopen', 400)
      return
    }

    const unscored = await prisma.prediction.findMany({
      where: { match_id: match.id, scored: false },
    })

    for (const pred of unscored) {
      const pts = calculatePoints(
        { home_goals: pred.home_goals, away_goals: pred.away_goals, top_scorer: pred.top_scorer },
        { home_score: match.home_score, away_score: match.away_score }
      )
      await prisma.prediction.update({
        where: { id: pred.id },
        data: { points: pts, scored: true },
      })
    }

    sendSuccess(res, { scored: unscored.length }, `${unscored.length} voorspellingen gescoord`)
  } catch {
    sendError(res, 'Scoren mislukt', 500)
  }
})

export default router
