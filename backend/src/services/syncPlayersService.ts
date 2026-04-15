/**
 * Synct alle Eredivisie spelers vanuit API-Sports naar de lokale database.
 * Haalt op: squad info, statistieken (goals/assists/kaarten/rating), blessures/schorsingen.
 * Verbruikt ~50 API calls per volledige sync (free plan = 100/dag).
 */
import axios from 'axios'
import prisma from '../config/database'
import logger from '../config/logger'

const API_BASE = 'https://v3.football.api-sports.io'
const API_KEY  = process.env.FOOTBALL_API_KEY ?? ''

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'x-rapidapi-key':  API_KEY,
    'x-rapidapi-host': 'v3.football.api-sports.io',
  },
  timeout: 15000,
})

// Retry bij 429 — wacht 65 seconden en probeer opnieuw
async function apiGet(url: string, params: Record<string, unknown>): Promise<unknown> {
  try {
    const res = await api.get(url, { params })
    return res.data.response ?? []
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 429) {
      logger.warn(`Rate limit (429) op ${url} — 65 sec wachten...`)
      await new Promise(r => setTimeout(r, 65000))
      const res = await api.get(url, { params })
      return res.data.response ?? []
    }
    throw err
  }
}

// Eredivisie league ID bij API-Sports
const EREDIVISIE_LEAGUE  = 88
const EREDIVISIE_SEASON  = 2024

// Position mapping API → onze DB
const POSITION_MAP: Record<string, string> = {
  Goalkeeper: 'GK',
  Defender:   'DEF',
  Midfielder: 'MID',
  Attacker:   'FWD',
}

// Punten berekening (zelfde als scoringService)
function calcPoints(stats: {
  goals: number
  assists: number
  yellow_cards: number
  red_cards: number
  saves: number
  goals_conceded: number
  minutes: number
  position: string
  rating: number
}): number {
  let pts = 0

  // Speeltijd
  if (stats.minutes >= 60) pts += 2
  else if (stats.minutes >= 1) pts += 1

  // Goals
  if (stats.position === 'GK' || stats.position === 'DEF') pts += stats.goals * 6
  else if (stats.position === 'MID') pts += stats.goals * 5
  else pts += stats.goals * 4

  // Assists
  pts += stats.assists * 3

  // Clean sheet (keeper/verdediger)
  if (stats.goals_conceded === 0 && stats.minutes >= 60) {
    if (stats.position === 'GK' || stats.position === 'DEF') pts += 4
    else if (stats.position === 'MID') pts += 1
  }

  // Kaarten
  pts -= stats.yellow_cards * 1
  pts -= stats.red_cards * 3

  // Saves (keeper)
  if (stats.position === 'GK') pts += Math.floor(stats.saves / 3)

  // Rating bonus (boven 8.0)
  if (stats.rating >= 8.5) pts += 3
  else if (stats.rating >= 7.5) pts += 1

  return pts
}

export interface SyncResult {
  teams_synced: number
  players_synced: number
  injured_updated: number
  errors: string[]
  api_calls_used: number
}

