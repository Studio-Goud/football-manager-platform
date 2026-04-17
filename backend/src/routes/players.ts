import { Router, Request, Response } from 'express'
import prisma from '../config/database'
import { sendSuccess, sendPaginated, sendError } from '../utils/apiResponse'
import { authenticate } from '../middleware/auth'

const router = Router()

// GET /players — all players with filters
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  const { position, club, search, min_price, max_price, page = '1', per_page = '20', sort = 'form', league_id } = req.query

  const pageNum = Math.max(1, parseInt(page as string))
  const perPageNum = Math.min(50, parseInt(per_page as string))
  const skip = (pageNum - 1) * perPageNum

  const where: Record<string, unknown> = {}
  if (position) where.position = (position as string).toUpperCase()
  if (club) where.club = { contains: club as string, mode: 'insensitive' }
  if (league_id) where.league_id = parseInt(league_id as string)
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { club: { contains: search as string, mode: 'insensitive' } },
    ]
  }
  if (min_price || max_price) {
    where.price = {}
    if (min_price) (where.price as Record<string, unknown>).gte = parseFloat(min_price as string)
    if (max_price) (where.price as Record<string, unknown>).lte = parseFloat(max_price as string)
  }

  const orderBy: Record<string, string> = {}
  if (sort === 'price') orderBy.price = 'desc'
  else if (sort === 'points') orderBy.total_points = 'desc'
  else orderBy.form = 'desc'

  try {
    const [players, total] = await Promise.all([
      prisma.player.findMany({ where, orderBy, skip, take: perPageNum }),
      prisma.player.count({ where }),
    ])

    sendPaginated(res, players.map(p => ({
      id: p.id,
      name: p.name,
      display_name: p.display_name,
      club: p.club,
      position: p.position,
      price: Number(p.price),
      form: Number(p.form),
      availability: p.availability.toLowerCase(),
      photo_url: p.photo_url,
      total_points: Number(p.total_points),
    })), total, pageNum, perPageNum)
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// GET /players/leagues — available leagues for filtering
router.get('/leagues', authenticate, async (_req: Request, res: Response): Promise<void> => {
  try {
    const leagues = await prisma.league.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, country: true, logo_url: true },
    })
    sendSuccess(res, leagues)
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// GET /players/hot — trending players
router.get('/hot', authenticate, async (_req: Request, res: Response): Promise<void> => {
  try {
    const players = await prisma.player.findMany({
      orderBy: { form: 'desc' },
      take: 10,
    })
    sendSuccess(res, players.map(p => ({ ...p, price: Number(p.price), form: Number(p.form), total_points: Number(p.total_points) })))
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// GET /players/:id — player detail
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const player = await prisma.player.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        price_history: { orderBy: { recorded_at: 'desc' }, take: 14 },
        match_performances: { orderBy: { match_id: 'desc' }, take: 5, include: { match: true } },
      },
    })

    if (!player) {
      sendError(res, 'Speler niet gevonden', 404)
      return
    }

    sendSuccess(res, {
      ...player,
      price: Number(player.price),
      form: Number(player.form),
      total_points: Number(player.total_points),
    })
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

export default router
