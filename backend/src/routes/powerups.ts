import { Router, Response } from 'express'
import { body, validationResult } from 'express-validator'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/apiResponse'
import { authenticate, AuthRequest } from '../middleware/auth'

const POWERUP_COSTS: Record<string, number> = {
  DOUBLE_POINTS: 5,
  NEGATIVE_SHIELD: 3,
  STREAK_BOOST: 8,
  HOT_TRANSFER: 2,
  CAPTAIN_LOCK: 4,
}

const router = Router()

// GET /powerups — catalog
router.get('/', authenticate, (_req: AuthRequest, res) => {
  sendSuccess(res, Object.entries(POWERUP_COSTS).map(([type, cost]) => ({
    type: type.toLowerCase(),
    cost,
    name: type.replace(/_/g, ' '),
  })))
})

// GET /powerups/my — user inventory
router.get('/my', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const powerups = await prisma.userPowerup.findMany({
      where: { user_id: req.user!.id },
      orderBy: { purchased_at: 'desc' },
    })
    sendSuccess(res, powerups.map(p => ({ ...p, powerup_type: p.powerup_type.toLowerCase(), status: p.status.toLowerCase() })))
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// POST /powerups/buy
router.post(
  '/buy',
  authenticate,
  [body('type').isIn(Object.keys(POWERUP_COSTS).map(k => k.toLowerCase()))],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      sendError(res, 'Ongeldig type', 400)
      return
    }

    const type = (req.body.type as string).toUpperCase()
    const cost = POWERUP_COSTS[type]

    try {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
      if (!user || Number(user.balance_credits) < cost) {
        sendError(res, 'Onvoldoende saldo', 402)
        return
      }

      const [powerup] = await prisma.$transaction([
        prisma.userPowerup.create({
          data: {
            user_id: req.user!.id,
            powerup_type: type as 'DOUBLE_POINTS' | 'NEGATIVE_SHIELD' | 'STREAK_BOOST' | 'HOT_TRANSFER' | 'CAPTAIN_LOCK',
          },
        }),
        prisma.user.update({
          where: { id: req.user!.id },
          data: { balance_credits: { decrement: cost } },
        }),
        prisma.transaction.create({
          data: {
            user_id: req.user!.id,
            type: 'POWERUP_PURCHASE',
            amount: -cost,
            credits_amount: -cost,
            description: `Power-up: ${type.replace(/_/g, ' ')}`,
            status: 'COMPLETED',
          },
        }),
      ])

      sendSuccess(res, powerup, 'Power-up gekocht!', 201)
    } catch {
      sendError(res, 'Aankoop mislukt', 500)
    }
  }
)

// POST /powerups/:id/activate
router.post('/:id/activate', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { gameweek_id } = req.body

  try {
    const powerup = await prisma.userPowerup.findFirst({
      where: { id: parseInt(req.params.id), user_id: req.user!.id, status: 'AVAILABLE' },
    })

    if (!powerup) {
      sendError(res, 'Power-up niet gevonden of al gebruikt', 404)
      return
    }

    await prisma.userPowerup.update({
      where: { id: powerup.id },
      data: { status: 'ACTIVE', gameweek_id: gameweek_id ? parseInt(gameweek_id) : undefined, used_at: new Date() },
    })

    sendSuccess(res, null, 'Power-up geactiveerd!')
  } catch {
    sendError(res, 'Activeren mislukt', 500)
  }
})

// ── Player Boosts ─────────────────────────────────────────────────────────────

const BOOST_COST = 50

// GET /powerups/boosts — actieve boosts van de gebruiker
router.get('/boosts', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const boosts = await prisma.playerBoost.findMany({
      where: { user_id: req.user!.id, active: true },
    })
    sendSuccess(res, boosts)
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// POST /powerups/boosts — boost een speler (50 coins, max 2 per GW, max 1 per speler)
router.post(
  '/boosts',
  authenticate,
  [
    body('player_id').isInt(),
    body('gameweek_id').optional().isInt(),
    body('type').optional().isIn(['DOUBLE_POINTS', 'CAPTAIN_LOCK']),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) { sendError(res, 'Ongeldige invoer', 400); return }

    const { player_id, gameweek_id, type = 'DOUBLE_POINTS' } = req.body

    try {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
      if (!user) { sendError(res, 'Gebruiker niet gevonden', 404); return }

      if (Number(user.balance_credits) < BOOST_COST) {
        sendError(res, `Onvoldoende coins (${BOOST_COST} benodigd)`, 400)
        return
      }

      // Hard cap: max 2 boosts per user per gameweek
      if (gameweek_id) {
        const gwBoostCount = await prisma.playerBoost.count({
          where: { user_id: req.user!.id, gameweek_id: parseInt(gameweek_id) },
        })
        if (gwBoostCount >= 2) {
          sendError(res, 'Maximum van 2 boosts per speelronde bereikt', 400)
          return
        }
      }

      // Max 1 boost per player per gameweek
      const playerBoostExists = await prisma.playerBoost.findFirst({
        where: { user_id: req.user!.id, player_id: parseInt(player_id), ...(gameweek_id ? { gameweek_id: parseInt(gameweek_id) } : {}) },
      })
      if (playerBoostExists) {
        sendError(res, 'Deze speler heeft al een boost deze speelronde', 409)
        return
      }

      await prisma.user.update({
        where: { id: req.user!.id },
        data: { balance_credits: { decrement: BOOST_COST } },
      })

      const boost = await prisma.playerBoost.create({
        data: {
          user_id: req.user!.id,
          player_id: parseInt(player_id),
          gameweek_id: gameweek_id ? parseInt(gameweek_id) : null,
          type,
        },
      })

      await prisma.transaction.create({
        data: {
          user_id: req.user!.id,
          type: 'powerup_purchase',
          amount: -BOOST_COST,
          credits_amount: -BOOST_COST,
          status: 'COMPLETED',
          description: `Player Boost (${type}) geactiveerd`,
        },
      })

      sendSuccess(res, boost, `Player Boost geactiveerd! (-${BOOST_COST} coins)`, 201)
    } catch {
      sendError(res, 'Boost activeren mislukt', 500)
    }
  }
)

export default router
