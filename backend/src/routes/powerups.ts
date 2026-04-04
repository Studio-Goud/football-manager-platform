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

export default router
