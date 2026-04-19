import { Router, Response } from 'express'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/apiResponse'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth'
import { syncEredivisiePlayers } from '../services/syncPlayersService'
import { processSeasonEndRewards, giveNewSeasonBonus } from '../services/seasonRewardService'
import { seedDemoDataForce } from '../seed-demo'
import { fixTeamForUser } from '../services/simulationService'
import { seedAchievements } from '../services/achievementService'
import { invalidateFixtureCache } from '../services/footballApiService'
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

// POST /admin/seed-competitions verwijderd (seedCompetities niet meer in gebruik)

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

// GET /admin/gameweeks — alle speelrondes van actief seizoen
router.get('/gameweeks', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const season = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })
    if (!season) { sendError(res, 'Geen actief seizoen', 404); return }

    const gameweeks = await prisma.gameweek.findMany({
      where: { season_id: season.id },
      orderBy: { number: 'asc' },
      include: { _count: { select: { matches: true, team_gameweeks: true } } },
    })

    sendSuccess(res, gameweeks.map(gw => ({
      id: gw.id,
      number: gw.number,
      status: gw.status,
      deadline: gw.deadline,
      start_date: gw.start_date,
      end_date: gw.end_date,
      match_count: gw._count.matches,
      team_count: gw._count.team_gameweeks,
    })))
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// POST /admin/gameweeks/:id/activate — activeer een speelronde
router.post('/gameweeks/:id/activate', async (req: AuthRequest, res: Response): Promise<void> => {
  const gwId = parseInt(req.params.id)
  try {
    const season = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })
    if (season) {
      await prisma.gameweek.updateMany({ where: { season_id: season.id, status: 'ACTIVE' }, data: { status: 'FINISHED' } })
    }
    const gw = await prisma.gameweek.update({ where: { id: gwId }, data: { status: 'ACTIVE' } })
    sendSuccess(res, { id: gw.id, number: gw.number }, `Speelronde ${gw.number} geactiveerd`)
  } catch {
    sendError(res, 'Activeren mislukt', 500)
  }
})

// POST /admin/gameweeks/create — maak nieuwe speelronde aan
router.post('/gameweeks/create', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const season = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })
    if (!season) { sendError(res, 'Geen actief seizoen', 404); return }

    const lastGw = await prisma.gameweek.findFirst({
      where: { season_id: season.id },
      orderBy: { number: 'desc' },
    })
    const nextNumber = (lastGw?.number ?? 0) + 1
    const now = new Date()
    const deadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const gw = await prisma.gameweek.create({
      data: {
        season_id: season.id,
        number: nextNumber,
        deadline,
        start_date: deadline,
        end_date: new Date(deadline.getTime() + 7 * 24 * 60 * 60 * 1000),
        status: 'UPCOMING',
      },
    })
    sendSuccess(res, { id: gw.id, number: gw.number }, `Speelronde ${gw.number} aangemaakt`)
  } catch {
    sendError(res, 'Aanmaken mislukt', 500)
  }
})

// POST /admin/invalidate-cache — leeg wedstrijd cache (toont KNVB Beker e.a. direct)
router.post('/invalidate-cache', async (_req: AuthRequest, res: Response): Promise<void> => {
  invalidateFixtureCache()
  sendSuccess(res, null, 'Wedstrijd cache geleegd — volgende request haalt verse data op')
})

// POST /admin/gameweeks/extend-deadline — verleng actieve GW deadline met 7 dagen
router.post('/gameweeks/extend-deadline', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const season = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })
    if (!season) { sendError(res, 'Geen actief seizoen', 404); return }

    const gw = await prisma.gameweek.findFirst({
      where: { season_id: season.id, status: 'ACTIVE' },
      orderBy: { number: 'desc' },
    })
    if (!gw) { sendError(res, 'Geen actieve speelronde', 404); return }

    const newDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await prisma.gameweek.update({
      where: { id: gw.id },
      data: { deadline: newDeadline },
    })
    sendSuccess(res, { deadline: newDeadline }, `GW${gw.number} deadline verlengd naar ${newDeadline.toLocaleDateString('nl-NL')}`)
  } catch {
    sendError(res, 'Verlengen mislukt', 500)
  }
})

