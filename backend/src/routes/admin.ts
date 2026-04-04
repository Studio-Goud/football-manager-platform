import { Router, Response } from 'express'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/apiResponse'
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()

router.use(authenticate, requireAdmin)

// GET /admin/stats
router.get('/stats', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [totalUsers, totalDeposits, totalPayouts, pendingKyc, activeThisWeek] = await Promise.all([
      prisma.user.count(),
      prisma.transaction.aggregate({ where: { type: 'DEPOSIT', status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { type: 'WITHDRAWAL', status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.user.count({ where: { kyc_status: 'SUBMITTED' } }),
      prisma.user.count({ where: { last_active: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    ])

    const deposits = Math.abs(Number(totalDeposits._sum.amount ?? 0))
    const payouts = Math.abs(Number(totalPayouts._sum.amount ?? 0))
    const platformRevenue = deposits * 0.2 - payouts

    sendSuccess(res, {
      total_users: totalUsers,
      active_this_week: activeThisWeek,
      total_deposits: deposits,
      total_payouts: payouts,
      platform_revenue: platformRevenue,
      pending_kyc: pendingKyc,
      suspicious_activity_count: 3, // TODO: real detection
    })
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// GET /admin/users
router.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  const { search, page = '1', per_page = '20', kyc_status } = req.query
  const pageNum = Math.max(1, parseInt(page as string))
  const perPageNum = Math.min(50, parseInt(per_page as string))

  try {
    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (kyc_status) where.kyc_status = (kyc_status as string).toUpperCase()

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, username: true, tier: true,
          kyc_status: true, balance_credits: true, is_suspended: true,
          created_at: true, last_active: true,
        },
        orderBy: { created_at: 'desc' },
        skip: (pageNum - 1) * perPageNum,
        take: perPageNum,
      }),
      prisma.user.count({ where }),
    ])

    sendSuccess(res, { data: users, total })
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

// POST /admin/seasons
router.post('/seasons', async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, competition, start_date, end_date, entry_fee_min, entry_fee_max } = req.body

  try {
    const season = await prisma.season.create({
      data: {
        name,
        competition,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        entry_fee_min,
        entry_fee_max,
        status: 'UPCOMING',
      },
    })

    sendSuccess(res, season, 'Seizoen aangemaakt', 201)
  } catch {
    sendError(res, 'Aanmaken mislukt', 500)
  }
})

export default router
