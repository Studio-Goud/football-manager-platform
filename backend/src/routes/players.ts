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

// GET /players/best-value — beste form/prijs ratio per positie
router.get('/best-value', authenticate, async (_req: Request, res: Response): Promise<void> => {
  try {
    const positions = ['GK', 'DEF', 'MID', 'FWD']
    const result: Record<string, unknown[]> = {}

    for (const pos of positions) {
      const players = await prisma.player.findMany({
        where: { position: pos, availability: 'AVAILABLE' },
        orderBy: [{ form: 'desc' }, { total_points: 'desc' }],
        take: 50,
      })

      const withValue = players.map(p => ({
        id: p.id,
        name: p.name,
        display_name: p.display_name,
        club: p.club,
        position: p.position,
        price: Number(p.price),
        form: Number(p.form),
        total_points: Number(p.total_points),
        photo_url: p.photo_url,
        value_score: Number(p.price) > 0 ? Number(p.form) / Number(p.price) : 0,
      }))

      withValue.sort((a, b) => b.value_score - a.value_score)
      result[pos] = withValue.slice(0, 5)
    }

    sendSuccess(res, result)
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

// GET /players/ownership — top 20 most owned players + total teams count
router.get('/ownership', authenticate, async (_req: Request, res: Response): Promise<void> => {
  try {
    const [totalTeams, topOwned] = await Promise.all([
      prisma.team.count(),
      prisma.teamPlayer.groupBy({
        by: ['player_id'],
        _count: { player_id: true },
        orderBy: { _count: { player_id: 'desc' } },
        take: 20,
      }),
    ])

    if (totalTeams === 0) {
      sendSuccess(res, { total_teams: 0, top_owned: [] })
      return
    }

    const playerIds = topOwned.map(r => r.player_id)
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, name: true, display_name: true, position: true, club: true, price: true, photo_url: true },
    })
    const playerMap = new Map(players.map(p => [p.id, p]))

    sendSuccess(res, {
      total_teams: totalTeams,
      top_owned: topOwned.map(r => ({
        player: playerMap.get(r.player_id),
        count: r._count.player_id,
        ownership_pct: Math.round((r._count.player_id / totalTeams) * 100),
      })).filter(r => r.player),
    })
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

export default router