export async function syncEredivisiePlayers(): Promise<SyncResult> {
  const result: SyncResult = {
    teams_synced: 0,
    players_synced: 0,
    injured_updated: 0,
    errors: [],
    api_calls_used: 0,
  }

  if (!API_KEY) {
    result.errors.push('FOOTBALL_API_KEY niet ingesteld')
    return result
  }

  try {
    // ─── 1. Haal alle Eredivisie teams op ────────────────────────────────────
    logger.info('Sync: Eredivisie teams ophalen...')
    const teamsResp = await api.get('/teams', {
      params: { league: EREDIVISIE_LEAGUE, season: EREDIVISIE_SEASON },
    })
    result.api_calls_used++

    const teams: Array<{ team: { id: number; name: string; logo: string } }> =
      teamsResp.data.response ?? []

    logger.info(`Sync: ${teams.length} teams gevonden`)

    // Zorg dat de Eredivisie league bestaat
    const league = await prisma.league.upsert({
      where: { external_id: `eredivisie-${EREDIVISIE_SEASON}` },
      create: {
        name: 'Eredivisie',
        country: 'Netherlands',
        external_id: `eredivisie-${EREDIVISIE_SEASON}`,
        is_active: true,
      },
      update: { is_active: true },
    })

    // ─── 2. Per team: squad ophalen ──────────────────────────────────────────
    for (const { team } of teams) {
      try {
        logger.info(`Sync: Squad ophalen voor ${team.name} (${team.id})`)

        const squadResp = await api.get('/players/squads', {
          params: { team: team.id },
        })
        result.api_calls_used++

        const squads: Array<{
          team: { id: number; name: string }
          players: Array<{
            id: number
            name: string
            age: number
            number: number
            position: string
            photo: string
          }>
        }> = squadResp.data.response ?? []

        const squadData = squads[0]
        if (!squadData) continue

        // ─── 3. Spelersstatistieken ophalen (page 1 bevat de meeste) ─────────
        let statsMap: Map<number, {
          goals: number
          assists: number
          yellow_cards: number
          red_cards: number
          saves: number
          goals_conceded: number
          minutes: number
          rating: number
          appearances: number
        }> = new Map()

        try {
          const statsResp = await api.get('/players', {
            params: {
              league: EREDIVISIE_LEAGUE,
              season: EREDIVISIE_SEASON,
              team: team.id,
              page: 1,
            },
          })
          result.api_calls_used++

          for (const entry of (statsResp.data.response ?? [])) {
            const playerId = entry.player?.id
            if (!playerId) continue

            const s = entry.statistics?.[0]
            if (!s) continue

            statsMap.set(playerId, {
              goals:          s.goals?.total ?? 0,
              assists:        s.goals?.assists ?? 0,
              yellow_cards:   s.cards?.yellow ?? 0,
              red_cards:      s.cards?.red ?? 0,
              saves:          s.goals?.saves ?? 0,
              goals_conceded: s.goals?.conceded ?? 0,
              minutes:        s.games?.minutes ?? 0,
              rating:         parseFloat(s.games?.rating ?? '6.0') || 6.0,
              appearances:    s.games?.appearences ?? 0,
            })
          }
        } catch (statsErr) {
          logger.warn(`Stats ophalen mislukt voor ${team.name}`, { statsErr })
          result.errors.push(`Stats mislukt: ${team.name}`)
        }

        // ─── 4. Spelers opslaan in database ───────────────────────────────────
        for (const p of squadData.players) {
          const position = POSITION_MAP[p.position] ?? 'MID'
          const stats = statsMap.get(p.id)

          const total_points = stats
            ? calcPoints({ ...stats, position })
            : 0

          // Form = rating genormaliseerd (6.0 → 5.0, 7.5 → 7.5, etc.)
          const form = stats ? Math.min(10, Math.max(0, stats.rating)) : 5.0

          // Basisprijs op basis van positie en form
          const basePrice = position === 'GK' ? 5.0
            : position === 'DEF' ? 5.5
            : position === 'MID' ? 6.5
            : 7.0
          const price = Math.min(15, Math.max(4, basePrice + (form - 6) * 0.5))

          await prisma.player.upsert({
            where: { external_id: `api-${p.id}` },
            create: {
              external_id:        `api-${p.id}`,
              name:               p.name,
              display_name:       p.name,
              club:               team.name,
              club_id:            team.id,
              position,
              nationality:        '',
              photo_url:          p.photo,
              league_id:          league.id,
              league_external_id: `eredivisie-${EREDIVISIE_SEASON}`,
              price:              parseFloat(price.toFixed(1)),
              form:               parseFloat(form.toFixed(1)),
              total_points:       Math.max(0, total_points),
              availability:       'AVAILABLE',
            },
            update: {
              name:         p.name,
              display_name: p.name,
              club:         team.name,
              club_id:      team.id,
              position,
              photo_url:    p.photo,
              form:         parseFloat(form.toFixed(1)),
              total_points: Math.max(0, total_points),
              price:        parseFloat(price.toFixed(1)),
            },
          })

          result.players_synced++
        }

        result.teams_synced++

        // 6 seconden wachten — free plan limiet is 10 calls/min
        await new Promise(r => setTimeout(r, 6000))
      } catch (teamErr) {
        logger.error(`Team sync mislukt: ${team.name}`, { teamErr })
        result.errors.push(`Team mislukt: ${team.name}`)
      }
    }

    // ─── 5. Blessures en schorsingen bijwerken ────────────────────────────────
    logger.info('Sync: Blessures ophalen...')
    try {
      // Haal de actieve gameweek op om de fixture datum te bepalen
      const activeGw = await prisma.gameweek.findFirst({
        where: { status: 'ACTIVE' },
        include: { matches: true },
      })

      const nextFixtureDate = activeGw?.matches?.[0]?.kickoff
      const fixtureParam = nextFixtureDate
        ? { fixture: activeGw!.matches[0].external_id }
        : { league: EREDIVISIE_LEAGUE, season: EREDIVISIE_SEASON, fixture: 1213441 } // fallback

      const injuriesResp = await api.get('/injuries', {
        params: { league: EREDIVISIE_LEAGUE, season: EREDIVISIE_SEASON },
      })
      result.api_calls_used++

      // Groepeer per speler: neem de meest recente injury status
      const latestInjuries = new Map<number, { type: string; reason: string }>()
      for (const entry of (injuriesResp.data.response ?? [])) {
        const pId = entry.player?.id
        if (pId) {
          // Later entries overschrijven eerdere (API sorteert op datum)
          latestInjuries.set(pId, {
            type: entry.player.type ?? 'Missing Fixture',
            reason: entry.player.reason ?? 'Injury',
          })
        }
      }

      // Update spelers met blessure status
      for (const [apiPlayerId, injury] of latestInjuries) {
        const player = await prisma.player.findUnique({
          where: { external_id: `api-${apiPlayerId}` },
        })
        if (!player) continue

        const availability = injury.type === 'Questionable' ? 'DOUBT'
          : injury.reason?.toLowerCase().includes('suspen') ? 'SUSPENDED'
          : 'INJURED'

        await prisma.player.update({
          where: { id: player.id },
          data: { availability },
        })
        result.injured_updated++
      }

      // Zet alle andere spelers terug op AVAILABLE
      await prisma.player.updateMany({
        where: {
          external_id: { startsWith: 'api-' },
          id: {
            notIn: await prisma.player
              .findMany({
                where: {
                  external_id: { startsWith: 'api-' },
                  availability: { not: 'AVAILABLE' },
                },
                select: { id: true },
              })
              .then(ps => ps.map(p => p.id)),
          },
        },
        data: { availability: 'AVAILABLE' },
      })

      logger.info(`Sync: ${result.injured_updated} spelers met blessure/schorsing bijgewerkt`)
    } catch (injErr) {
      logger.warn('Blessures ophalen mislukt', { injErr })
      result.errors.push('Blessures sync mislukt')
    }

    logger.info('Sync voltooid', result)
    return result
  } catch (err) {
    logger.error('Sync volledig mislukt', { err })
    result.errors.push(`Fatale fout: ${String(err)}`)
    return result
  }
}