// POST /admin/seed-marketplace — voeg demo listings toe zodat markt niet leeg is
router.post('/seed-marketplace', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const players = await prisma.player.findMany({
      where: { availability: 'AVAILABLE' },
      orderBy: { form: 'desc' },
      take: 20,
    })
    if (players.length === 0) { sendError(res, 'Geen spelers beschikbaar — sync eerst', 400); return }

    // Gebruik testaccount als verkoper
    const seller = await prisma.user.findFirst({ where: { is_admin: true } })
    if (!seller) { sendError(res, 'Geen admin user gevonden', 404); return }

    let created = 0
    for (const player of players.slice(0, 10)) {
      const existing = await prisma.marketplaceListing.findFirst({
        where: { player_id: player.id, status: 'ACTIVE' },
      })
      if (existing) continue

      await prisma.marketplaceListing.create({
        data: {
          seller_id: seller.id,
          player_id: player.id,
          listing_type: 'FIXED',
          price: Number(player.price) * 1.05,
          status: 'ACTIVE',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })
      created++
    }
    sendSuccess(res, { created }, `${created} demo listings aangemaakt op de markt`)
  } catch {
    sendError(res, 'Seeden mislukt', 500)
  }
})

// POST /admin/bootstrap-all — vult het platform met 100 Eredivisie spelers + seizoen + markt
router.post('/bootstrap-all', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const eredivisieClubs = [
      { name: 'Ajax', abbr: 'AJX' },
      { name: 'PSV', abbr: 'PSV' },
      { name: 'Feyenoord', abbr: 'FEY' },
      { name: 'AZ', abbr: 'AZ' },
      { name: 'FC Utrecht', abbr: 'UTR' },
      { name: 'FC Twente', abbr: 'TWE' },
      { name: 'Vitesse', abbr: 'VIT' },
      { name: 'SC Heerenveen', abbr: 'HEE' },
      { name: 'Sparta Rotterdam', abbr: 'SPA' },
      { name: 'NEC Nijmegen', abbr: 'NEC' },
    ]

    const playerTemplates: { name: string; display_name: string; position: string; price: number; form: number; club: string }[] = [
      // Ajax
      { name: 'Remko Pasveer', display_name: 'Pasveer', position: 'GK', price: 5.0, form: 6.8, club: 'Ajax' },
      { name: 'Devyne Rensch', display_name: 'Rensch', position: 'DEF', price: 6.5, form: 7.1, club: 'Ajax' },
      { name: 'Jorrel Hato', display_name: 'Hato', position: 'DEF', price: 7.5, form: 7.5, club: 'Ajax' },
      { name: 'Youri Baas', display_name: 'Baas', position: 'DEF', price: 5.5, form: 6.5, club: 'Ajax' },
      { name: 'Branco van den Boomen', display_name: 'Van den Boomen', position: 'MID', price: 8.0, form: 7.8, club: 'Ajax' },
      { name: 'Kenneth Taylor', display_name: 'Taylor', position: 'MID', price: 7.5, form: 7.4, club: 'Ajax' },
      { name: 'Kian Fitz-Jim', display_name: 'Fitz-Jim', position: 'MID', price: 7.0, form: 7.2, club: 'Ajax' },
      { name: 'Wout Weghorst', display_name: 'Weghorst', position: 'FWD', price: 10.5, form: 8.2, club: 'Ajax' },
      { name: 'Bertrand Traoré', display_name: 'Traoré', position: 'FWD', price: 9.0, form: 7.9, club: 'Ajax' },
      { name: 'Chuba Akpom', display_name: 'Akpom', position: 'FWD', price: 9.5, form: 8.0, club: 'Ajax' },
      // PSV
      { name: 'Walter Benítez', display_name: 'Benítez', position: 'GK', price: 6.5, form: 7.5, club: 'PSV' },
      { name: 'Rick Karsdorp', display_name: 'Karsdorp', position: 'DEF', price: 6.0, form: 7.0, club: 'PSV' },
      { name: 'Ryan Flamingo', display_name: 'Flamingo', position: 'DEF', price: 7.0, form: 7.3, club: 'PSV' },
      { name: 'Olivier Boscagli', display_name: 'Boscagli', position: 'DEF', price: 6.5, form: 7.1, club: 'PSV' },
      { name: 'Guus Til', display_name: 'Til', position: 'MID', price: 8.5, form: 8.0, club: 'PSV' },
      { name: 'Joey Veerman', display_name: 'Veerman', position: 'MID', price: 9.0, form: 8.3, club: 'PSV' },
      { name: 'Malik Tillman', display_name: 'Tillman', position: 'MID', price: 8.5, form: 7.9, club: 'PSV' },
      { name: 'Luuk de Jong', display_name: 'De Jong', position: 'FWD', price: 11.0, form: 8.8, club: 'PSV' },
      { name: 'Ricardo Pepi', display_name: 'Pepi', position: 'FWD', price: 9.5, form: 8.1, club: 'PSV' },
      { name: 'Johan Bakayoko', display_name: 'Bakayoko', position: 'FWD', price: 10.0, form: 8.5, club: 'PSV' },
      // Feyenoord
      { name: 'Timon Wellenreuther', display_name: 'Wellenreuther', position: 'GK', price: 5.5, form: 7.0, club: 'Feyenoord' },
      { name: 'Bart Nieuwkoop', display_name: 'Nieuwkoop', position: 'DEF', price: 5.5, form: 6.8, club: 'Feyenoord' },
      { name: 'Gernot Trauner', display_name: 'Trauner', position: 'DEF', price: 6.5, form: 7.2, club: 'Feyenoord' },
      { name: 'David Hancko', display_name: 'Hancko', position: 'DEF', price: 7.5, form: 7.6, club: 'Feyenoord' },
      { name: 'Quinten Timber', display_name: 'Q.Timber', position: 'MID', price: 8.0, form: 7.8, club: 'Feyenoord' },
      { name: 'Gjivai Zechiël', display_name: 'Zechiël', position: 'MID', price: 7.5, form: 7.5, club: 'Feyenoord' },
      { name: 'Ramiz Zerrouki', display_name: 'Zerrouki', position: 'MID', price: 7.0, form: 7.3, club: 'Feyenoord' },
      { name: 'Santiago Giménez', display_name: 'Giménez', position: 'FWD', price: 12.0, form: 9.1, club: 'Feyenoord' },
      { name: 'Ayase Ueda', display_name: 'Ueda', position: 'FWD', price: 10.0, form: 8.2, club: 'Feyenoord' },
      { name: 'Igor Paixão', display_name: 'Paixão', position: 'FWD', price: 9.5, form: 8.3, club: 'Feyenoord' },
      // AZ
      { name: 'Rome-Jaylen Owusu-Oduro', display_name: 'Owusu-Oduro', position: 'GK', price: 5.0, form: 6.5, club: 'AZ' },
      { name: 'Maximiliano Wittek', display_name: 'Wittek', position: 'DEF', price: 5.5, form: 6.7, club: 'AZ' },
      { name: 'Theo Malezyeux', display_name: 'Malezyeux', position: 'DEF', price: 5.5, form: 6.6, club: 'AZ' },
      { name: 'Milos Kerkez', display_name: 'Kerkez', position: 'DEF', price: 7.0, form: 7.4, club: 'AZ' },
      { name: 'Tijjani Reijnders', display_name: 'Reijnders', position: 'MID', price: 9.5, form: 8.4, club: 'AZ' },
      { name: 'Sven Mijnans', display_name: 'Mijnans', position: 'MID', price: 7.0, form: 7.2, club: 'AZ' },
      { name: 'Dani de Wit', display_name: 'De Wit', position: 'MID', price: 7.5, form: 7.5, club: 'AZ' },
      { name: 'Vangelis Pavlidis', display_name: 'Pavlidis', position: 'FWD', price: 11.5, form: 9.0, club: 'AZ' },
      { name: 'Jens Odgaard', display_name: 'Odgaard', position: 'FWD', price: 9.0, form: 7.9, club: 'AZ' },
      { name: 'Mees Römer', display_name: 'Römer', position: 'FWD', price: 7.5, form: 7.3, club: 'AZ' },
      // FC Utrecht
      { name: 'Vasilis Barkas', display_name: 'Barkas', position: 'GK', price: 5.0, form: 6.6, club: 'FC Utrecht' },
      { name: 'Souffian El Karouani', display_name: 'El Karouani', position: 'DEF', price: 5.5, form: 6.8, club: 'FC Utrecht' },
      { name: 'Jens Toornstra', display_name: 'Toornstra', position: 'MID', price: 7.0, form: 7.3, club: 'FC Utrecht' },
      { name: 'Django Warmerdam', display_name: 'Warmerdam', position: 'MID', price: 6.5, form: 7.0, club: 'FC Utrecht' },
      { name: 'Anastasios Douvikas', display_name: 'Douvikas', position: 'FWD', price: 9.5, form: 8.2, club: 'FC Utrecht' },
      // FC Twente
      { name: 'Lars Unnerstall', display_name: 'Unnerstall', position: 'GK', price: 5.5, form: 7.1, club: 'FC Twente' },
      { name: 'Mees Hilgers', display_name: 'Hilgers', position: 'DEF', price: 6.5, form: 7.3, club: 'FC Twente' },
      { name: 'Sem Steijn', display_name: 'Steijn', position: 'MID', price: 8.5, form: 8.1, club: 'FC Twente' },
      { name: 'Michel Vlap', display_name: 'Vlap', position: 'MID', price: 7.5, form: 7.6, club: 'FC Twente' },
      { name: 'Ricky van Wolfswinkel', display_name: 'Van Wolfswinkel', position: 'FWD', price: 8.5, form: 7.8, club: 'FC Twente' },
      // Vitesse
      { name: 'Markus Schubert', display_name: 'Schubert', position: 'GK', price: 4.5, form: 6.2, club: 'Vitesse' },
      { name: 'Bram Nuytinck', display_name: 'Nuytinck', position: 'DEF', price: 5.0, form: 6.4, club: 'Vitesse' },
      { name: 'Million Manhoef', display_name: 'Manhoef', position: 'MID', price: 7.0, form: 7.2, club: 'Vitesse' },
      { name: 'Loïs Openda', display_name: 'Openda', position: 'FWD', price: 10.5, form: 8.6, club: 'Vitesse' },
      { name: 'Lois Openda', display_name: 'Openda Jr', position: 'FWD', price: 8.0, form: 7.5, club: 'Vitesse' },
      // SC Heerenveen
      { name: 'Andries Noppert', display_name: 'Noppert', position: 'GK', price: 5.5, form: 7.0, club: 'SC Heerenveen' },
      { name: 'Sven van Beek', display_name: 'Van Beek', position: 'DEF', price: 5.5, form: 6.8, club: 'SC Heerenveen' },
      { name: 'Damie van den Bemd', display_name: 'Van den Bemd', position: 'MID', price: 6.0, form: 6.9, club: 'SC Heerenveen' },
      { name: 'Amin Sarr', display_name: 'Sarr', position: 'FWD', price: 8.5, form: 7.7, club: 'SC Heerenveen' },
      { name: 'Sydney van Hooijdonk', display_name: 'Van Hooijdonk', position: 'FWD', price: 9.0, form: 8.0, club: 'SC Heerenveen' },
      // Sparta Rotterdam
      { name: 'Nick Olij', display_name: 'Olij', position: 'GK', price: 5.0, form: 6.7, club: 'Sparta Rotterdam' },
      { name: 'Adil Auassar', display_name: 'Auassar', position: 'MID', price: 6.5, form: 7.0, club: 'Sparta Rotterdam' },
      { name: 'Tobias Lauritsen', display_name: 'Lauritsen', position: 'FWD', price: 8.0, form: 7.6, club: 'Sparta Rotterdam' },
      { name: 'Arno Verschueren', display_name: 'Verschueren', position: 'MID', price: 6.0, form: 6.8, club: 'Sparta Rotterdam' },
      // NEC Nijmegen
      { name: 'Robin Roefs', display_name: 'Roefs', position: 'GK', price: 5.0, form: 6.5, club: 'NEC Nijmegen' },
      { name: 'Calvin Verdonk', display_name: 'Verdonk', position: 'DEF', price: 5.5, form: 6.7, club: 'NEC Nijmegen' },
      { name: 'Bart van Rooij', display_name: 'Van Rooij', position: 'MID', price: 6.5, form: 7.0, club: 'NEC Nijmegen' },
      { name: 'Lasse Schöne', display_name: 'Schöne', position: 'MID', price: 7.0, form: 7.2, club: 'NEC Nijmegen' },
      { name: 'Elayis Tavsan', display_name: 'Tavsan', position: 'FWD', price: 8.0, form: 7.5, club: 'NEC Nijmegen' },
    ]

    let playersCreated = 0
    let playersSkipped = 0

    for (const p of playerTemplates) {
      const existing = await prisma.player.findFirst({ where: { name: p.name } })
      if (existing) { playersSkipped++; continue }
      await prisma.player.create({
        data: {
          name: p.name,
          display_name: p.display_name,
          position: p.position,
          club: p.club,
          price: p.price,
          form: p.form,
          availability: 'AVAILABLE',
          nationality: 'Netherlands',
          goals: Math.floor(Math.random() * 8),
          assists: Math.floor(Math.random() * 10),
          yellow_cards: Math.floor(Math.random() * 4),
          red_cards: 0,
          total_points: Math.floor(Math.random() * 80) + 20,
          ownership_percent: Math.random() * 40,
        },
      })
      playersCreated++
    }

    // Seizoen aanmaken als er geen actief seizoen is
    let season = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })
    if (!season) {
      season = await prisma.season.create({
        data: {
          name: 'Eredivisie 2024/2025',
          status: 'ACTIVE',
          start_date: new Date('2024-08-01'),
          end_date: new Date('2025-06-30'),
        },
      })
    }

    // Actieve gameweek aanmaken of deadline verlengen
    let gw = await prisma.gameweek.findFirst({
      where: { season_id: season.id, status: 'ACTIVE' },
      orderBy: { number: 'desc' },
    })
    const newDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 dagen
    if (!gw) {
      gw = await prisma.gameweek.create({
        data: {
          season_id: season.id,
          number: 28,
          status: 'ACTIVE',
          start_date: new Date(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          deadline: newDeadline,
        },
      })
    } else {
      await prisma.gameweek.update({
        where: { id: gw.id },
        data: { deadline: newDeadline },
      })
    }

    // Marktplaats vullen (top 20 spelers op form)
    const seller = await prisma.user.findFirst({ where: { is_admin: true } })
    let listingsCreated = 0
    if (seller) {
      const topPlayers = await prisma.player.findMany({
        where: { availability: 'AVAILABLE' },
        orderBy: { form: 'desc' },
        take: 20,
      })
      for (const player of topPlayers) {
        const existing = await prisma.marketplaceListing.findFirst({
          where: { player_id: player.id, status: 'ACTIVE' },
        })
        if (existing) continue
        await prisma.marketplaceListing.create({
          data: {
            seller_id: seller.id,
            player_id: player.id,
            listing_type: 'FIXED',
            price: Number(player.price) * 1.05,
            status: 'ACTIVE',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        })
        listingsCreated++
      }
    }

    sendSuccess(res, {
      players_created: playersCreated,
      players_skipped: playersSkipped,
      season: season.name,
      gameweek: `GW${gw.number}`,
      deadline: newDeadline,
      marketplace_listings: listingsCreated,
    }, `Bootstrap compleet! ${playersCreated} spelers, GW${gw.number} actief, ${listingsCreated} listings op markt`)
  } catch (err) {
    logger.error('Bootstrap mislukt', { err })
    sendError(res, 'Bootstrap mislukt', 500)
  }
})

export default router
