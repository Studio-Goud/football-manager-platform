import { Router, Response } from 'express'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/apiResponse'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /sponsors — alle beschikbare sponsors
router.get('/', authenticate, async (_req, res: Response): Promise<void> => {
  try {
    const sponsors = await prisma.sponsor.findMany({
      where: { is_active: true },
      orderBy: { weekly_income: 'asc' },
    })
    sendSuccess(res, sponsors.map(s => ({ ...s, weekly_income: Number(s.weekly_income) })))
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// GET /sponsors/my — actieve sponsor van de gebruiker
router.get('/my', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const active = await prisma.userSponsor.findFirst({
      where: { user_id: req.user!.id, active: true },
      include: { sponsor: true },
    })
    sendSuccess(res, active ? { ...active, sponsor: { ...active.sponsor, weekly_income: Number(active.sponsor.weekly_income) } } : null)
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// POST /sponsors/:id/select — sponsor kiezen (wisselt huidige sponsor)
router.post('/:id/select', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const sponsorId = parseInt(req.params.id)
  if (isNaN(sponsorId)) { sendError(res, 'Ongeldig ID', 400); return }

  try {
    const sponsor = await prisma.sponsor.findUnique({ where: { id: sponsorId } })
    if (!sponsor || !sponsor.is_active) { sendError(res, 'Sponsor niet gevonden', 404); return }

    // Deactivate all current sponsors
    await prisma.userSponsor.updateMany({
      where: { user_id: req.user!.id, active: true },
      data: { active: false },
    })

    // Create or reactivate
    const existing = await prisma.userSponsor.findFirst({
      where: { user_id: req.user!.id, sponsor_id: sponsorId },
    })

    if (existing) {
      await prisma.userSponsor.update({
        where: { id: existing.id },
        data: { active: true, started_at: new Date() },
      })
    } else {
      await prisma.userSponsor.create({
        data: { user_id: req.user!.id, sponsor_id: sponsorId },
      })
    }

    sendSuccess(res, { sponsor_id: sponsorId, name: sponsor.name }, `Sponsor "${sponsor.name}" gekozen!`)
  } catch {
    sendError(res, 'Selecteren mislukt', 500)
  }
})

// POST /sponsors/payout — uitbetaling aan actieve sponsor-gebruikers (cron job)
router.post('/payout', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  // Only admin
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user?.is_admin) { sendError(res, 'Geen toegang', 403); return }

  try {
    const activeSponsors = await prisma.userSponsor.findMany({
      where: { active: true },
      include: { sponsor: true },
    })

    let paid = 0
    for (const us of activeSponsors) {
      const income = Number(us.sponsor.weekly_income)
      await prisma.user.update({
        where: { id: us.user_id },
        data: { balance_credits: { increment: income } },
      })
      await prisma.transaction.create({
        data: {
          user_id: us.user_id,
          type: 'sponsor_income',
          amount: income,
          credits_amount: income,
          status: 'COMPLETED',
          description: `Wekelijks inkomen van sponsor ${us.sponsor.name}`,
        },
      })
      paid++
    }

    sendSuccess(res, { paid_out: paid }, `${paid} sponsors uitbetaald`)
  } catch {
    sendError(res, 'Uitbetaling mislukt', 500)
  }
})

export default router
