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

import { fetchLiveMatches, fetchMatchEvents, mapApiEventToScoring, updatePlayerPrices } from './services/footballApiService'
import { calculateTeamGameweekPoints } from './services/scoringService'
import prisma from './config/database'
import { ensureTestAccount } from './seed-test-account'

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
app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use(notFound)
app.use(errorHandler)

// ─── Cron jobs ──────────────────────────��─────────────────────────���───────────

// Every 60 seconds: poll live matches
cron.schedule('* * * * *', async () => {
  if (!process.env.FOOTBALL_API_KEY) return

  try {
    const liveMatches = await fetchLiveMatches()

    for (const match of liveMatches) {
      const fixtureId = match.fixture?.id
      if (!fixtureId) continue

      const dbMatch = await prisma.match.findFirst({ where: { external_id: fixtureId.toString() } })
      if (!dbMatch) continue

      // Update match status
      await prisma.match.update({
        where: { id: dbMatch.id },
        data: {
          status: 'LIVE',
          minute: match.fixture?.status?.elapsed ?? 0,
          home_score: match.goals?.home ?? 0,
          away_score: match.goals?.away ?? 0,
        },
      })

      // Emit score update via socket
      io.to(`match:${dbMatch.id}`).emit('match:score', {
        match_id: dbMatch.id,
        home_score: match.goals?.home ?? 0,
        away_score: match.goals?.away ?? 0,
        minute: match.fixture?.status?.elapsed ?? 0,
      })

      // Fetch and process events
      const events = await fetchMatchEvents(fixtureId)
      for (const apiEvent of events) {
        const mappedEvent = mapApiEventToScoring(apiEvent)
        if (!mappedEvent) continue

        // Emit event
        io.to(`match:${dbMatch.id}`).emit('match:event', {
          match_id: dbMatch.id,
          ...mappedEvent,
        })
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

// ─── Start server ─────────────────────────���───────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '4000')

server.listen(PORT, async () => {
  logger.info(`🚀 Football Manager API running on port ${PORT}`)
  logger.info(`📡 WebSocket server ready`)
  logger.info(`🗄️  Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] ?? 'local'}`)
  await ensureTestAccount()
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  await prisma.$disconnect()
  server.close()
  process.exit(0)
})
