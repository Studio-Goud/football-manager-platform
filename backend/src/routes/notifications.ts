import { Router, Response } from 'express'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/apiResponse'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /notifications — laatste 30 notificaties
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { user_id: req.user!.id },
      orderBy: { created_at: 'desc' },
      take: 30,
    })
    sendSuccess(res, notifications)
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// GET /notifications/unread-count — aantal ongelezen
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await prisma.notification.count({
      where: { user_id: req.user!.id, read: false },
    })
    sendSuccess(res, { count })
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// POST /notifications/mark-read — markeer alles als gelezen
router.post('/mark-read', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { user_id: req.user!.id, read: false },
      data: { read: true },
    })
    sendSuccess(res, null, 'Alles gelezen')
  } catch {
    sendError(res, 'Bijwerken mislukt', 500)
  }
})

// POST /notifications/mark-read/:id — markeer één als gelezen
router.post('/mark-read/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { id: parseInt(req.params.id), user_id: req.user!.id },
      data: { read: true },
    })
    sendSuccess(res, null)
  } catch {
    sendError(res, 'Bijwerken mislukt', 500)
  }
})

export default router
