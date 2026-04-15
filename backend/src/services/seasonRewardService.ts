/**
 * Seizoen beloning service
 * - Aan einde seizoen: top 3 per privé competitie krijgt bonus coins
 * - Nieuw seizoen start: iedereen met een team krijgt 1000 startcoins
 */
import prisma from '../config/database'
import logger from '../config/logger'

const SEASON_END_REWARDS = [
  { rank: 1, coins: 2000 },
  { rank: 2, coins: 1000 },
  { rank: 3, coins: 500 },
]

const NEW_SEASON_BONUS = 1000

/**
 * Verwerk seizoensbeloningen voor alle privé competities
 * Aanroepen als een seizoen status → COMPLETED
 */
export async function processSeasonEndRewards(seasonId: number): Promise<void> {
  logger.info('Processing season end rewards', { seasonId })

  try {
    // Haal alle privé competities op die dit seizoen actief waren
    const privateLeagues = await prisma.privateLeague.findMany({
      where: { season_id: seasonId },
      include: {
        members: { include: { user: true } },
      },
    })

    for (const league of privateLeagues) {
      // Haal totale punten op per lid (via hun team in dit seizoen)
      const memberScores: Array<{ userId: string; username: string; points: number }> = []

      for (const member of league.members) {
        if (!member.team_id) continue

        const teamGameweeks = await prisma.teamGameweek.findMany({
          where: {
            team: { user_id: member.user_id, season_id: seasonId },
          },
        })

        const totalPoints = teamGameweeks.reduce((sum, tg) => sum + Number(tg.points), 0)
        memberScores.push({ userId: member.user_id, username: member.user.username, points: totalPoints })
      }

      // Sorteer op punten
      memberScores.sort((a, b) => b.points - a.points)

      // Deel beloningen uit aan top 3
      for (let i = 0; i < Math.min(memberScores.length, SEASON_END_REWARDS.length); i++) {
        const reward = SEASON_END_REWARDS[i]
        const winner = memberScores[i]

        await prisma.$transaction([
          prisma.user.update({
            where: { id: winner.userId },
            data: { balance_credits: { increment: reward.coins } },
          }),
          prisma.transaction.create({
            data: {
              user_id: winner.userId,
              type: 'PRIZE',
              amount: reward.coins,
              credits_amount: reward.coins,
              description: `Seizoensbeloning #${reward.rank} in "${league.name}" — ${reward.coins} coins`,
              status: 'COMPLETED',
            },
          }),
        ])

        logger.info('Season reward issued', {
          userId: winner.userId,
          rank: reward.rank,
          coins: reward.coins,
          league: league.name,
        })
      }
    }

    logger.info('Season end rewards processed', { seasonId })
  } catch (err) {
    logger.error('Season reward processing failed', { err, seasonId })
    throw err
  }
}

/**
 * Geef alle actieve gebruikers een nieuw-seizoen startbonus
 */
export async function giveNewSeasonBonus(): Promise<number> {
  logger.info('Giving new season bonus to all active users')

  try {
    // Alle gebruikers die afgelopen 90 dagen actief waren
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const activeUsers = await prisma.user.findMany({
      where: { last_active: { gte: cutoff }, is_suspended: false },
      select: { id: true },
    })

    let count = 0
    for (const user of activeUsers) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { balance_credits: { increment: NEW_SEASON_BONUS } },
        }),
        prisma.transaction.create({
          data: {
            user_id: user.id,
            type: 'BONUS',
            amount: NEW_SEASON_BONUS,
            credits_amount: NEW_SEASON_BONUS,
            description: `Nieuw seizoen startbonus — ${NEW_SEASON_BONUS} coins`,
            status: 'COMPLETED',
          },
        }),
      ])
      count++
    }

    logger.info('New season bonuses issued', { count, coins_per_user: NEW_SEASON_BONUS })
    return count
  } catch (err) {
    logger.error('New season bonus failed', { err })
    throw err
  }
}
