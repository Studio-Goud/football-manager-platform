import Anthropic from '@anthropic-ai/sdk'
import prisma from '../config/database'
import { TACTIC_META, TacticStyle } from './scoringService'
import logger from '../config/logger'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
})

export interface TransferTip {
  sell_player: string
  sell_club: string
  sell_position: string
  sell_price: number
  buy_player: string
  buy_club: string
  buy_position: string
  buy_price: number
  reason: string
  expected_gain: string
  confidence: 'HOOG' | 'MIDDEL' | 'LAAG'
}

export interface ScoutReport {
  tactic_style: string
  tactic_label: string
  tactic_icon: string
  manager_summary: string
  tips: TransferTip[]
  tactic_advice: string
  generated_at: string
}

// ── Build context for Claude ──────────────────────────────────────────────────

async function buildTeamContext(userId: string): Promise<string | null> {
  const currentSeason = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })

  const team = await prisma.team.findFirst({
    where: {
      user_id: userId,
      ...(currentSeason ? { season_id: currentSeason.id } : {}),
    },
    include: {
      players: { include: { player: true } },
    },
    orderBy: { created_at: 'desc' },
  })

  if (!team) return null

  const tactic = (team.tactic_style ?? 'BALANCED') as TacticStyle
  const tacticMeta = TACTIC_META[tactic]

  // Get upcoming fixtures
  const upcomingMatches = await prisma.match.findMany({
    where: {
      status: 'SCHEDULED',
      kickoff: { gte: new Date() },
    },
    orderBy: { kickoff: 'asc' },
    take: 20,
  })

  // Get available players for transfers (top by form, not in team)
  const myPlayerIds = team.players.map(tp => tp.player_id)
  const topAvailable = await prisma.player.findMany({
    where: {
      id: { notIn: myPlayerIds },
      availability: 'AVAILABLE',
    },
    orderBy: { form: 'desc' },
    take: 30,
  })

  const playerList = team.players
    .filter(tp => !tp.slot_position.startsWith('BENCH'))
    .map(tp => {
      const p = tp.player
      const hasGoodFixture = upcomingMatches.some(
        m => m.home_team_id === p.club_id || m.away_team_id === p.club_id
      )
      return `- ${p.display_name || p.name} (${p.position}, ${p.club}) | Prijs: ${p.price} cr | Vorm: ${p.form}/10 | Punten: ${p.total_points} | Aankomende fixture: ${hasGoodFixture ? 'JA' : 'ONBEKEND'}${tp.is_captain ? ' [AANVOERDER]' : ''}`
    })
    .join('\n')

  const availableList = topAvailable
    .slice(0, 15)
    .map(p => `- ${p.display_name || p.name} (${p.position}, ${p.club}) | Prijs: ${p.price} cr | Vorm: ${p.form}/10 | Punten: ${p.total_points}`)
    .join('\n')

  const budgetSpent = team.players.reduce((s, tp) => s + Number(tp.purchase_price), 0)
  const budgetRemaining = 100 - budgetSpent

  return `
MANAGER TEAM ANALYSE
====================
Team naam: ${team.name}
Tactiek: ${tacticMeta.label} ${tacticMeta.icon}
Tactiek profiel: ${tacticMeta.description}
Beste posities met deze tactiek: ${tacticMeta.bestFor}
Budget over: ${budgetRemaining.toFixed(1)} credits

HUIDIGE BASISELF (excl. bank):
${playerList}

BESCHIKBARE SPELERS OP DE MARKT (top 15 op vorm):
${availableList}
`.trim()
}

// ── Main scout function ───────────────────────────────────────────────────────

