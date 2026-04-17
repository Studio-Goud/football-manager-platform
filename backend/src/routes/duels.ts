import { Router, Response } from 'express'
import { body, validationResult } from 'express-validator'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/apiResponse'
import { authenticate, AuthRequest } from '../middleware/auth'
import { calculatePlayerPoints, TACTIC_MULTIPLIERS, TacticStyle } from '../services/scoringService'

const router = Router()

const VALID_TACTICS: TacticStyle[] = ['BALANCED', 'HIGH_PRESS', 'LOW_BLOCK', 'TIKI_TAKA', 'COUNTER_ATTACK', 'LONG_BALL']

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuel(duel: any, userId: string) {
  const iAmChallenger = duel.challenger_id === userId
  return {
    id: duel.id,
    status: duel.status,
    stake: Number(duel.stake),
    gameweek_id: duel.gameweek_id,
    message: duel.message,
    created_at: duel.created_at,
    i_am: iAmChallenger ? 'challenger' : 'opponent',
    my_tactic: iAmChallenger ? duel.challenger_tactic : duel.opponent_tactic,
    opponent_tactic: iAmChallenger ? duel.opponent_tactic : duel.challenger_tactic,
    my_points: Number(iAmChallenger ? duel.challenger_points : duel.opponent_points),
    opponent_points: Number(iAmChallenger ? duel.opponent_points : duel.challenger_points),
    winner_id: duel.winner_id,
    i_won: duel.winner_id === userId,
    me: iAmChallenger
      ? { id: duel.challenger.id, username: duel.challenger.username, tier: duel.challenger.tier }
      : { id: duel.opponent.id,   username: duel.opponent.username,   tier: duel.opponent.tier },
    opponent: iAmChallenger
      ? { id: duel.opponent.id,   username: duel.opponent.username,   tier: duel.opponent.tier }
      : { id: duel.challenger.id, username: duel.challenger.username, tier: duel.challenger.tier },
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /duels/pending-count — number of pending incoming challenges
router.get('/pending-count', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await prisma.duel.count({
      where: { opponent_id: req.user!.id, status: 'PENDING' },
    })
    sendSuccess(res, { count })
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// GET /duels — all my duels (incoming + outgoing)
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const duels = await prisma.duel.findMany({
      where: {
        OR: [{ challenger_id: req.user!.id }, { opponent_id: req.user!.id }],
      },
      include: {
        challenger: { select: { id: true, username: true, tier: true } },
        opponent:   { select: { id: true, username: true, tier: true } },
        gameweek:   { select: { id: true, number: true, status: true } },
      },
      orderBy: { created_at: 'desc' },
    })

    sendSuccess(res, duels.map(d => formatDuel(d, req.user!.id)))
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// POST /duels — uitdaging sturen
router.post(
  '/',
  authenticate,
  [
    body('opponent_username').isString().trim().notEmpty(),
    body('stake').isFloat({ min: 0, max: 500 }),
    body('message').optional().isString().isLength({ max: 140 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      sendError(res, 'Ongeldige invoer', 400)
      return
    }

    const { opponent_username, stake, message } = req.body

    try {
      // Find opponent
      const opponent = await prisma.user.findUnique({ where: { username: opponent_username } })
      if (!opponent) {
        sendError(res, 'Speler niet gevonden', 404)
        return
      }
      if (opponent.id === req.user!.id) {
        sendError(res, 'Je kunt jezelf niet uitdagen', 400)
        return
      }

      // Get current gameweek
      const gameweek = await prisma.gameweek.findFirst({
        where: { status: { in: ['UPCOMING', 'LIVE'] } },
        orderBy: { number: 'asc' },
      })
      if (!gameweek) {
        sendError(res, 'Geen actieve speelronde', 400)
        return
      }

      // Check challenger balance if stake > 0
      if (stake > 0) {
        const challenger = await prisma.user.findUnique({ where: { id: req.user!.id } })
        if (!challenger || Number(challenger.balance_credits) < stake) {
          sendError(res, 'Onvoldoende saldo', 402)
          return
        }
      }

      // Find both teams (most recent)
      const [challengerTeam, opponentTeam] = await Promise.all([
        prisma.team.findFirst({ where: { user_id: req.user!.id }, orderBy: { created_at: 'desc' } }),
        prisma.team.findFirst({ where: { user_id: opponent.id }, orderBy: { created_at: 'desc' } }),
      ])

      if (!challengerTeam) {
        sendError(res, 'Je hebt nog geen team aangemaakt', 400)
        return
      }
      if (!opponentTeam) {
        sendError(res, `${opponent_username} heeft nog geen team`, 400)
        return
      }

      // Check no open duel between these two for this gameweek
      const existing = await prisma.duel.findFirst({
        where: {
          gameweek_id: gameweek.id,
          status: { in: ['PENDING', 'ACCEPTED', 'LIVE'] },
          OR: [
            { challenger_id: req.user!.id, opponent_id: opponent.id },
            { challenger_id: opponent.id,  opponent_id: req.user!.id },
          ],
        },
      })
      if (existing) {
        sendError(res, 'Er is al een open duel met deze speler deze speelronde', 409)
        return
      }

      const duel = await prisma.duel.create({
        data: {
          challenger_id:      req.user!.id,
          opponent_id:        opponent.id,
          challenger_team_id: challengerTeam.id,
          opponent_team_id:   opponentTeam.id,
          gameweek_id:        gameweek.id,
          challenger_tactic:  challengerTeam.tactic_style,
          opponent_tactic:    opponentTeam.tactic_style,
          stake:              stake ?? 0,
          message:            message ?? null,
        },
        include: {
          challenger: { select: { id: true, username: true, tier: true } },
          opponent:   { select: { id: true, username: true, tier: true } },
          gameweek:   { select: { id: true, number: true, status: true } },
        },
      })

      sendSuccess(res, formatDuel(duel, req.user!.id), 'Uitdaging verstuurd!', 201)
    } catch {
      sendError(res, 'Versturen mislukt', 500)
    }
  }
)

// PATCH /duels/:id/respond — accepteren of weigeren
router.patch(
  '/:id/respond',
  authenticate,
  [body('action').isIn(['ACCEPT', 'DECLINE'])],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      sendError(res, 'Ongeldige actie', 400)
      return
    }

    try {
      const duel = await prisma.duel.findUnique({
        where: { id: req.params.id },
        include: {
          challenger: { select: { id: true, username: true, tier: true } },
          opponent:   { select: { id: true, username: true, tier: true } },
          gameweek:   { select: { id: true, number: true, status: true } },
        },
      })

      if (!duel) {
        sendError(res, 'Duel niet gevonden', 404)
        return
      }
      if (duel.opponent_id !== req.user!.id) {
        sendError(res, 'Alleen de uitgedaagde kan reageren', 403)
        return
      }
      if (duel.status !== 'PENDING') {
        sendError(res, 'Duel is niet meer in afwachting', 400)
        return
      }

      const newStatus = req.body.action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED'

      // Reserve stake from both players if accepted
      if (newStatus === 'ACCEPTED' && Number(duel.stake) > 0) {
        const [challenger, opponent] = await Promise.all([
          prisma.user.findUnique({ where: { id: duel.challenger_id } }),
          prisma.user.findUnique({ where: { id: duel.opponent_id } }),
        ])
        const stake = Number(duel.stake)
        if (!challenger || Number(challenger.balance_credits) < stake) {
          sendError(res, 'Uitdager heeft onvoldoende saldo', 402)
          return
        }
        if (!opponent || Number(opponent.balance_credits) < stake) {
          sendError(res, 'Je hebt onvoldoende saldo', 402)
          return
        }
        await prisma.$transaction([
          prisma.user.update({ where: { id: duel.challenger_id }, data: { balance_pending: { increment: stake } } }),
          prisma.user.update({ where: { id: duel.opponent_id },   data: { balance_pending: { increment: stake } } }),
        ])
      }

      const updated = await prisma.duel.update({
        where: { id: duel.id },
        data: { status: newStatus, updated_at: new Date() },
        include: {
          challenger: { select: { id: true, username: true, tier: true } },
          opponent:   { select: { id: true, username: true, tier: true } },
          gameweek:   { select: { id: true, number: true, status: true } },
        },
      })

      const msg = newStatus === 'ACCEPTED' ? 'Duel geaccepteerd! Laat het spel beginnen.' : 'Duel geweigerd.'
      sendSuccess(res, formatDuel(updated, req.user!.id), msg)
    } catch {
      sendError(res, 'Verwerken mislukt', 500)
    }
  }
)

// Internal: score a duel after gameweek completion (called by job/admin)
export async function scoreDuel(duelId: string): Promise<void> {
  const duel = await prisma.duel.findUnique({
    where: { id: duelId },
    include: {
      gameweek: { include: { matches: { include: { performances: true } } } },
    },
  })

  if (!duel || duel.status !== 'ACCEPTED') return

  async function calcPoints(teamId: string, tactic: TacticStyle): Promise<number> {
    const teamPlayers = await prisma.teamPlayer.findMany({
      where: { team_id: teamId },
      include: { player: true },
    })

    let total = 0
    for (const tp of teamPlayers) {
      if (tp.slot_position.startsWith('BENCH')) continue
      const perf = duel!.gameweek.matches
        .flatMap(m => m.performances)
        .find(p => p.player_id === tp.player_id)
      if (!perf) continue

      let pts = calculatePlayerPoints(
        {
          minutes_played: perf.minutes_played,
          goals: perf.goals,
          assists: perf.assists,
          clean_sheet: perf.clean_sheet,
          yellow_cards: perf.yellow_cards,
          red_cards: perf.red_cards,
          own_goals: perf.own_goals,
          saves: perf.saves,
          penalty_saved: perf.penalty_saved,
          penalty_missed: perf.penalty_missed,
          rating: perf.rating ? Number(perf.rating) : null,
        },
        tp.player.position,
        tactic
      )
      if (tp.is_captain) pts *= 2.0
      else if (tp.is_vice_captain) pts *= 1.5
      total += pts
    }
    return Math.round(total * 100) / 100
  }

  const [challengerPts, opponentPts] = await Promise.all([
    calcPoints(duel.challenger_team_id, duel.challenger_tactic as TacticStyle),
    calcPoints(duel.opponent_team_id,   duel.opponent_tactic   as TacticStyle),
  ])

  const winnerId = challengerPts > opponentPts
    ? duel.challenger_id
    : opponentPts > challengerPts
      ? duel.opponent_id
      : null // draw

  const stake = Number(duel.stake)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any[] = [
    prisma.duel.update({
      where: { id: duelId },
      data: {
        status: 'COMPLETED',
        challenger_points: challengerPts,
        opponent_points: opponentPts,
        winner_id: winnerId,
        updated_at: new Date(),
      },
    }),
  ]

  // Settle stake
  if (stake > 0 && winnerId) {
    const loserId = winnerId === duel.challenger_id ? duel.opponent_id : duel.challenger_id
    updates.push(
      prisma.user.update({ where: { id: winnerId }, data: { balance_credits: { increment: stake }, balance_pending: { decrement: stake } } }),
      prisma.user.update({ where: { id: loserId },  data: { balance_credits: { decrement: stake }, balance_pending: { decrement: stake } } }),
    )
  } else if (stake > 0) {
    // Draw: refund both
    updates.push(
      prisma.user.update({ where: { id: duel.challenger_id }, data: { balance_pending: { decrement: stake } } }),
      prisma.user.update({ where: { id: duel.opponent_id },   data: { balance_pending: { decrement: stake } } }),
    )
  }

  await prisma.$transaction(updates)
}

// GET /duels/:id — duel detail
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const duel = await prisma.duel.findUnique({
      where: { id: req.params.id },
      include: {
        challenger: { select: { id: true, username: true, tier: true } },
        opponent:   { select: { id: true, username: true, tier: true } },
        gameweek:   { select: { id: true, number: true, status: true } },
      },
    })

    if (!duel) { sendError(res, 'Niet gevonden', 404); return }
    if (duel.challenger_id !== req.user!.id && duel.opponent_id !== req.user!.id) {
      sendError(res, 'Geen toegang', 403); return
    }

    sendSuccess(res, formatDuel(duel, req.user!.id))
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

export default router
