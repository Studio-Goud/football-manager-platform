import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import prisma from '../config/database'
import { checkAndAwardAchievements } from '../services/achievementService'

const router = Router()

// GET /achievements — all achievement definitions
router.get('/', async (_req, res: Response) => {
  const achievements = await prisma.achievement.findMany({ orderBy: { id: 'asc' } })
  res.json({ success: true, data: achievements })
})

// GET /achievements/my — user's earned achievements + all definitions
router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id

  await checkAndAwardAchievements(userId)

  const [all, earned] = await Promise.all([
    prisma.achievement.findMany({ orderBy: { id: 'asc' } }),
    prisma.userAchievement.findMany({ where: { user_id: userId } }),
  ])

  const earnedMap = new Map(earned.map(e => [e.achievement_id, e.earned_at]))

  const result = all.map(a => ({
    ...a,
    earned: earnedMap.has(a.id),
    earned_at: earnedMap.get(a.id) ?? null,
  }))

  res.json({ success: true, data: result })
})

export default router
