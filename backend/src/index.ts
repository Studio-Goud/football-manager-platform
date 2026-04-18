import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { Server } from 'socket.io'
import cron from 'node-cron'
import dotenv from 'dotenv'

dotenv.config()

import logger from './config/logger'
import { generalLimiter } from './middleware/rateLimiter'
import { errorHandler, notFound } from './middleware/errorHandler'

import authRoutes from './routes/auth'
import teamRoutes from './routes/teams'
import playerRoutes from './routes/players'
import marketplaceRoutes from './routes/marketplace'
import paymentRoutes from './routes/payments'
import matchRoutes from './routes/matches'
import powerupRoutes from './routes/powerups'
import adminRoutes from './routes/admin'
import duelRoutes from './routes/duels'
import leagueRoutes from './routes/leagues'
import achievementRoutes from './routes/achievements'
import challengeRoutes from './routes/challenges'
import sponsorRoutes from './routes/sponsors'
import notificationRoutes from './routes/notifications'
import predictionRoutes from './routes/predictions'
import pushRoutes from './routes/push'
import { sendPushToUser } from './services/pushService'

import { fetchLiveMatches, fetchMatchEvents, mapApiEventToScoring, updatePlayerPrices } from './services/footballApiService'
import { createNotification } from './services/notificationService'
import { processSeasonEndRewards, giveNewSeasonBonus } from './services/seasonRewardService'
import { calculateTeamGameweekPoints, SCORING } from './services/scoringService'
import { runSimulationTick } from './services/simulationService'
import prisma from './config/database'
import { ensureTestAccount } from './seed-test-account'
import { seedDemoData } from './seed-demo'

const app = express()
const server = http.createServer(app)

// ─── Socket.io ─────────────────────��──────────────────────────────────────────

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
})

io.on('connection', (socket) => {
  logger.debug('Socket connected', { id: socket.id })

  socket.on('join:match', (matchId: string) => {
    socket.join(`match:${matchId}`)
  })

  socket.on('leave:match', (matchId: string) => {
    socket.leave(`match:${matchId}`)
  })

  socket.on('join:user', (userId: string) => {
    socket.join(`user:${userId}`)
  })

  socket.on('disconnect', () => {
    logger.debug('Socket disconnected', { id: socket.id })
  })
})

export { io }

// ─── Middleware ──────────────────────────────���───────────────────────────��────

app.use(helmet())

const allowedOrigins = [
  process.env.FRONTEND_URL ?? 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true)
    // Allow any Vercel preview URL
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    callback(new Error(`CORS blocked: ${origin}`))
  },
  credentials: true,
}))
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }))
app.use(generalLimiter)