export async function generateScoutReport(userId: string): Promise<ScoutReport | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.warn('ANTHROPIC_API_KEY not set — returning mock scout report')
    return generateMockReport()
  }

  const context = await buildTeamContext(userId)
  if (!context) return null

  const team = await prisma.team.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  })
  const tactic = (team?.tactic_style ?? 'BALANCED') as TacticStyle
  const tacticMeta = TACTIC_META[tactic]

  const prompt = `Je bent een expert fantasy football scout en tactisch analist. Analyseer dit team en geef concrete, specifieke aanbevelingen.

${context}

Geef je analyse UITSLUITEND in dit JSON formaat (geen extra tekst):
{
  "manager_summary": "Korte beoordeling van de huidige situatie (2-3 zinnen, eerlijk en direct)",
  "tips": [
    {
      "sell_player": "Naam verkopen speler",
      "sell_club": "Club",
      "sell_position": "GK/DEF/MID/FWD",
      "sell_price": 0.0,
      "buy_player": "Naam kopen speler",
      "buy_club": "Club",
      "buy_position": "GK/DEF/MID/FWD",
      "buy_price": 0.0,
      "reason": "Specifieke reden (max 2 zinnen)",
      "expected_gain": "+X punten verwacht",
      "confidence": "HOOG"
    }
  ],
  "tactic_advice": "Advies over of de huidige tactiek optimaal is voor dit team, en zo niet, welke beter zou werken (max 2 zinnen)"
}

Geef exact 3 transfers. Kies alleen spelers uit de lijsten. Wees concreet, niet generiek.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: 'Je bent een fantasy football expert. Antwoord ALLEEN in valide JSON, geen markdown, geen uitleg.',
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text)

    return {
      tactic_style: tactic,
      tactic_label: tacticMeta.label,
      tactic_icon: tacticMeta.icon,
      manager_summary: parsed.manager_summary,
      tips: parsed.tips,
      tactic_advice: parsed.tactic_advice,
      generated_at: new Date().toISOString(),
    }
  } catch (err) {
    logger.error('Scout AI error', { err })
    return generateMockReport()
  }
}

// ── Mock report (als API key ontbreekt of fout) ────────────────────────────────

function generateMockReport(): ScoutReport {
  return {
    tactic_style: 'HIGH_PRESS',
    tactic_label: 'Hoog Druk',
    tactic_icon: '🔥',
    manager_summary: 'Je team heeft goede aanvalskwaliteit maar je verdediging presteert ondergemiddeld. Met je Hoog Druk tactiek laat je punten liggen bij je middenvelders — overweeg een rotatie.',
    tips: [
      {
        sell_player: 'Pedro Porro',
        sell_club: 'Tottenham',
        sell_position: 'DEF',
        sell_price: 5.5,
        buy_player: 'Trent Alexander-Arnold',
        buy_club: 'Liverpool',
        buy_position: 'DEF',
        buy_price: 7.5,
        reason: 'Alexander-Arnold heeft 3 assists in de laatste 4 wedstrijden en Liverpool speelt thuis dit weekend. Met Hoog Druk profiteert hij extra als offensieve verdediger.',
        expected_gain: '+6 punten verwacht',
        confidence: 'HOOG',
      },
      {
        sell_player: 'Isak',
        sell_club: 'Newcastle',
        sell_position: 'FWD',
        sell_price: 7.8,
        buy_player: 'Erling Haaland',
        buy_club: 'Man City',
        buy_position: 'FWD',
        buy_price: 14.5,
        reason: 'Haaland scoort in elke wedstrijd en met Hoog Druk krijgt hij 25% bonus. De prijs is hoog maar de return is ongekend.',
        expected_gain: '+10 punten verwacht',
        confidence: 'HOOG',
      },
      {
        sell_player: 'Raya',
        sell_club: 'Arsenal',
        sell_position: 'GK',
        sell_price: 5.3,
        buy_player: 'Flekken',
        buy_club: 'Brentford',
        buy_position: 'GK',
        buy_price: 4.5,
        reason: 'Arsenal speelt Man City dit weekend (laag clean sheet kans). Flekken heeft 3 clean sheets in 4 wedstrijden en is 0.8 credits goedkoper.',
        expected_gain: '+3 punten verwacht',
        confidence: 'MIDDEL',
      },
    ],
    tactic_advice: 'Je Hoog Druk tactiek werkt goed met je huidige aanvallers, maar overweeg over te stappen naar Counter-attack als je Haaland toevoegt — dat geeft hem 30% bonus in plaats van 25%.',
    generated_at: new Date().toISOString(),
  }
}
