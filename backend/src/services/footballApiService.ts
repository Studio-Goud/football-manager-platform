import axios from 'axios'
import logger from '../config/logger'
import prisma from '../config/database'

const API_BASE = 'https://v3.football.api-sports.io'
const API_KEY = process.env.FOOTBALL_API_KEY ?? ''
const API_HOST = process.env.FOOTBALL_API_HOST ?? 'v3.football.api-sports.io'

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'x-rapidapi-key': API_KEY,
    'x-rapidapi-host': API_HOST,
  },
})

// Competition IDs for API-Football
const COMPETITIONS = {
  eredivisie: 88,
  premier_league: 39,
}

// ─── Fetch live matches ────────────────────────────────────────────────────────

export async function fetchLiveMatches(competition?: keyof typeof COMPETITIONS) {
  try {
    const leagueId = competition ? COMPETITIONS[competition] : undefined
    const params: Record<string, string | number> = { live: 'all' }
    if (leagueId) params.league = leagueId

    const response = await apiClient.get('/fixtures', { params })
    return response.data.response ?? []
  } catch (err) {
    logger.error('Failed to fetch live matches', { err })
    return []
  }
}

// ─── Fetch match events ────────────────────────────────────────────────────────

export async function fetchMatchEvents(fixtureId: number) {
  try {
    const response = await apiClient.get('/fixtures/events', {
      params: { fixture: fixtureId },
    })
    return response.data.response ?? []
  } catch (err) {
    logger.error('Failed to fetch match events', { fixtureId, err })
    return []
  }
}

// ─── Fetch player stats for a match ───────────────────────────────────────────

export async function fetchPlayerStats(fixtureId: number) {
  try {
    const response = await apiClient.get('/fixtures/players', {
      params: { fixture: fixtureId },
    })
    return response.data.response ?? []
  } catch (err) {
    logger.error('Failed to fetch player stats', { fixtureId, err })
    return []
  }
}

// ─── Fetch upcoming fixtures ───────────────────────────────────────────────────

export async function fetchUpcomingFixtures(leagueId: number, season = 2024) {
  try {
    const response = await apiClient.get('/fixtures', {
      params: {
        league: leagueId,
        season,
        next: 10,
      },
    })
    return response.data.response ?? []
  } catch (err) {
    logger.error('Failed to fetch upcoming fixtures', { leagueId, err })
    return []
  }
}

// ─── Map API events to scoring events ─────────────────────────────────────────

type ApiEvent = {
  type: string
  detail: string
  player?: { id?: number; name?: string }
  assist?: { id?: number; name?: string }
  time?: { elapsed?: number }
  team?: { name?: string }
}

export function mapApiEventToScoring(apiEvent: ApiEvent): {
  event_type: string
  player_id?: number
  player_name?: string
  minute: number
  team_name: string
} | null {
  const typeMap: Record<string, string> = {
    'Goal': 'goal',
    'Card': apiEvent.detail?.includes('Yellow') ? 'yellow_card' : 'red_card',
    'subst': 'substitution',
    'Penalty': apiEvent.detail?.includes('Missed') ? 'penalty_missed' : 'goal',
    'Own Goal': 'own_goal',
  }

  const eventType = typeMap[apiEvent.type]
  if (!eventType) return null

  return {
    event_type: eventType,
    player_id: apiEvent.player?.id,
    player_name: apiEvent.player?.name,
    minute: apiEvent.time?.elapsed ?? 0,
    team_name: apiEvent.team?.name ?? '',
  }
}

// ─── Update player prices based on form & ownership ───────────────────────────

export async function updatePlayerPrices(): Promise<void> {
  try {
    const players = await prisma.player.findMany({
      include: {
        _count: { select: { team_players: true } },
      },
    })

    const totalTeams = await prisma.team.count()

    for (const player of players) {
      const ownershipPct = totalTeams > 0
        ? ((player as unknown as { _count: { team_players: number } })._count.team_players / totalTeams) * 100
        : 0

      // Price formula: base * (1 + form/20) * (1 + ownership/200)
      const formFactor = 1 + (Number(player.form) / 20)
      const ownershipFactor = 1 + (ownershipPct / 200)
      const newPrice = Math.min(20, Math.max(4, Number(player.price) * formFactor * ownershipFactor))

      await prisma.$transaction([
        prisma.player.update({
          where: { id: player.id },
          data: { price: Number(newPrice.toFixed(1)) },
        }),
        prisma.playerPriceHistory.create({
          data: { player_id: player.id, price: Number(newPrice.toFixed(1)) },
        }),
      ])
    }

    logger.info('Player prices updated successfully')
  } catch (err) {
    logger.error('Failed to update player prices', { err })
  }
}
