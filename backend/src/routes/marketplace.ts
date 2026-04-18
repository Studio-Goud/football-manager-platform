import { Router, Response } from 'express'
import { body, validationResult } from 'express-validator'
import prisma from '../config/database'
import { sendSuccess, sendPaginated, sendError } from '../utils/apiResponse'
import { authenticate, AuthRequest } from '../middleware/auth'
import { MARKETPLACE_CONFIG } from '../config/constants'

const router = Router()

// GET /marketplace
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { position, min_price, max_price, search, listing_type, sort_by, page = '1', per_page = '20' } = req.query
  const pageNum = Math.max(1, parseInt(page as string))
  const perPageNum = Math.min(50, parseInt(per_page as string))
  const skip = (pageNum - 1) * perPageNum

  const where: Record<string, unknown> = { status: 'ACTIVE' }

  if (position || search) {
    where.player = {}
    if (position) (where.player as Record<string, unknown>).position = (position as string).toUpperCase()
    if (search) (where.player as Record<string, unknown>).name = { contains: search, mode: 'insensitive' }
  }
  if (min_price || max_price) {
    where.price = {}
    if (min_price) (where.price as Record<string, unknown>).gte = parseFloat(min_price as string)
    if (max_price) (where.price as Record<string, unknown>).lte = parseFloat(max_price as string)
  }
  if (listing_type && (listing_type === 'fixed' || listing_type === 'auction')) {
    where.listing_type = (listing_type as string).toUpperCase()
  }

  type OrderBy = Record<string, unknown>
  let orderBy: OrderBy | OrderBy[]
  switch (sort_by) {
    case 'price_asc':  orderBy = { price: 'asc' }; break
    case 'price_desc': orderBy = { price: 'desc' }; break
    case 'form':       orderBy = { player: { form: 'desc' } }; break
    default:           orderBy = { created_at: 'desc' }
  }

  try {
    const [listings, total] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where,
        include: { player: true, seller: { select: { username: true } } },
        orderBy,
        skip,
        take: perPageNum,
      }),
      prisma.marketplaceListing.count({ where }),
    ])

    sendPaginated(res, listings.map(l => ({
      id: l.id,
      player: { ...l.player, price: Number(l.player.price), form: Number(l.player.form), total_points: Number(l.player.total_points) },
      seller_id: l.seller_id,
      seller_username: l.seller.username,
      price: Number(l.price),
      current_bid: l.current_bid ? Number(l.current_bid) : undefined,
      bid_count: 0,
      listing_type: l.listing_type.toLowerCase(),
      status: l.status.toLowerCase(),
      expires_at: l.expires_at.toISOString(),
      created_at: l.created_at.toISOString(),
      transaction_fee: Number(l.price) * MARKETPLACE_CONFIG.FEE,
    })), total, pageNum, perPageNum)
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// POST /marketplace — create listing
router.post(
  '/',
  authenticate,
  [
    body('player_id').isInt(),
    body('price').isFloat({ min: 0.5 }),
    body('listing_type').isIn(['fixed', 'auction']),
    body('duration_hours').isInt({ min: 1, max: 168 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      sendError(res, 'Ongeldige invoer', 400)
      return
    }

    const { player_id, price, listing_type, duration_hours } = req.body

    try {
      // Check player ownership
      const ownership = await prisma.teamPlayer.findFirst({
        where: {
          player_id: parseInt(player_id),
          team: { user_id: req.user!.id },
        },
      })

      if (!ownership) {
        sendError(res, 'Je bezit deze speler niet', 403)
        return
      }

      const expiresAt = new Date(Date.now() + duration_hours * 60 * 60 * 1000)

      const listing = await prisma.marketplaceListing.create({
        data: {
          seller_id: req.user!.id,
          player_id: parseInt(player_id),
          price,
          listing_type: listing_type.toUpperCase() as 'FIXED' | 'AUCTION',
          expires_at: expiresAt,
        },
        include: { player: true },
      })

      sendSuccess(res, listing, 'Listing aangemaakt', 201)
    } catch {
      sendError(res, 'Aanmaken mislukt', 500)
    }
  }
)

// POST /marketplace/:id/buy
router.post('/:id/buy', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: req.params.id },
      include: { player: true },
    })

    if (!listing || listing.status !== 'ACTIVE') {
      sendError(res, 'Listing niet gevonden of niet beschikbaar', 404)
      return
    }

    if (listing.listing_type !== 'FIXED') {
      sendError(res, 'Dit is een veiling — gebruik bieden', 400)
      return
    }

    if (listing.seller_id === req.user!.id) {
      sendError(res, 'Je kunt je eigen listing niet kopen', 400)
      return
    }

    const buyer = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!buyer || Number(buyer.balance_credits) < Number(listing.price)) {
      sendError(res, 'Onvoldoende saldo', 402)
      return
    }

    const fee = Number(listing.price) * MARKETPLACE_CONFIG.FEE
    const sellerReceives = Number(listing.price) - fee

    await prisma.$transaction([
      // Deduct from buyer
      prisma.user.update({
        where: { id: req.user!.id },
        data: { balance_credits: { decrement: Number(listing.price) } },
      }),
      // Credit to seller
      prisma.user.update({
        where: { id: listing.seller_id },
        data: { balance_credits: { increment: sellerReceives } },
      }),
      // Mark listing as sold
      prisma.marketplaceListing.update({
        where: { id: listing.id },
        data: { status: 'SOLD' },
      }),
      // Buyer transaction
      prisma.transaction.create({
        data: {
          user_id: req.user!.id,
          type: 'MARKETPLACE_BUY',
          amount: -Number(listing.price),
          credits_amount: -Number(listing.price),
          description: `Aankoop ${listing.player.name}`,
          status: 'COMPLETED',
        },
      }),
      // Seller transaction
      prisma.transaction.create({
        data: {
          user_id: listing.seller_id,
          type: 'MARKETPLACE_SALE',
          amount: sellerReceives,
          credits_amount: sellerReceives,
          description: `Verkoop ${listing.player.name} (fee: ${fee.toFixed(1)} cr)`,
          status: 'COMPLETED',
        },
      }),
    ])

    sendSuccess(res, null, 'Speler gekocht!')
  } catch {
    sendError(res, 'Aankoop mislukt', 500)
  }
})

// GET /marketplace/hot-players
router.get('/hot-players', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listings = await prisma.marketplaceListing.findMany({
      where: { status: 'ACTIVE' },
      include: { player: true },
      orderBy: { player: { form: 'desc' } },
      take: 10,
    })

    sendSuccess(res, listings.map(l => ({
      id: l.id,
      player: { ...l.player, price: Number(l.player.price), form: Number(l.player.form), total_points: Number(l.player.total_points), price_change_week: 0.3 },
      price: Number(l.price),
      listing_type: l.listing_type.toLowerCase(),
    })))
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

export default router
