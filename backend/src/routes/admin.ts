import { Router, Response } from 'express'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/apiResponse'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth'
import { syncEredivisiePlayers } from '../services/syncPlayersService'
import { processSeasonEndRewards, giveNewSeasonBonus } from '../services/seasonRewardService'
import { seedDemoDataForce } from '../seed-demo'
import { fixTeamForUser } from '../services/simulationService'
import { seedAchievements } from '../services/achievementService'
import logger from '../config/logger'

const router = Router()

router.use(authenticate, requireAdmin)

// GET /admin/stats
router.get('/stats', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [totalUsers, totalTeams, totalPlayers, activeMatches, totalTransactions, coinSum, totalAchievements, totalLeagues, activeSeason] = await Promise.all([
      prisma.user.count(),
      prisma.team.count(),
      prisma.player.count(),
      prisma.match.count({ where: { status: 'LIVE' } }),
      prisma.transaction.count(),
      prisma.user.aggregate({ _sum: { balance_credits: true } }),
      prisma.userAchievement.count(),
      prisma.privateLeague.count(),
      prisma.season.findFirst({ where: { status: 'ACTIVE' }, select: { name: true, id: true } }),
    ])

    sendSuccess(res, {
      total_users: totalUsers,
      total_teams: totalTeams,
      total_players: totalPlayers,
      active_matches: activeMatches,
      total_transactions: totalTransactions,
      total_coins_in_circulation: Number(coinSum._sum.balance_credits ?? 0),
      total_achievements_earned: totalAchievements,
      total_private_leagues: totalLeagues,
      active_season: activeSeason?.name ?? null,
    })
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// GET /admin/users
router.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  const { search, page = '1', per_page = '20' } = req.query
  const pageNum = Math.max(1, parseInt(page as string))
  const perPageNum = Math.min(50, parseInt(per_page as string))

  try {
    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { username: { contains: search as string } },
        { email: { contains: search as string } },
      ]
    }

    const [users] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, username: true, tier: true,
          balance_credits: true, is_admin: true, is_suspended: true,
          created_at: true, last_active: true,
        },
        orderBy: { created_at: 'desc' },
        skip: (pageNum - 1) * perPageNum,
        take: perPageNum,
      }),
      prisma.user.count({ where }),
    ])

    sendSuccess(res, users)
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// PUT /admin/users/:id/suspend
router.put('/users/:id/suspend', async (req: AuthRequest, res: Response): Promise<void> => {
  const { suspended } = req.body
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { is_suspended: suspended ?? true },
    })
    sendSuccess(res, null, suspended ? 'Account gesuspendeerd' : 'Suspensie opgeheven')
  } catch {
    sendError(res, 'Wijzigen mislukt', 500)
  }
})

// POST /admin/users/:id/coins
router.post('/users/:id/coins', async (req: AuthRequest, res: Response): Promise<void> => {
  const { amount } = req.body
  if (!amount || isNaN(Number(amount))) { sendError(res, 'Ongeldig bedrag', 400); return }
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { balance_credits: { increment: Number(amount) } },
      select: { id: true, username: true, balance_credits: true },
    })
    await prisma.transaction.create({
      data: {
        user_id: req.params.id,
        type: 'BONUS',
        amount: Number(amount),
        credits_amount: Number(amount),
        status: 'COMPLETED',
        description: `Admin bonus: ${amount} coins`,
      },
    })
    sendSuccess(res, user, `${amount} coins toegevoegd aan ${user.username}`)
  } catch {
    sendError(res, 'Coins geven mislukt', 500)
  }
})

// POST /admin/seasons
router.post('/seasons', async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, competition, start_date, end_date, entry_fee_min, entry_fee_max } = req.body
  try {
    const season = await prisma.season.create({
      data: {
        name: name ?? `Seizoen ${new Date().getFullYear()}`,
        competition: competition ?? 'eredivisie',
        start_date: start_date ? new Date(start_date) : new Date(),
        end_date: end_date ? new Date(end_date) : new Date(Date.now() + 90 * 24 * 3600 * 1000),
        entry_fee_min: entry_fee_min ?? 0,
        entry_fee_max: entry_fee_max ?? 0,
        status: 'UPCOMING',
      },
    })
    sendSuccess(res, season, 'Seizoen aangemaakt', 201)
  } catch {
    sendError(res, 'Aanmaken mislukt', 500)
  }
})

// POST /admin/fix-team — herstel team player IDs voor test account
router.post('/fix-team', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const testUser = await prisma.user.findUnique({ where: { email: 'ricardo@test.nl' } })
    if (!testUser) { sendError(res, 'Test user niet gevonden', 404); return }
    const teamId = await fixTeamForUser(testUser.id)
    sendSuccess(res, { team_id: teamId }, 'Team gereset met correcte speler IDs')
  } catch (err) {
    logger.error('Fix team mislukt', { err })
    sendError(res, 'Fix team mislukt', 500)
  }
})

// POST /admin/seed-demo — force-seed demo spelers (herstel lege database)
router.post('/seed-demo', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await seedDemoDataForce()
    sendSuccess(res, result, `Demo seed klaar: ${result.players} spelers, seizoen ${result.season ? 'aangemaakt' : 'al aanwezig'}`)
  } catch {
    sendError(res, 'Seed mislukt', 500)
  }
})

