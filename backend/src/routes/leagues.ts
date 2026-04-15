import { Router, Response } from 'express'
import { body, validationResult } from 'express-validator'
import prisma from '../config/database'
import { sendSuccess, sendError } from '../utils/apiResponse'
import { authenticate, AuthRequest } from '../middleware/auth'
import { randomBytes } from 'crypto'

const router = Router()

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateCode(): string {
  return randomBytes(3).toString('hex').toUpperCase() // 6 chars: "A1B2C3"
}

async function uniqueCode(): Promise<string> {
  let code = generateCode()
  let attempts = 0
  while (attempts < 10) {
    const exists = await prisma.privateLeague.findUnique({ where: { code } })
    if (!exists) return code
    code = generateCode()
    attempts++
  }
  throw new Error('Kon geen unieke code genereren')
}

// ── Publieke liga's ───────────────────────────────────────────────────────────

// GET /leagues/available — beschikbare voetballiga's (voor teamfilter)
router.get('/available', async (_req, res: Response): Promise<void> => {
  try {
    const leagues = await prisma.league.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    })
    sendSuccess(res, leagues)
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// ── Privé competities ─────────────────────────────────────────────────────────

// GET /leagues/my — mijn privé competities
router.get('/my', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const memberships = await prisma.privateLeagueMember.findMany({
      where: { user_id: req.user!.id },
      include: {
        private_league: {
          include: {
            members: {
              include: {
                user: { select: { id: true, username: true, tier: true } },
              },
            },
          },
        },
      },
      orderBy: { joined_at: 'desc' },
    })

    const leagues = memberships.map(m => ({
      ...m.private_league,
      member_count: m.private_league.members.length,
      members: m.private_league.members.map(mem => ({
        user: mem.user,
        joined_at: mem.joined_at,
        is_owner: mem.user.id === m.private_league.owner_id,
      })),
      is_owner: m.private_league.owner_id === req.user!.id,
    }))

    sendSuccess(res, leagues)
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// POST /leagues — nieuwe privé competitie aanmaken
router.post(
  '/',
  authenticate,
  [
    body('name').isString().trim().isLength({ min: 3, max: 40 }),
    body('max_members').optional().isInt({ min: 2, max: 100 }),
    body('league_filter').optional().isString(),
    body('allow_mixed').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      sendError(res, 'Ongeldige invoer', 400)
      return
    }

    const { name, max_members = 20, league_filter = null, allow_mixed = true } = req.body

    try {
      const code = await uniqueCode()

      const league = await prisma.privateLeague.create({
        data: {
          name,
          code,
          owner_id: req.user!.id,
          max_members,
          league_filter: league_filter || null,
          allow_mixed,
          members: {
            create: { user_id: req.user!.id },
          },
        },
        include: {
          members: {
            include: { user: { select: { id: true, username: true, tier: true } } },
          },
        },
      })

      sendSuccess(res, {
        ...league,
        member_count: league.members.length,
        is_owner: true,
      }, `Competitie "${name}" aangemaakt! Code: ${code}`, 201)
    } catch {
      sendError(res, 'Aanmaken mislukt', 500)
    }
  }
)

// POST /leagues/join — joinen met code
router.post(
  '/join',
  authenticate,
  [body('code').isString().trim().isLength({ min: 6, max: 6 })],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      sendError(res, 'Ongeldige code', 400)
      return
    }

    const { code } = req.body

    try {
      const league = await prisma.privateLeague.findUnique({
        where: { code: code.toUpperCase() },
        include: { members: true },
      })

      if (!league) {
        sendError(res, 'Competitie niet gevonden', 404)
        return
      }

      if (league.members.some(m => m.user_id === req.user!.id)) {
        sendError(res, 'Je bent al lid van deze competitie', 409)
        return
      }

      if (league.members.length >= league.max_members) {
        sendError(res, 'Competitie is vol', 400)
        return
      }

      await prisma.privateLeagueMember.create({
        data: { private_league_id: league.id, user_id: req.user!.id },
      })

      sendSuccess(res, { league_id: league.id, name: league.name }, `Welkom in "${league.name}"!`)
    } catch {
      sendError(res, 'Joinen mislukt', 500)
    }
  }
)

// GET /leagues/:id — detail van een competitie
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const league = await prisma.privateLeague.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, tier: true } },
          },
          orderBy: { joined_at: 'asc' },
        },
      },
    })

    if (!league) { sendError(res, 'Niet gevonden', 404); return }

    const isMember = league.members.some(m => m.user_id === req.user!.id)
    if (!isMember) { sendError(res, 'Geen toegang', 403); return }

    sendSuccess(res, {
      ...league,
      member_count: league.members.length,
      is_owner: league.owner_id === req.user!.id,
    })
  } catch {
    sendError(res, 'Ophalen mislukt', 500)
  }
})

// DELETE /leagues/:id/leave — verlaten
router.delete('/:id/leave', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const league = await prisma.privateLeague.findUnique({ where: { id: req.params.id } })
    if (!league) { sendError(res, 'Niet gevonden', 404); return }
    if (league.owner_id === req.user!.id) { sendError(res, 'Eigenaar kan niet verlaten — verwijder de competitie', 400); return }

    await prisma.privateLeagueMember.deleteMany({
      where: { private_league_id: req.params.id, user_id: req.user!.id },
    })

    sendSuccess(res, null, 'Competitie verlaten')
  } catch {
    sendError(res, 'Verlaten mislukt', 500)
  }
})

export default router
