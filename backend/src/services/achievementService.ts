import prisma from '../config/database'

export const ACHIEVEMENTS = [
  {
    code: 'first_team',
    name: 'Eerste Team',
    description: 'Stel je eerste elftal samen',
    icon: '⚽',
    points_reward: 10,
    credits_reward: 100,
  },
  {
    code: 'first_win',
    name: 'Eerste Overwinning',
    description: 'Win je eerste duel',
    icon: '🏆',
    points_reward: 20,
    credits_reward: 250,
  },
  {
    code: 'top_10',
    name: 'Top 10',
    description: 'Sta in de top 10 van de ranglijst',
    icon: '🎯',
    points_reward: 30,
    credits_reward: 500,
  },
  {
    code: 'century',
    name: 'Honderd Punten',
    description: 'Behaal 100 totale punten',
    icon: '💯',
    points_reward: 15,
    credits_reward: 200,
  },
  {
    code: 'hat_trick',
    name: 'Hat-trick Hamer',
    description: 'Heb een speler in je team die 3 doelpunten maakt in één wedstrijd',
    icon: '🎩',
    points_reward: 25,
    credits_reward: 300,
  },
  {
    code: 'scout_master',
    name: 'Scout Master',
    description: 'Gebruik de AI scout 10 keer',
    icon: '🔭',
    points_reward: 20,
    credits_reward: 200,
  },
  {
    code: 'rich',
    name: 'Rijkaard',
    description: 'Spaar 10.000 coins op',
    icon: '💰',
    points_reward: 25,
    credits_reward: 0,
  },
  {
    code: 'veteran',
    name: 'Veteraan',
    description: 'Speel 3 seizoenen mee',
    icon: '⭐',
    points_reward: 50,
    credits_reward: 1000,
  },
  {
    code: 'perfect_week',
    name: 'Perfecte Week',
    description: 'Scoor meer dan 80 punten in één speelronde',
    icon: '🌟',
    points_reward: 40,
    credits_reward: 600,
  },
  {
    code: 'league_winner',
    name: 'Competitiewinnaar',
    description: 'Win een privé competitie',
    icon: '👑',
    points_reward: 100,
    credits_reward: 2000,
  },
]

export async function seedAchievements() {
  let count = 0
  for (const ach of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: ach.code },
      update: {},
      create: ach,
    })
    count++
  }
  return count
}

export async function awardAchievement(userId: string, code: string): Promise<boolean> {
  const achievement = await prisma.achievement.findUnique({ where: { code } })
  if (!achievement) return false

  const already = await prisma.userAchievement.findFirst({
    where: { user_id: userId, achievement_id: achievement.id },
  })
  if (already) return false

  await prisma.userAchievement.create({
    data: { user_id: userId, achievement_id: achievement.id },
  })

  if (Number(achievement.credits_reward) > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { balance_credits: { increment: achievement.credits_reward } },
    })
  }

  return true
}

export async function checkAndAwardAchievements(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return []

  const awarded: string[] = []

  const teams = await prisma.team.findMany({
    where: { user_id: userId },
    include: { players: true, gameweeks: true },
  })

  // first_team: has any team with players
  if (teams.some(t => t.players.length > 0)) {
    if (await awardAchievement(userId, 'first_team')) awarded.push('first_team')
  }

  // century: total_points >= 100
  const latestTeam = teams[0]
  if (latestTeam && Number(latestTeam.total_points) >= 100) {
    if (await awardAchievement(userId, 'century')) awarded.push('century')
  }

  // perfect_week: any gameweek points >= 80
  const hasPerfectWeek = teams.some(t => t.gameweeks.some(gw => Number(gw.points) >= 80))
  if (hasPerfectWeek) {
    if (await awardAchievement(userId, 'perfect_week')) awarded.push('perfect_week')
  }

  // rich: balance >= 10000
  if (Number(user.balance_credits) >= 10000) {
    if (await awardAchievement(userId, 'rich')) awarded.push('rich')
  }

  // scout_master: used scout 10+ times
  const scoutCount = await prisma.transaction.count({
    where: { user_id: userId, type: 'scout_usage' },
  })
  if (scoutCount >= 10) {
    if (await awardAchievement(userId, 'scout_master')) awarded.push('scout_master')
  }

  return awarded
}
