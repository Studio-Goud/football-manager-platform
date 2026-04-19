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

// Alle grote Europese competities + internationale toernooien
export const COMPETITIONS: Record<string, { id: number; name: string; country: string; flag: string }> = {
  // Top 5 Europa
  premier_league:    { id: 39,  name: 'Premier League',    country: 'England',     flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  la_liga:           { id: 140, name: 'La Liga',            country: 'Spain',       flag: '🇪🇸' },
  bundesliga:        { id: 78,  name: 'Bundesliga',         country: 'Germany',     flag: '🇩🇪' },
  serie_a:           { id: 135, name: 'Serie A',            country: 'Italy',       flag: '🇮🇹' },
  ligue_1:           { id: 61,  name: 'Ligue 1',            country: 'France',      flag: '🇫🇷' },
  // Nederlandse competities
  eredivisie:        { id: 88,  name: 'Eredivisie',         country: 'Netherlands', flag: '🇳🇱' },
  knvb_beker:        { id: 90,  name: 'KNVB Beker',         country: 'Netherlands', flag: '🏆' },
  keuken_kampioen:   { id: 89,  name: 'Keuken Kampioen Div',country: 'Netherlands', flag: '🇳🇱' },
  // Andere top liga's
  primeira_liga:     { id: 94,  name: 'Primeira Liga',      country: 'Portugal',    flag: '🇵🇹' },
  pro_league:        { id: 144, name: 'Pro League',         country: 'Belgium',     flag: '🇧🇪' },
  super_lig:         { id: 203, name: 'Süper Lig',          country: 'Turkey',      flag: '🇹🇷' },
  // Nationale bekers
  fa_cup:            { id: 45,  name: 'FA Cup',             country: 'England',     flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  copa_del_rey:      { id: 143, name: 'Copa del Rey',       country: 'Spain',       flag: '🇪🇸' },
  dfb_pokal:         { id: 81,  name: 'DFB Pokal',          country: 'Germany',     flag: '🇩🇪' },
  coppa_italia:      { id: 137, name: 'Coppa Italia',       country: 'Italy',       flag: '🇮🇹' },
  // Europese cups
  champions_league:  { id: 2,   name: 'Champions League',  country: 'Europe',      flag: '⭐' },
  europa_league:     { id: 3,   name: 'Europa League',      country: 'Europe',      flag: '🟠' },
  conference_league: { id: 848, name: 'Conference League',  country: 'Europe',      flag: '🔵' },
  // Internationaal
  world_cup:         { id: 1,   name: 'World Cup',          country: 'World',       flag: '🌍' },
  euros:             { id: 4,   name: 'Euro Championship',  country: 'Europe',      flag: '🇪🇺' },
  nations_league:    { id: 5,   name: 'Nations League',     country: 'Europe',      flag: '🏆' },
}

const COMPETITION_BY_ID: Record<number, { name: string; flag: string }> =
  Object.fromEntries(Object.values(COMPETITIONS).map(c => [c.id, { name: c.name, flag: c.flag }]))

// ─── In-memory cache (60 seconden) zodat we niet 1440 calls/dag verbruiken ────

let liveCache: { data: unknown[]; ts: number } | null = null
let todayCache: { data: unknown[]; ts: number } | null = null
const CACHE_TTL = 60_000

// ─── Fetch live matches (alle grote competities, gecached) ────────────────────

export async function fetchLiveMatches() {
  // Geef cache terug als die nog vers is
  if (liveCache && Date.now() - liveCache.ts < CACHE_TTL) {
    return liveCache.data
  }

  try {
    const response = await apiClient.get('/fixtures', { params: { live: 'all' } })
    const raw: unknown[] = response.data.response ?? []

    // Verrijk met league naam + vlag
    const enriched = raw.map((f: any) => {
      const leagueId: number = f.league?.id
      const meta = COMPETITION_BY_ID[leagueId] ?? { name: f.league?.name ?? 'Unknown', flag: '⚽' }
      return {
        fixture_id:    f.fixture?.id,
        home_team:     f.teams?.home?.name ?? '',
        home_logo:     f.teams?.home?.logo ?? '',
        away_team:     f.teams?.away?.name ?? '',
        away_logo:     f.teams?.away?.logo ?? '',
        home_score:    f.goals?.home ?? 0,
        away_score:    f.goals?.away ?? 0,
        minute:        f.fixture?.status?.elapsed ?? 0,
        status:        f.fixture?.status?.short ?? 'LIVE',
        league_id:     leagueId,
        league_name:   meta.name,
        league_flag:   meta.flag,
      }
    })

    // Alleen grote competities tonen (filter onbekende)
    const knownIds = new Set(Object.values(COMPETITIONS).map(c => c.id))
    const filtered = enriched.filter(f => knownIds.has(f.league_id))

    liveCache = { data: filtered, ts: Date.now() }
    return filtered
  } catch (err) {
    logger.error('Failed to fetch live matches', { err })
    return liveCache?.data ?? []
  }
}

// ─── Fetch today fixtures voor dashboard (1 API call via date param) ──────────

export async function fetchTodayFixtures() {
  if (todayCache && Date.now() - todayCache.ts < 300_000) return todayCache.data // 5 min cache

  try {
    const today = new Date().toISOString().split('T')[0]
    const knownIds = new Set(Object.values(COMPETITIONS).map(c => c.id))

    // 1 API call voor alle wedstrijden van vandaag (bespaart 14 calls)
    const response = await apiClient.get('/fixtures', { params: { date: today } })
    const raw: unknown[] = response.data.response ?? []

    // Filter op bekende competities en verrijk met meta
    const allFixtures = raw
      .map((f: any) => {
        const leagueId: number = f.league?.id
        const meta = COMPETITION_BY_ID[leagueId] ?? null
        if (!meta) return null
        return {
          fixture_id:  f.fixture?.id,
          home_team:   f.teams?.home?.name ?? '',
          home_logo:   f.teams?.home?.logo ?? '',
          away_team:   f.teams?.away?.name ?? '',
          away_logo:   f.teams?.away?.logo ?? '',
          home_score:  f.goals?.home,
          away_score:  f.goals?.away,
          kickoff:     f.fixture?.date,
          status:      f.fixture?.status?.short ?? 'NS',
          minute:      f.fixture?.status?.elapsed,
          league_id:   leagueId,
          league_name: meta.name,
          league_flag: meta.flag,
        }
      })
      .filter((f): f is NonNullable<typeof f> => f !== null && knownIds.has(f.league_id))

    todayCache = { data: allFixtures, ts: Date.now() }
    return allFixtures
  } catch (err) {
    logger.error('Failed to fetch today fixtures', { err })
    return todayCache?.data ?? []
  }
}

// ─── Fetch upcoming fixtures (vandaag + komende 3 dagen) ─────────────────────

let weekCache: { data: unknown[]; ts: number } | null = null

export function invalidateFixtureCache() {
  liveCache = null
  todayCache = null
  weekCache = null
}

export async function fetchWeekFixtures() {
  if (weekCache && Date.now() - weekCache.ts < 300_000) return weekCache.data

  const knownIds = new Set(Object.values(COMPETITIONS).map(c => c.id))
  const allFixtures: unknown[] = []

  const today = new Date()
  const dates = [0, 1, 2, 3].map(d => {
    const dt = new Date(today)
    dt.setDate(today.getDate() + d)
    return dt.toISOString().split('T')[0]
  })

  try {
    for (const date of dates) {
      const response = await apiClient.get('/fixtures', { params: { date } })
      const raw: unknown[] = response.data.response ?? []
      for (const f of raw as any[]) {
        const leagueId: number = f.league?.id
        const meta = COMPETITION_BY_ID[leagueId] ?? null
        if (!meta || !knownIds.has(leagueId)) continue
        allFixtures.push({
          fixture_id:  f.fixture?.id,
          home_team:   f.teams?.home?.name ?? '',
          home_logo:   f.teams?.home?.logo ?? '',
          away_team:   f.teams?.away?.name ?? '',
          away_logo:   f.teams?.away?.logo ?? '',
          home_score:  f.goals?.home,
          away_score:  f.goals?.away,
          kickoff:     f.fixture?.date,
          status:      f.fixture?.status?.short ?? 'NS',
          minute:      f.fixture?.status?.elapsed,
          league_id:   leagueId,
          league_name: meta.name,
          league_flag: meta.flag,
          date,
        })
      }
      // kleine pauze tussen API calls
      await new Promise(r => setTimeout(r, 200))
    }
    weekCache = { data: allFixtures, ts: Date.now() }
    return allFixtures
  } catch (err) {
    logger.error('Failed to fetch week fixtures', { err })
    return weekCache?.data ?? todayCache?.data ?? []
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
