import { Router, Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import Stripe from 'stripe'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/apiResponse'
import { authenticate, AuthRequest } from '../middleware/auth'
import { paymentLimiter } from '../middleware/rateLimiter'
import { FINANCIAL_CONFIG } from '../config/constants'
import logger from '../config/logger'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
})

const router = Router()

// POST /payments/deposit
router.post(
  '/deposit',
  authenticate,
  paymentLimiter,
  [body('amount').isFloat({ min: FINANCIAL_CONFIG.MIN_DEPOSIT })],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      sendError(res, `Minimale storting €${FINANCIAL_CONFIG.MIN_DEPOSIT}`, 400)
      return
    }

    const { amount } = req.body

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // cents
        currency: 'eur',
        metadata: {
          user_id: req.user!.id,
          credits: amount.toString(),
        },
        description: `Football Manager Pro - Storting ${amount} credits`,
      })

      sendSuccess(res, {
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount,
      })
    } catch (err) {
      logger.error('Stripe payment intent creation failed', { err })
      sendError(res, 'Betaling aanmaken mislukt', 500)
    }
  }
)

// POST /payments/deposit/confirm
router.post('/deposit/confirm', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { payment_intent_id } = req.body

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)

    if (paymentIntent.status !== 'succeeded') {
      sendError(res, 'Betaling niet geslaagd', 400)
      return
    }

    if (paymentIntent.metadata.user_id !== req.user!.id) {
      sendError(res, 'Ongeautoriseerd', 403)
      return
    }

    const credits = parseFloat(paymentIntent.metadata.credits)

    // Check if already processed (idempotency)
    const existing = await prisma.transaction.findFirst({
      where: { reference: payment_intent_id },
    })

    if (existing) {
      sendSuccess(res, { amount: credits, new_balance: Number((await prisma.user.findUnique({ where: { id: req.user!.id } }))?.balance_credits) })
      return
    }

    const [, user] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          user_id: req.user!.id,
          type: 'DEPOSIT',
          amount: credits,
          credits_amount: credits,
          reference: payment_intent_id,
          description: `Storting via Stripe`,
          status: 'COMPLETED',
        },
      }),
      prisma.user.update({
        where: { id: req.user!.id },
        data: { balance_credits: { increment: credits } },
        select: { balance_credits: true },
      }),
    ])

    sendSuccess(res, { amount: credits, new_balance: Number(user.balance_credits) })
  } catch (err) {
    logger.error('Deposit confirmation failed', { err })
    sendError(res, 'Storting bevestigen mislukt', 500)
  }
})

// POST /payments/withdraw
router.post(
  '/withdraw',
  authenticate,
  paymentLimiter,
  [
    body('amount_credits').isFloat({ min: FINANCIAL_CONFIG.MIN_WITHDRAWAL }),
    body('bank_account').isIBAN(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      sendError(res, 'Ongeldige invoer', 400)
      return
    }

    const { amount_credits, bank_account } = req.body

    try {
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
      if (!user || Number(user.balance_credits) < amount_credits) {
        sendError(res, 'Onvoldoende saldo', 402)
        return
      }

      // Check if season is active (apply penalty)
      const activeSeason = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })
      const penalty = activeSeason ? amount_credits * FINANCIAL_CONFIG.EARLY_WITHDRAWAL_PENALTY : 0
      const netAmount = amount_credits - penalty

      const [, updatedUser] = await prisma.$transaction([
        prisma.transaction.create({
          data: {
            user_id: req.user!.id,
            type: 'WITHDRAWAL',
            amount: -amount_credits,
            credits_amount: -amount_credits,
            description: `Opname naar ${bank_account.slice(0, 8)}**** (${FINANCIAL_CONFIG.WITHDRAWAL_PROCESSING_DAYS} werkdagen)`,
            status: 'PENDING',
            metadata: { bank_account, net_amount: netAmount, penalty },
          },
        }),
        prisma.user.update({
          where: { id: req.user!.id },
          data: { balance_credits: { decrement: amount_credits } },
          select: { balance_credits: true },
        }),
      ])

      sendSuccess(res, {
        amount_credits,
        amount_eur: netAmount,
        penalty,
        new_balance: Number(updatedUser.balance_credits),
        processing_days: FINANCIAL_CONFIG.WITHDRAWAL_PROCESSING_DAYS,
      })
    } catch {
      sendError(res, 'Opname mislukt', 500)
    }
  }
)

// GET /payments/history
router.get('/history', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', per_page = '20', type } = req.query
  const pageNum = Math.max(1, parseInt(page as string))
  const perPageNum = Math.min(50, parseInt(per_page as string))

  try {
    const where: Record<string, unknown> = { user_id: req.user!.id }
    if (type) where.type = (type as string).toUpperCase()

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (pageNum - 1) * perPageNum,
        take: perPageNum,
      }),
      prisma.transaction.count({ where }),
    ])

    sendSuccess(res, {
      data: transactions.map(t => ({
        ...t,
        amount: Number(t.amount),
        type: t.type.toLowerCase(),
        status: t.status.toLowerCase(),
      })),
      total,
    })
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// POST /payments/stripe-webhook
router.post('/stripe-webhook', async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature']
  if (!sig) {
    res.status(400).send('No signature')
    return
  }

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      process.env.STRIPE_WEBHOOK_SECRET ?? ''
    )

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent
      logger.info('Payment succeeded via webhook', { id: pi.id, amount: pi.amount })
    }

    res.json({ received: true })
  } catch (err) {
    logger.error('Stripe webhook error', { err })
    res.status(400).send('Webhook error')
  }
})

export default router
