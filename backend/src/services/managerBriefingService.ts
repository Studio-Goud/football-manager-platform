import Anthropic from '@anthropic-ai/sdk'
import prisma from '../config/database'
import logger from '../config/logger'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' })

export interface ManagerBriefing {
  biggest_risk: { player: string; reason: string }
  best_chance: { player: string; reason: string }
  transfer_advice: { sell: string; buy: string; reason: string }
  tactic_advice: string
  generated_at: string
}

export async function generateManagerBriefing(userId: string): Promise<ManagerBriefing | null> {
  try {
    const currentSeason = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })
    const team = await prisma.team.findFirst({
      where: { user_id: userId, ...(currentSeason ? { season_id: currentSeason.id } : {}) },
      include: {
        players: { include: { player: true } },
        gameweeks: { orderBy: { gameweek_id: 'desc' }, take: 1 },
      },
      orderBy: { created_at: 'desc' },
    })

    if (!team || team.players.length === 0) return null

    const starters = team.players
      .filter(tp => !tp.slot_position.startsWith('BENCH'))
      .map(tp => `${tp.player.name} (${tp.player.position}, ${tp.player.club}, form: ${Number(tp.player.form).toFixed(1)}, ${tp.is_captain ? 'AANVOERDER' : ''})`)
      .join('\n')

    const gwPoints = team.gameweeks[0] ? Number(team.gameweeks[0].points) : 0
    const rank = team.gameweeks[0]?.rank ?? null

    const prompt = `Je bent een persoonlijke voetbalanalist voor een fantasy football manager.

Huidig team (basisspelers):
${starters}

Tactiek: ${team.tactic_style}
Punten laatste speelronde: ${gwPoints}
Huidige rang: ${rank ? `#${rank}` : 'onbekend'}

Geef een analyse in JSON formaat (geen uitleg buiten de JSON):
{
  "biggest_risk": { "player": "naam", "reason": "max 15 woorden" },
  "best_chance": { "player": "naam", "reason": "max 15 woorden" },
  "transfer_advice": { "sell": "naam", "buy": "vervanger suggestie", "reason": "max 15 woorden" },
  "tactic_advice": "max 20 woorden over of de huidige tactiek goed is"
}`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])
    return { ...parsed, generated_at: new Date().toISOString() }
  } catch (err) {
    logger.error('Manager briefing error', { err })
    return null
  }
}