// POST /admin/sync-players/await — sync en wacht op resultaat
router.post('/sync-players/await', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    logger.info('Admin: speler sync gestart')
    const result = await syncEredivisiePlayers()
    sendSuccess(res, result, `Sync klaar: ${result.players_synced} spelers, ${result.injured_updated} blessures bijgewerkt`)
  } catch {
    sendError(res, 'Sync mislukt', 500)
  }
})

// POST /admin/sync-players — async versie (respond direct)
router.post('/sync-players', async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json({ success: true, message: 'Sync gestart op achtergrond (~30 sec)' })
  syncEredivisiePlayers().then(result => {
    logger.info('Achtergrond sync voltooid', result)
  }).catch(err => {
    logger.error('Achtergrond sync mislukt', { err })
  })
})

// POST /admin/seasons/:id/end — sluit seizoen af en deel beloningen uit
router.post('/seasons/:id/end', async (req: AuthRequest, res: Response): Promise<void> => {
  const seasonId = parseInt(req.params.id)
  if (isNaN(seasonId)) { sendError(res, 'Ongeldig seizoen ID', 400); return }

  try {
    const season = await prisma.season.findUnique({ where: { id: seasonId } })
    if (!season) { sendError(res, 'Seizoen niet gevonden', 404); return }
    if (season.status === 'COMPLETED') { sendError(res, 'Seizoen al afgesloten', 400); return }

    // Markeer seizoen als afgesloten
    await prisma.season.update({ where: { id: seasonId }, data: { status: 'COMPLETED' } })

    // Verwerk beloningen
    await processSeasonEndRewards(seasonId)

    sendSuccess(res, { season_id: seasonId }, 'Seizoen afgesloten en beloningen uitgedeeld')
  } catch {
    sendError(res, 'Afsluiten mislukt', 500)
  }
})

// POST /admin/seasons/new-bonus — geef nieuw-seizoen bonus aan actieve gebruikers
router.post('/seasons/new-bonus', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await giveNewSeasonBonus()
    sendSuccess(res, { users_rewarded: count }, `Nieuw-seizoen bonus gegeven aan ${count} gebruikers`)
  } catch {
    sendError(res, 'Bonus uitdelen mislukt', 500)
  }
})

// GET /admin/seasons — overzicht van alle seizoenen
router.get('/seasons', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const seasons = await prisma.season.findMany({
      orderBy: { created_at: 'desc' },
      include: { _count: { select: { teams: true, gameweeks: true } } },
    })
    sendSuccess(res, seasons.map(s => ({
      id: s.id,
      name: s.name,
      status: s.status,
      competition: s.competition,
      start_date: s.start_date,
      end_date: s.end_date,
      total_pot: Number(s.total_pot),
      team_count: s._count.teams,
      gameweek_count: s._count.gameweeks,
    })))
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// POST /admin/seed-achievements
router.post('/seed-achievements', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await seedAchievements()
    sendSuccess(res, { count }, `${count} achievements aangemaakt/bijgewerkt`)
  } catch {
    sendError(res, 'Seed mislukt', 500)
  }
})

// GET /admin/matches — wedstrijden voor admin beheer (recent + upcoming)
router.get('/matches', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const matches = await prisma.match.findMany({
      where: {
        kickoff: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { kickoff: 'asc' },
      take: 50,
      include: {
        _count: { select: { predictions: true } },
      },
    })
    sendSuccess(res, matches.map(m => ({
      id: m.id,
      home_team: m.home_team,
      away_team: m.away_team,
      kickoff: m.kickoff,
      status: m.status,
      home_score: m.home_score,
      away_score: m.away_score,
      prediction_count: m._count.predictions,
    })))
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// PUT /admin/matches/:id/result — stel wedstrijdresultaat in + auto-score voorspellingen
router.put('/matches/:id/result', async (req: AuthRequest, res: Response): Promise<void> => {
  const { home_score, away_score } = req.body
  if (home_score == null || away_score == null || isNaN(Number(home_score)) || isNaN(Number(away_score))) {
    sendError(res, 'home_score en away_score verplicht', 400)
    return
  }
  try {
    const match = await prisma.match.update({
      where: { id: parseInt(req.params.id) },
      data: {
        home_score: parseInt(home_score),
        away_score: parseInt(away_score),
        status: 'FT',
      },
    })

    const unscored = await prisma.prediction.findMany({
      where: { match_id: match.id, scored: false },
    })

    function calcPoints(pred: { home_goals: number; away_goals: number }, result: { home_score: number; away_score: number }): number {
      if (pred.home_goals === result.home_score && pred.away_goals === result.away_score) return 8
      const predWinner = pred.home_goals > pred.away_goals ? 'H' : pred.home_goals < pred.away_goals ? 'A' : 'D'
      const realWinner = result.home_score > result.away_score ? 'H' : result.home_score < result.away_score ? 'A' : 'D'
      if (predWinner !== realWinner) return 0
      return predWinner === 'D' ? 1 : 3
    }

    for (const pred of unscored) {
      const pts = calcPoints(pred, { home_score: match.home_score!, away_score: match.away_score! })
      await prisma.prediction.update({
        where: { id: pred.id },
        data: { points: pts, scored: true },
      })
    }

    logger.info('Match result set + predictions scored', { matchId: match.id, home_score, away_score, scored: unscored.length })
    sendSuccess(res, { match_id: match.id, predictions_scored: unscored.length }, `Resultaat opgeslagen, ${unscored.length} voorspellingen gescoord`)
  } catch {
    sendError(res, 'Opslaan mislukt', 500)
  }
})

export default router
