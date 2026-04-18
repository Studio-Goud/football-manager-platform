import { Router, Response } from 'express'
import prisma from '../config/database'
import { authenticate, AuthRequest } from '../middleware/auth'
import { sendSuccess, sendError } from '../utils/apiResponse'
import { VAPID_PUBLIC_KEY } from '../services/pushService'

const router = Router()

// GET /push/vapid-public-key
router.get('/vapid-public-key', (_req, res) => {
  res.json({ data: { publicKey: VAPID_PUBLIC_KEY } })
})

// POST /push/subscribe
router.post('/subscribe', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { endpoint, keys } = req.body
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    sendError(res, 'endpoint en keys verplicht', 400)
    return
  }
  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { user_id: req.user!.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { user_id: req.user!.id, p256dh: keys.p256dh, auth: keys.auth },
    })
    sendSuccess(res, null, 'Ingeschreven voor push notificaties')
  } catch {
    sendError(res, 'Inschrijven mislukt', 500)
  }
})

// DELETE /push/unsubscribe
router.delete('/unsubscribe', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { endpoint } = req.body
  try {
    await prisma.pushSubscription.deleteMany({
      where: { user_id: req.user!.id, ...(endpoint ? { endpoint } : {}) },
    })
    sendSuccess(res, null, 'Uitgeschreven')
  } catch {
    sendError(res, 'Uitschrijven mislukt', 500)
  }
})

export default router
