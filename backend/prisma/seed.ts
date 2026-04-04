import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Users ───────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin1234!', 12)
  const userHash = await bcrypt.hash('User1234!', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@footballmanager.pro' },
    update: {},
    create: {
      email: 'admin@footballmanager.pro',
      password_hash: adminHash,
      username: 'Admin',
      is_admin: true,
      kyc_status: 'VERIFIED',
      tier: 'PLATINUM',
      balance_credits: 1000,
    },
  })

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@footballmanager.pro' },
    update: {},
    create: {
      email: 'demo@footballmanager.pro',
      password_hash: userHash,
      username: 'DemoManager',
      kyc_status: 'VERIFIED',
      tier: 'GOLD',
      balance_credits: 100,
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'jan@footballmanager.pro' },
    update: {},
    create: {
      email: 'jan@footballmanager.pro',
      password_hash: userHash,
      username: 'JanDeVoetbalfan',
      kyc_status: 'VERIFIED',
      tier: 'SILVER',
      balance_credits: 47.5,
    },
  })

  console.log('✅ Users created', { admin: admin.id, demo: demoUser.id, jan: user2.id })

  // ─── Season ───────────────────────────────────────────────────────────────────
  const season = await prisma.season.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Eredivisie 2024/25',
      competition: 'eredivisie',
      start_date: new Date('2024-08-10'),
      end_date: new Date('2025-05-18'),
      entry_fee_min: 5,
      entry_fee_max: 100,
      total_pot: 37410,
      status: 'ACTIVE',
    },
  })
  console.log('✅ Season created', season.name)

  // ─── Gameweeks ─────────────────────────────────────────────────────────────────
  const now = new Date()
  const gameweek = await prisma.gameweek.upsert({
    where: { id: 28 },
    update: {},
    create: {
      id: 28,
      season_id: 1,
      number: 28,
      deadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      start_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      end_date: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      status: 'UPCOMING',
    },
  })

  // ─── Players ──────────────────────────────────────────────────────────────────
  const players = [
    // Goalkeepers
    { external_id: 'gk_alisson', name: 'Alisson Becker', display_name: 'Alisson', club: 'Liverpool', club_id: 40, position: 'GK' as const, price: 5.5, form: 7.8 },
    { external_id: 'gk_ederson', name: 'Ederson Moraes', display_name: 'Ederson', club: 'Manchester City', club_id: 50, position: 'GK' as const, price: 5.5, form: 7.5 },
    // Defenders
    { external_id: 'def_taa', name: 'T. Alexander-Arnold', display_name: 'T. Alexander-Arnold', club: 'Liverpool', club_id: 40, position: 'DEF' as const, price: 9.5, form: 7.8 },
    { external_id: 'def_saliba', name: 'W. Saliba', display_name: 'W. Saliba', club: 'Arsenal', club_id: 42, position: 'DEF' as const, price: 7.0, form: 7.5 },
    { external_id: 'def_pedro_porro', name: 'Pedro Porro', display_name: 'Pedro Porro', club: 'Tottenham', club_id: 49, position: 'DEF' as const, price: 6.5, form: 7.0 },
    { external_id: 'def_mykolenko', name: 'V. Mykolenko', display_name: 'Mykolenko', club: 'Everton', club_id: 45, position: 'DEF' as const, price: 4.5, form: 6.0 },
    // Midfielders
    { external_id: 'mid_saka', name: 'Bukayo Saka', display_name: 'B. Saka', club: 'Arsenal', club_id: 42, position: 'MID' as const, price: 10.5, form: 8.5 },
    { external_id: 'mid_kdb', name: 'Kevin De Bruyne', display_name: 'K. De Bruyne', club: 'Manchester City', club_id: 50, position: 'MID' as const, price: 11.5, form: 8.8 },
    { external_id: 'mid_rashford', name: 'Marcus Rashford', display_name: 'M. Rashford', club: 'Manchester United', club_id: 33, position: 'MID' as const, price: 8.0, form: 6.5 },
    { external_id: 'mid_maddison', name: 'James Maddison', display_name: 'J. Maddison', club: 'Tottenham', club_id: 49, position: 'MID' as const, price: 7.5, form: 7.2 },
    // Forwards
    { external_id: 'fwd_haaland', name: 'Erling Haaland', display_name: 'E. Haaland', club: 'Manchester City', club_id: 50, position: 'FWD' as const, price: 14.5, form: 9.2 },
    { external_id: 'fwd_salah', name: 'Mohamed Salah', display_name: 'M. Salah', club: 'Liverpool', club_id: 40, position: 'FWD' as const, price: 13.0, form: 8.8 },
    { external_id: 'fwd_watkins', name: 'Ollie Watkins', display_name: 'O. Watkins', club: 'Aston Villa', club_id: 66, position: 'FWD' as const, price: 9.0, form: 8.0 },
    { external_id: 'fwd_vardy', name: 'Jamie Vardy', display_name: 'J. Vardy', club: 'Leicester', club_id: 46, position: 'FWD' as const, price: 5.5, form: 6.5 },
    // Eredivisie players
    { external_id: 'erd_brobbey', name: 'Brian Brobbey', display_name: 'B. Brobbey', club: 'Ajax', club_id: 194, position: 'FWD' as const, price: 7.5, form: 8.2 },
    { external_id: 'erd_kudus', name: 'Mohammed Kudus', display_name: 'M. Kudus', club: 'Ajax', club_id: 194, position: 'MID' as const, price: 8.0, form: 8.5 },
    { external_id: 'erd_gimenez', name: 'Santiago Giménez', display_name: 'S. Giménez', club: 'Feyenoord', club_id: 209, position: 'FWD' as const, price: 9.5, form: 9.0 },
    { external_id: 'erd_stengs', name: 'Calvin Stengs', display_name: 'C. Stengs', club: 'Feyenoord', club_id: 209, position: 'MID' as const, price: 7.0, form: 7.8 },
  ]

  for (const p of players) {
    await prisma.player.upsert({
      where: { external_id: p.external_id },
      update: { price: p.price, form: p.form },
      create: {
        external_id: p.external_id,
        name: p.name,
        display_name: p.display_name,
        club: p.club,
        club_id: p.club_id,
        position: p.position,
        price: p.price,
        form: p.form,
        total_points: Math.floor(Math.random() * 150) + 50,
        availability: 'AVAILABLE',
      },
    })
  }
  console.log(`✅ ${players.length} players created`)

  // ─── Sample match ─────────────────────────────────────────────────────────────
  await prisma.match.upsert({
    where: { external_id: 'fixture_sample_001' },
    update: {},
    create: {
      external_id: 'fixture_sample_001',
      gameweek_id: 28,
      home_team: 'Manchester City',
      home_team_id: 50,
      away_team: 'Arsenal',
      away_team_id: 42,
      kickoff: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      status: 'SCHEDULED',
    },
  })

  // ─── Achievements ─────────────────────────────────────────────────────────────
  const achievements = [
    { code: 'FIRST_WIN', name: 'Eerste Overwinning', description: 'Win je eerste speelronde', icon: '🏆' },
    { code: 'HAT_TRICK_WEEK', name: 'Hattrick Week', description: 'Scoor 3 goals in 1 week via je spelers', icon: '⚽' },
    { code: 'TRANSFER_PRO', name: 'Transfer Pro', description: 'Voer 10 transfers uit', icon: '🔄' },
    { code: 'SEASON_VETERAN', name: 'Seizoens Veteraan', description: 'Speel 3 seizoenen mee', icon: '⭐' },
    { code: 'TOP_10', name: 'Top 10 Manager', description: 'Eindig in de top 10', icon: '🎯' },
  ]

  for (const a of achievements) {
    await prisma.achievement.upsert({
      where: { code: a.code },
      update: {},
      create: { ...a, points_reward: 0, credits_reward: 0 },
    })
  }
  console.log(`✅ ${achievements.length} achievements created`)

  console.log('\n🎉 Seed voltooid!')
  console.log('📧 Admin: admin@footballmanager.pro / Admin1234!')
  console.log('📧 Demo: demo@footballmanager.pro / User1234!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