// Stripe webhook needs raw body
app.use('/api/payments/stripe-webhook', express.raw({ type: 'application/json' }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ─── Routes ──────────────────────���────────────────────────────────────────────

app.use('/api/auth', authRoutes)
app.use('/api/teams', teamRoutes)
app.use('/api/players', playerRoutes)
app.use('/api/marketplace', marketplaceRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/matches', matchRoutes)
app.use('/api/powerups', powerupRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/duels', duelRoutes)
app.use('/api/leagues', leagueRoutes)
app.use('/api/achievements', achievementRoutes)
app.use('/api/challenges', challengeRoutes)
app.use('/api/sponsors', sponsorRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/predictions', predictionRoutes)
app.use('/api/push', pushRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use(notFound)
app.use(errorHandler)

// ─── Cron jobs ──────────────────────────��─────────────────────────���───────────

// Every 2 minutes: test simulatie tick
cron.schedule('*/2 * * * *', async () => {
  await runSimulationTick(io)
})

// Every 60 seconds: poll live matches
cron.schedule('* * * * *', async () => {
  if (!process.env.FOOTBALL_API_KEY) return

  try {
    const liveMatches = await fetchLiveMatches()

    for (const match of liveMatches as any[]) {
      const fixtureId = match.fixture_id
      if (!fixtureId) continue

      const dbMatch = await prisma.match.findFirst({ where: { external_id: fixtureId.toString() } })
      if (!dbMatch) continue

      await prisma.match.update({
        where: { id: dbMatch.id },
        data: {
          status: 'LIVE',
          minute: match.minute ?? 0,
          home_score: match.home_score ?? 0,
          away_score: match.away_score ?? 0,
        },
      })

      io.to(`match:${dbMatch.id}`).emit('match:score', {
        match_id: dbMatch.id,
        home_score: match.home_score ?? 0,
        away_score: match.away_score ?? 0,
        minute: match.minute ?? 0,
      })

      // Fetch and process events
      const events = await fetchMatchEvents(fixtureId)
      for (const apiEvent of events) {
        const mappedEvent = mapApiEventToScoring(apiEvent)
        if (!mappedEvent) continue

        // Persist event to MatchPerformance
        if (mappedEvent.player_id) {
          try {
            const dbPlayer = await prisma.player.findFirst({
              where: { external_id: { contains: mappedEvent.player_id.toString() } },
            })
            if (dbPlayer) {
              const updateData: Record<string, unknown> = { minutes_played: { increment: 0 } }
              if (mappedEvent.event_type === 'goal')         updateData.goals = { increment: 1 }
              else if (mappedEvent.event_type === 'assist')  updateData.assists = { increment: 1 }
              else if (mappedEvent.event_type === 'yellow_card') updateData.yellow_cards = { increment: 1 }
              else if (mappedEvent.event_type === 'red_card')    updateData.red_cards = { increment: 1 }
              else if (mappedEvent.event_type === 'own_goal')    updateData.own_goals = { increment: 1 }

              await prisma.matchPerformance.upsert({
                where: { match_id_player_id: { match_id: dbMatch.id, player_id: dbPlayer.id } },
                create: { match_id: dbMatch.id, player_id: dbPlayer.id, minutes_played: 60,
                  goals: mappedEvent.event_type === 'goal' ? 1 : 0,
                  assists: mappedEvent.event_type === 'assist' ? 1 : 0,
                  yellow_cards: mappedEvent.event_type === 'yellow_card' ? 1 : 0,
                  red_cards: mappedEvent.event_type === 'red_card' ? 1 : 0,
                  own_goals: mappedEvent.event_type === 'own_goal' ? 1 : 0,
                },
                update: updateData,
              })
            }
          } catch (err) {
            logger.warn('MatchPerformance upsert failed', { err })
          }
        }

        // Emit event to match room
        io.to(`match:${dbMatch.id}`).emit('match:event', {
          match_id: dbMatch.id,
          ...mappedEvent,
        })

        // Notify users whose team has this player → live points delta
        if (mappedEvent.player_id && ['goal', 'assist', 'yellow_card', 'red_card', 'own_goal'].includes(mappedEvent.event_type)) {
          try {
            const affectedTeamPlayers = await prisma.teamPlayer.findMany({
              where: {
                player: { external_id: { contains: mappedEvent.player_id.toString() } },
                slot_position: { not: { startsWith: 'BENCH' } },
              },
              include: {
                team: { select: { id: true, user_id: true, tactic_style: true, captain_player_id: true } },
                player: { select: { position: true, photo_url: true } },
              },
            })

            for (const tp of affectedTeamPlayers) {
              const userId = tp.team.user_id
              if (!userId) continue

              // Simple delta: look up scoring for this event type
              const pos = tp.player.position as 'GK' | 'DEF' | 'MID' | 'FWD'
              let delta = 0
              if (mappedEvent.event_type === 'goal') delta = SCORING.goal[pos] ?? SCORING.goal.MID
              else if (mappedEvent.event_type === 'assist') delta = SCORING.assist
              else if (mappedEvent.event_type === 'yellow_card') delta = SCORING.yellow_card
              else if (mappedEvent.event_type === 'red_card') delta = SCORING.red_card
              else if (mappedEvent.event_type === 'own_goal') delta = SCORING.own_goal

              if (tp.is_captain) delta *= SCORING.captain_multiplier

              // Fetch current total points for the user from their active team
              const teamGameweek = await prisma.teamGameweek.findFirst({
                where: { team_id: tp.team.id },
                orderBy: { gameweek_id: 'desc' },
              })
              const currentPoints = teamGameweek ? Number(teamGameweek.points) : 0

              io.to(`user:${userId}`).emit('user:points', {
                total_points: currentPoints + delta,
                delta,
                event: {
                  event_type: mappedEvent.event_type,
                  player_name: mappedEvent.player_name,
                  minute: mappedEvent.minute,
                  photo_url: tp.player.photo_url ?? null,
                },
              })

              // Push notification for goals/assists
              if (mappedEvent.event_type === 'goal' || mappedEvent.event_type === 'assist') {
                const eventEmoji = mappedEvent.event_type === 'goal' ? '⚽' : '🅰️'
                const captainNote = tp.is_captain ? ' (C ×2)' : ''
                sendPushToUser(
                  userId,
                  `${eventEmoji} ${mappedEvent.player_name}`,
                  `${mappedEvent.event_type === 'goal' ? 'Doelpunt' : 'Assist'} in minuut ${mappedEvent.minute}! +${delta} punten${captainNote}`,
                  '/live'
                ).catch(() => {})
              }
            }
          } catch (err) {
            logger.warn('user:points emit failed', { err })
          }
        }
      }
    }
  } catch (err) {
    logger.error('Live match polling error', { err })
  }
})

// Every 5 minutes: update player prices
cron.schedule('*/5 * * * *', async () => {
  try {
    await updatePlayerPrices()
  } catch (err) {
    logger.error('Price update cron error', { err })
  }
})

// Every hour: process expired auction listings
cron.schedule('0 * * * *', async () => {
  try {
    const expiredAuctions = await prisma.marketplaceListing.findMany({
      where: {
        listing_type: 'AUCTION',
        status: 'ACTIVE',
        expires_at: { lte: new Date() },
      },
    })

    for (const listing of expiredAuctions) {
      if (listing.current_bidder_id) {
        // Process winner
        await prisma.marketplaceListing.update({
          where: { id: listing.id },
          data: { status: 'SOLD' },
        })
        logger.info('Auction settled', { listingId: listing.id })
      } else {
        // No bids, expire
        await prisma.marketplaceListing.update({
          where: { id: listing.id },
          data: { status: 'EXPIRED' },
        })
      }
    }
  } catch (err) {
    logger.error('Auction processor error', { err })
  }
})

// Every hour: deadline reminders (24h and 2h before gameweek deadline)
cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date()
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const in2h  = new Date(now.getTime() + 2  * 60 * 60 * 1000)

    const upcomingGws = await prisma.gameweek.findMany({
      where: { status: 'UPCOMING', deadline: { gte: now, lte: in24h } },
    })

    for (const gw of upcomingGws) {
      const dl = new Date(gw.deadline)
      const hoursLeft = Math.round((dl.getTime() - now.getTime()) / 3600000)
      if (hoursLeft !== 24 && hoursLeft !== 2) continue

      const users = await prisma.user.findMany({ select: { id: true } })
      for (const u of users) {
        await createNotification(
          u.id, 'DEADLINE',
          `Deadline over ${hoursLeft} uur`,
          `Speelronde ${gw.number} sluit over ${hoursLeft} uur. Pas je opstelling nog aan!`,
          '/team'
        )
      }
      logger.info(`Deadline reminders sent: GW ${gw.number}, ${hoursLeft}h left`)
    }
  } catch (err) {
    logger.error('Deadline reminder error', { err })
  }
})

// Every 6 hours: check for significant form drops → notify team owners
cron.schedule('0 */6 * * *', async () => {
  try {
    const lowFormThreshold = 4
    // Find players with form <= 4 who are in teams as starters
    const tps = await prisma.teamPlayer.findMany({
      where: {
        slot_position: { not: { startsWith: 'BENCH' } },
        player: { form: { lte: lowFormThreshold } },
      },
      include: {
        player: { select: { id: true, name: true, form: true } },
        team: { select: { user_id: true } },
      },
      distinct: ['player_id', 'team_id'],
    })
    for (const tp of tps) {
      if (!tp.team.user_id) continue
      await createNotification(
        tp.team.user_id, 'VALUE_CHANGE',
        `${tp.player.name} heeft lage vorm`,
        `${tp.player.name} heeft momenteel een form van ${Number(tp.player.form).toFixed(1)}. Overweeg een vervanging.`,
        '/scout'
      )
    }
    if (tps.length > 0) logger.info(`Form drop alerts sent for ${tps.length} team-player combos`)
  } catch (err) {
    logger.error('Form drop cron error', { err })
  }
})

// Daily at midnight: check for ended seasons and issue rewards
cron.schedule('0 0 * * *', async () => {
  try {
    const endedSeasons = await prisma.season.findMany({
      where: { status: 'ACTIVE', end_date: { lte: new Date() } },
    })
    for (const season of endedSeasons) {
      await prisma.season.update({ where: { id: season.id }, data: { status: 'COMPLETED' } })
      await processSeasonEndRewards(season.id)
      await giveNewSeasonBonus()
      logger.info('Season completed and rewards issued', { seasonId: season.id })
    }
  } catch (err) {
    logger.error('Season end processing error', { err })
  }
})

// Every Monday 08:00: sponsor payouts
cron.schedule('0 8 * * 1', async () => {
  try {
    const activeSponsors = await prisma.userSponsor.findMany({
      where: { active: true },
      include: { sponsor: true },
    })
    for (const us of activeSponsors) {
      const income = Number(us.sponsor.weekly_income)
      await prisma.user.update({ where: { id: us.user_id }, data: { balance_credits: { increment: income } } })
      await prisma.transaction.create({
        data: { user_id: us.user_id, type: 'sponsor_income', amount: income, credits_amount: income, status: 'COMPLETED', description: `Wekelijks inkomen van sponsor ${us.sponsor.name}` },
      })
    }
    logger.info(`Sponsor payouts: ${activeSponsors.length} users paid`)
  } catch (err) {
    logger.error('Sponsor payout error', { err })
  }
})

// ─── Start server ─────────────────────────���───────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '4000')

server.listen(PORT, async () => {
  logger.info(`🚀 Football Manager API running on port ${PORT}`)
  logger.info(`📡 WebSocket server ready`)
  logger.info(`🗄️  Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] ?? 'local'}`)
  await ensureTestAccount()
  await seedDemoData()
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  await prisma.$disconnect()
  server.close()
  process.exit(0)
})
