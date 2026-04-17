import { Router, Request, Response } from 'express'
import { body, validationResult } from 'express-validator'
import prisma from '../config/database'
import { hashPassword, comparePassword } from '../utils/password'
import { generateToken, generateRefreshToken, verifyToken } from '../utils/jwt'
import { sendSuccess, sendError } from '../utils/apiResponse'
import { authenticate, AuthRequest } from '../middleware/auth'
import { authLimiter } from '../middleware/rateLimiter'
import logger from '../config/logger'

const router = Router()

// POST /auth/register
router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('username').isLength({ min: 3, max: 30 }).trim(),
    body('accept_terms').isBoolean().equals('true'),
    body('age_confirmed').isBoolean().equals('true'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      sendError(res, 'Ongeldige invoer', 400, JSON.stringify(errors.array()))
      return
    }

    const { email, password, username } = req.body

    try {
      const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
      })

      if (existing) {
        sendError(res, 'E-mail of gebruikersnaam is al in gebruik', 409)
        return
      }

      const password_hash = await hashPassword(password)

      const user = await prisma.user.create({
        data: { email, password_hash, username, kyc_status: 'VERIFIED', kyc_level: 1 },
        select: { id: true, email: true, username: true, tier: true, balance_credits: true },
      })

      const access_token = generateToken({ userId: user.id, email: user.email, role: 'user' })
      const refresh_token = generateRefreshToken(user.id)

      logger.info('User registered', { userId: user.id, email })

      sendSuccess(res, {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          balance_credits: Number(user.balance_credits),
          tier: user.tier.toLowerCase(),
          kyc_status: 'verified',
          role: 'user',
        },
        access_token,
        refresh_token,
        expires_in: 86400,
      }, 'Account aangemaakt', 201)
    } catch (err) {
      logger.error('Register error', { err })
      sendError(res, 'Registratie mislukt', 500)
    }
  }
)

// POST /auth/login
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      sendError(res, 'Ongeldige invoer', 400)
      return
    }

    const { email, password } = req.body

    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true, email: true, username: true, password_hash: true,
          tier: true, kyc_status: true, balance_credits: true,
          is_suspended: true, is_admin: true,
        },
      })

      if (!user || !(await comparePassword(password, user.password_hash))) {
        sendError(res, 'Ongeldige inloggegevens', 401)
        return
      }

      if (user.is_suspended) {
        sendError(res, 'Account gesuspendeerd', 403)
        return
      }

      const role = user.is_admin ? 'admin' : 'user'
      const access_token = generateToken({ userId: user.id, email: user.email, role })
      const refresh_token = generateRefreshToken(user.id)

      // Update last_active
      await prisma.user.update({
        where: { id: user.id },
        data: { last_active: new Date() },
      })

      sendSuccess(res, {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          balance_credits: Number(user.balance_credits),
          tier: user.tier.toLowerCase(),
          kyc_status: 'verified',
          role,
        },
        access_token,
        refresh_token,
        expires_in: 86400,
      })
    } catch (err) {
      logger.error('Login error', { err })
      sendError(res, 'Inloggen mislukt', 500)
    }
  }
)

// GET /auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, email: true, username: true, tier: true,
        kyc_status: true, balance_credits: true, is_admin: true,
        created_at: true, last_active: true,
      },
    })

    if (!user) {
      sendError(res, 'Gebruiker niet gevonden', 404)
      return
    }

    sendSuccess(res, {
      id: user.id,
      email: user.email,
      username: user.username,
      balance_credits: Number(user.balance_credits),
      tier: user.tier.toLowerCase(),
      kyc_status: user.kyc_status.toLowerCase(),
      role: user.is_admin ? 'admin' : 'user',
      created_at: user.created_at,
      last_active: user.last_active,
    })
  } catch (err) {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// POST /auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  sendSuccess(res, null, 'Uitgelogd')
})

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const { refresh_token } = req.body
  if (!refresh_token) {
    sendError(res, 'Refresh token vereist', 400)
    return
  }

  try {
    const payload = verifyToken(refresh_token)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, is_admin: true },
    })

    if (!user) {
      sendError(res, 'Gebruiker niet gevonden', 401)
      return
    }

    const access_token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.is_admin ? 'admin' : 'user',
    })

    sendSuccess(res, { access_token, expires_in: 86400 })
  } catch {
    sendError(res, 'Ongeldig refresh token', 401)
  }
})

// POST /auth/daily-bonus — claim 50 coins once per calendar day
router.post('/daily-bonus', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const alreadyClaimed = await prisma.transaction.findFirst({
      where: {
        user_id: userId,
        type: 'daily_bonus',
        created_at: { gte: today },
      },
    })

    if (alreadyClaimed) {
      sendSuccess(res, { claimed: false, message: 'Al geclaimd vandaag' })
      return
    }

    // Calculate streak: count consecutive days with daily_bonus
    const recentBonuses = await prisma.transaction.findMany({
      where: { user_id: userId, type: 'daily_bonus' },
      orderBy: { created_at: 'desc' },
      take: 30,
    })

    let streak = 1
    const todayMidnight = new Date()
    todayMidnight.setHours(0, 0, 0, 0)

    for (let i = 0; i < recentBonuses.length; i++) {
      const bonusDay = new Date(recentBonuses[i].created_at)
      bonusDay.setHours(0, 0, 0, 0)
      const expected = new Date(todayMidnight)
      expected.setDate(expected.getDate() - (i + 1))
      if (bonusDay.getTime() === expected.getTime()) {
        streak++
      } else {
        break
      }
    }

    const bonus = Math.min(50 + (streak - 1) * 10, 200) // Scale: 50→200 coins based on streak
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { balance_credits: { increment: bonus } },
      }),
      prisma.transaction.create({
        data: {
          user_id: userId,
          type: 'daily_bonus',
          amount: 0,
          credits_amount: bonus,
          status: 'COMPLETED',
          description: `Dagelijkse inlogbonus (dag ${streak})`,
        },
      }),
    ])

    sendSuccess(res, { claimed: true, bonus, streak, message: `Je hebt ${bonus} coins ontvangen! (Dag ${streak} streak)` })
  } catch {
    sendError(res, 'Bonus claimen mislukt', 500)
  }
})

export default router
