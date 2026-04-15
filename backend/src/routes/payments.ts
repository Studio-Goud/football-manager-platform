import { Router, Response } from 'express'
import { body, validationResult } from 'express-validator'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/apiResponse'
import { authenticate, AuthRequest } from '../middleware/auth'
import { paymentLimiter } from '../middleware/rateLimiter'
import logger from '../config/logger'

const router = Router()

// ── Coin packages ─────────────────────────────────────────────────────────────
// Coins zijn intern en NIET inwisselbaar voor echt geld (geen kansspel)

export const COIN_PACKAGES = [
  { id: 'starter',  label: 'Starter',  price_eur: 5,  coins: 500,  bonus_pct: 0  },
  { id: 'pro',      label: 'Pro',      price_eur: 10, coins: 1100, bonus_pct: 10 },
  { id: 'elite',    label: 'Elite',    price_eur: 25, coins: 3000, bonus_pct: 20 },
  { id: 'legend',   label: 'Legend',   price_eur: 50, coins: 6500, bonus_pct: 30 },
]

// GET /payments/packages — beschikbare coin-pakketten
router.get('/packages', (_req, res) => {
  sendSuccess(res, COIN_PACKAGES)
})

// POST /payments/buy — coins kopen (simuleert een succesvolle betaling in dev)
router.post(
  '/buy',
  authenticate,
  paymentLimiter,
  [body('package_id').isString().notEmpty()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      sendError(res, 'Ongeldig pakket', 400)
      return
    }

    const pkg = COIN_PACKAGES.find(p => p.id === req.body.package_id)
    if (!pkg) {
      sendError(res, 'Pakket niet gevonden', 404)
      return
    }

    try {
      const [, user] = await prisma.$transaction([
        prisma.transaction.create({
          data: {
            user_id:       req.user!.id,
            type:          'DEPOSIT',
            amount:        pkg.price_eur,
            credits_amount: pkg.coins,
            description:   `${pkg.label} pakket — ${pkg.coins} coins`,
            status:        'COMPLETED',
          },
        }),
        prisma.user.update({
          where: { id: req.user!.id },
          data:  { balance_credits: { increment: pkg.coins } },
          select: { balance_credits: true },
        }),
      ])

      logger.info('Coins purchased', { userId: req.user!.id, package: pkg.id, coins: pkg.coins })
      sendSuccess(res, {
        coins_added: pkg.coins,
        new_balance: Number(user.balance_credits),
        package: pkg,
      }, `${pkg.coins} coins toegevoegd!`)
    } catch (err) {
      logger.error('Coin purchase failed', { err })
      sendError(res, 'Aankoop mislukt', 500)
    }
  }
)

// GET /payments/history
router.get('/history', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', per_page = '20' } = req.query
  const pageNum    = Math.max(1, parseInt(page as string))
  const perPageNum = Math.min(50, parseInt(per_page as string))

  try {
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where:   { user_id: req.user!.id },
        orderBy: { created_at: 'desc' },
        skip:    (pageNum - 1) * perPageNum,
        take:    perPageNum,
      }),
      prisma.transaction.count({ where: { user_id: req.user!.id } }),
    ])

    sendSuccess(res, {
      data: transactions.map(t => ({
        ...t,
        amount:         Number(t.amount),
        credits_amount: Number(t.credits_amount),
        type:           t.type.toLowerCase(),
        status:         t.status.toLowerCase(),
      })),
      total,
    })
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

export default router
