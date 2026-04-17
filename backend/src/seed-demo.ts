/**
 * Demo seed: maakt een actief seizoen, gameweeks, Eredivisie spelers en een team aan voor het test account.
 * Wordt aangeroepen bij server-start als er nog geen actief seizoen is.
 */
import prisma from './config/database'
import logger from './config/logger'

const EREDIVISIE_PLAYERS = [
  // Ajax
  { name: 'Remko Pasveer',      display_name: 'Pasveer',   club: 'Ajax', club_id: 610, position: 'GK',  nationality: 'NL', price: 5.5,  form: 6.2, total_points: 98 },
  { name: 'Jorrel Hato',        display_name: 'Hato',      club: 'Ajax', club_id: 610, position: 'DEF', nationality: 'NL', price: 6.0,  form: 7.1, total_points: 112 },
  { name: 'Devyne Rensch',      display_name: 'Rensch',    club: 'Ajax', club_id: 610, position: 'DEF', nationality: 'NL', price: 5.0,  form: 6.0, total_points: 88 },
  { name: 'Kenneth Taylor',     display_name: 'K. Taylor', club: 'Ajax', club_id: 610, position: 'MID', nationality: 'NL', price: 7.5,  form: 7.8, total_points: 145 },
  { name: 'Branco van den Boomen', display_name: 'Van den Boomen', club: 'Ajax', club_id: 610, position: 'MID', nationality: 'NL', price: 7.0, form: 7.4, total_points: 138 },
  { name: 'Wout Weghorst',      display_name: 'Weghorst',  club: 'Ajax', club_id: 610, position: 'FWD', nationality: 'NL', price: 9.0,  form: 8.1, total_points: 167 },
  { name: 'Chuba Akpom',        display_name: 'Akpom',     club: 'Ajax', club_id: 610, position: 'FWD', nationality: 'NL', price: 8.0,  form: 7.5, total_points: 143 },

  // PSV
  { name: 'Walter Benítez',     display_name: 'Benítez',   club: 'PSV', club_id: 611, position: 'GK',  nationality: 'AR', price: 5.5,  form: 7.0, total_points: 115 },
  { name: 'Rick Karsdorp',      display_name: 'Karsdorp',  club: 'PSV', club_id: 611, position: 'DEF', nationality: 'NL', price: 5.5,  form: 6.5, total_points: 102 },
  { name: 'Olivier Boscagli',   display_name: 'Boscagli',  club: 'PSV', club_id: 611, position: 'DEF', nationality: 'FR', price: 5.0,  form: 6.2, total_points: 97 },
  { name: 'Joey Veerman',       display_name: 'Veerman',   club: 'PSV', club_id: 611, position: 'MID', nationality: 'NL', price: 8.5,  form: 8.3, total_points: 162 },
  { name: 'Jerdy Schouten',     display_name: 'Schouten',  club: 'PSV', club_id: 611, position: 'MID', nationality: 'NL', price: 7.0,  form: 7.2, total_points: 128 },
  { name: 'Luuk de Jong',       display_name: 'L. de Jong', club: 'PSV', club_id: 611, position: 'FWD', nationality: 'NL', price: 9.5,  form: 8.8, total_points: 189 },
  { name: 'Noa Lang',           display_name: 'N. Lang',   club: 'PSV', club_id: 611, position: 'MID', nationality: 'NL', price: 8.0,  form: 7.9, total_points: 151 },

  // Feyenoord
  { name: 'Timon Wellenreuther', display_name: 'Wellenreuther', club: 'Feyenoord', club_id: 612, position: 'GK', nationality: 'DE', price: 5.0, form: 6.8, total_points: 108 },
  { name: 'Quilindschy Hartman', display_name: 'Hartman',   club: 'Feyenoord', club_id: 612, position: 'DEF', nationality: 'NL', price: 5.5, form: 6.7, total_points: 106 },
  { name: 'Gernot Trauner',     display_name: 'Trauner',   club: 'Feyenoord', club_id: 612, position: 'DEF', nationality: 'AT', price: 5.0, form: 6.3, total_points: 98 },
  { name: 'Quinten Timber',     display_name: 'Q. Timber', club: 'Feyenoord', club_id: 612, position: 'MID', nationality: 'NL', price: 7.5, form: 7.6, total_points: 142 },
  { name: 'Ramiz Zerrouki',     display_name: 'Zerrouki',  club: 'Feyenoord', club_id: 612, position: 'MID', nationality: 'NL', price: 6.5, form: 6.8, total_points: 121 },
  { name: 'Santiago Giménez',   display_name: 'Giménez',   club: 'Feyenoord', club_id: 612, position: 'FWD', nationality: 'MX', price: 10.0, form: 9.1, total_points: 201 },
  { name: 'Ayase Ueda',         display_name: 'Ueda',      club: 'Feyenoord', club_id: 612, position: 'FWD', nationality: 'JP', price: 7.5, form: 7.7, total_points: 148 },

  // AZ
  { name: 'Hobie Verhulst',     display_name: 'Verhulst',  club: 'AZ', club_id: 613, position: 'GK',  nationality: 'NL', price: 4.5, form: 6.0, total_points: 90 },
  { name: 'Maximiliano Romero', display_name: 'Romero',    club: 'AZ', club_id: 613, position: 'DEF', nationality: 'AR', price: 4.5, form: 5.8, total_points: 85 },
  { name: 'Milos Kerkez',       display_name: 'Kerkez',    club: 'AZ', club_id: 613, position: 'DEF', nationality: 'HU', price: 5.5, form: 7.0, total_points: 118 },
  { name: 'Tijjani Reijnders',  display_name: 'Reijnders', club: 'AZ', club_id: 613, position: 'MID', nationality: 'NL', price: 8.0, form: 8.0, total_points: 158 },
  { name: 'Vangelis Pavlidis',  display_name: 'Pavlidis',  club: 'AZ', club_id: 613, position: 'FWD', nationality: 'GR', price: 9.0, form: 8.5, total_points: 178 },

  // Utrecht
  { name: 'Maarten Paes',       display_name: 'Paes',      club: 'Utrecht', club_id: 614, position: 'GK',  nationality: 'NL', price: 4.5, form: 6.2, total_points: 92 },
  { name: 'Nick Viergever',     display_name: 'Viergever', club: 'Utrecht', club_id: 614, position: 'DEF', nationality: 'NL', price: 4.0, form: 5.5, total_points: 78 },
  { name: 'Bart Ramselaar',     display_name: 'Ramselaar', club: 'Utrecht', club_id: 614, position: 'MID', nationality: 'NL', price: 6.0, form: 6.5, total_points: 108 },
  { name: 'Anastasios Douvikas', display_name: 'Douvikas', club: 'Utrecht', club_id: 614, position: 'FWD', nationality: 'GR', price: 7.5, form: 7.3, total_points: 135 },

  // Twente
  { name: 'Lars Unnerstall',    display_name: 'Unnerstall', club: 'Twente', club_id: 615, position: 'GK', nationality: 'DE', price: 4.5, form: 6.5, total_points: 100 },
  { name: 'Mees Hilgers',       display_name: 'Hilgers',   club: 'Twente', club_id: 615, position: 'DEF', nationality: 'NL', price: 5.5, form: 7.0, total_points: 115 },
  { name: 'Sem Steijn',         display_name: 'Steijn',    club: 'Twente', club_id: 615, position: 'MID', nationality: 'NL', price: 7.0, form: 7.4, total_points: 130 },
  { name: 'Ricky van Wolfswinkel', display_name: 'Van Wolfswinkel', club: 'Twente', club_id: 615, position: 'FWD', nationality: 'NL', price: 7.0, form: 7.1, total_points: 128 },

  // Vitesse
  { name: 'Jeroen Houwen',      display_name: 'Houwen',    club: 'Vitesse', club_id: 616, position: 'GK', nationality: 'NL', price: 4.0, form: 5.5, total_points: 80 },
  { name: 'Daan Huisman',       display_name: 'Huisman',   club: 'Vitesse', club_id: 616, position: 'MID', nationality: 'NL', price: 5.5, form: 6.0, total_points: 95 },
  { name: 'Lois Openda',        display_name: 'Openda',    club: 'Vitesse', club_id: 616, position: 'FWD', nationality: 'BE', price: 8.5, form: 8.2, total_points: 165 },

  // NEC
  { name: 'Mattijs Branderhorst', display_name: 'Branderhorst', club: 'NEC', club_id: 617, position: 'GK', nationality: 'NL', price: 4.0, form: 5.8, total_points: 85 },
  { name: 'Ivan Márquez',       display_name: 'Márquez',   club: 'NEC', club_id: 617, position: 'DEF', nationality: 'ES', price: 4.5, form: 5.7, total_points: 82 },
  { name: 'Mikkel Haakonsen',   display_name: 'Haakonsen', club: 'NEC', club_id: 617, position: 'MID', nationality: 'NO', price: 5.5, form: 6.2, total_points: 98 },
  { name: 'Calvin Stengs',      display_name: 'Stengs',    club: 'NEC', club_id: 617, position: 'MID', nationality: 'NL', price: 6.5, form: 7.0, total_points: 118 },
]

/**
 * Force-seed: always ensures players + season exist, skips duplicate creates safely.
 * Used from admin endpoint when production database is empty.
 */
export async function seedDemoDataForce(): Promise<{ players: number; season: boolean }> {
  const league = await prisma.league.upsert({
    where: { external_id: 'eredivisie-2025' },
    create: { name: 'Eredivisie', country: 'Netherlands', external_id: 'eredivisie-2025', is_active: true },
    update: {},
  })

  let playersCreated = 0
  for (let i = 0; i < EREDIVISIE_PLAYERS.length; i++) {
    const p = EREDIVISIE_PLAYERS[i]
    await prisma.player.upsert({
      where: { external_id: `eredivisie-${p.club_id}-${i}` },
      create: {
        external_id: `eredivisie-${p.club_id}-${i}`,
        name: p.name, display_name: p.display_name, club: p.club, club_id: p.club_id,
        position: p.position, nationality: p.nationality, league_id: league.id,
        league_external_id: 'eredivisie-2025', price: p.price, form: p.form,
        total_points: p.total_points, availability: 'AVAILABLE',
      },
      update: { form: p.form, total_points: p.total_points, price: p.price },
    })
    playersCreated++
  }

  const existingSeason = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })
  const seasonCreated = !existingSeason

  return { players: playersCreated, season: seasonCreated }
}

export async function seedDemoData(): Promise<void> {
  try {
    // Skip if active season exists
    const existingSeason = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })
    if (existingSeason) {
      logger.info('Demo seed overgeslagen: actief seizoen bestaat al', { id: existingSeason.id })
      // Still ensure players exist (idempotent)
      const playerCount = await prisma.player.count()
      if (playerCount === 0) {
        logger.info('Geen spelers in DB, force-seeding spelers...')
        await seedDemoDataForce()
      }
      return
    }

    logger.info('Demo seed starten...')

    // 1. Maak League aan
    const league = await prisma.league.upsert({
      where: { external_id: 'eredivisie-2025' },
      create: {
        name: 'Eredivisie',
        country: 'Netherlands',
        external_id: 'eredivisie-2025',
        is_active: true,
      },
      update: {},
    })

    // 2. Maak spelers aan
    let createdPlayers = 0
    for (let i = 0; i < EREDIVISIE_PLAYERS.length; i++) {
      const p = EREDIVISIE_PLAYERS[i]
      await prisma.player.upsert({
        where: { external_id: `eredivisie-${p.club_id}-${i}` },
        create: {
          external_id: `eredivisie-${p.club_id}-${i}`,
          name: p.name,
          display_name: p.display_name,
          club: p.club,
          club_id: p.club_id,
          position: p.position,
          nationality: p.nationality,
          league_id: league.id,
          league_external_id: 'eredivisie-2025',
          price: p.price,
          form: p.form,
          total_points: p.total_points,
          availability: 'AVAILABLE',
        },
        update: { form: p.form, total_points: p.total_points },
      })
      createdPlayers++
    }
    logger.info(`${createdPlayers} spelers aangemaakt/bijgewerkt`)

    // 3. Maak seizoen aan
    const now = new Date()
    const season = await prisma.season.create({
      data: {
        name: 'Eredivisie 2024/25',
        competition: 'eredivisie',
        start_date: new Date('2024-08-01'),
        end_date: new Date('2025-05-31'),
        entry_fee_min: 5,
        entry_fee_max: 100,
        status: 'ACTIVE',
        total_pot: 0,
      },
    })
    logger.info('Seizoen aangemaakt', { id: season.id })

    // 4. Maak 28 gameweeks aan (28 al gespeeld, 1 actief)
    const gameweeks = []
    for (let gw = 1; gw <= 34; gw++) {
      const gwStart = new Date('2024-08-09')
      gwStart.setDate(gwStart.getDate() + (gw - 1) * 7)
      const gwEnd = new Date(gwStart)
      gwEnd.setDate(gwEnd.getDate() + 3)
      const deadline = new Date(gwStart)
      deadline.setHours(deadline.getHours() - 1)

      const status = gw < 28 ? 'FINISHED' : gw === 28 ? 'ACTIVE' : 'UPCOMING'

      const gameweek = await prisma.gameweek.create({
        data: {
          season_id: season.id,
          number: gw,
          deadline,
          start_date: gwStart,
          end_date: gwEnd,
          status,
        },
      })
      gameweeks.push(gameweek)
    }
    logger.info('34 gameweeks aangemaakt')

    // 5. Maak matches aan voor de actieve gameweek (GW 28)
    const activeGw = gameweeks[27] // index 27 = GW 28
    const matchDate = new Date()
    matchDate.setHours(matchDate.getHours() + 2)

    const gwMatches = [
      { home: 'Ajax', home_id: 610, away: 'PSV', away_id: 611 },
      { home: 'Feyenoord', home_id: 612, away: 'AZ', away_id: 613 },
      { home: 'Twente', home_id: 615, away: 'Utrecht', away_id: 614 },
      { home: 'NEC', home_id: 617, away: 'Vitesse', away_id: 616 },
    ]

    for (let i = 0; i < gwMatches.length; i++) {
      const m = gwMatches[i]
      await prisma.match.create({
        data: {
          external_id: `gw28-match-${i + 1}`,
          gameweek_id: activeGw.id,
          home_team: m.home,
          home_team_id: m.home_id,
          away_team: m.away,
          away_team_id: m.away_id,
          kickoff: matchDate,
          status: 'SCHEDULED',
        },
      })
    }
    logger.info('GW28 wedstrijden aangemaakt')

    // 6. Maak team aan voor de test user (als die bestaat en nog geen team heeft)
    const testUser = await prisma.user.findUnique({ where: { email: 'ricardo@test.nl' } })
    if (testUser) {
      const existingTeam = await prisma.team.findFirst({
        where: { user_id: testUser.id, season_id: season.id },
      })

      if (!existingTeam) {
        const allPlayers = await prisma.player.findMany({ take: 50 })

        // Selecteer 11 spelers: 1 GK, 4 DEF, 4 MID, 2 FWD
        const gks  = allPlayers.filter(p => p.position === 'GK').slice(0, 1)
        const defs = allPlayers.filter(p => p.position === 'DEF').slice(0, 4)
        const mids = allPlayers.filter(p => p.position === 'MID').slice(0, 4)
        const fwds = allPlayers.filter(p => p.position === 'FWD').slice(0, 2)
        const squad = [...gks, ...defs, ...mids, ...fwds]

        const team = await prisma.team.create({
          data: {
            user_id: testUser.id,
            season_id: season.id,
            name: 'Ricardo XI',
            formation: '4-4-2',
            tactic_style: 'BALANCED',
            entry_fee: 10,
            total_points: 847,
          },
        })

        const slots = ['GK', 'DEF1', 'DEF2', 'DEF3', 'DEF4', 'MID1', 'MID2', 'MID3', 'MID4', 'FWD1', 'FWD2']

        for (let i = 0; i < squad.length && i < slots.length; i++) {
          await prisma.teamPlayer.create({
            data: {
              team_id: team.id,
              player_id: squad[i].id,
              slot_position: slots[i],
              is_captain: i === 9,
              is_vice_captain: i === 10,
              purchase_price: Number(squad[i].price),
            },
          })
        }

        // Koppel team aan recente gameweeks met punten
        for (let gwIdx = 0; gwIdx < Math.min(27, gameweeks.length); gwIdx++) {
          await prisma.teamGameweek.create({
            data: {
              team_id: team.id,
              gameweek_id: gameweeks[gwIdx].id,
              points: Math.floor(Math.random() * 50) + 20,
              rank: Math.floor(Math.random() * 100) + 1,
            },
          })
        }

        logger.info('Team aangemaakt voor testuser', { teamId: team.id, players: squad.length })
      }
    }

    // 6. Seed sponsors (idempotent)
    const sponsorCount = await prisma.sponsor.count()
    if (sponsorCount === 0) {
      const sponsorData = [
        { name: 'Nike', logo: '👟', weekly_income: 50, requirement: 'Top 75% in je competitie', tier: 'BRONZE', description: 'De iconische sportgigant. Beschikbaar voor alle managers.' },
        { name: 'Adidas', logo: '⚽', weekly_income: 75, requirement: 'Top 50% in je competitie', tier: 'BRONZE', description: 'Drie strepen, onbeperkt potentieel. Beschikbaar voor actieve managers.' },
        { name: 'Heineken', logo: '🍺', weekly_income: 100, requirement: 'Top 40% in je competitie', tier: 'SILVER', description: 'Officieel bier van de UEFA Champions League. Voor ervaren managers.' },
        { name: 'Jumbo', logo: '🛒', weekly_income: 125, requirement: 'Minimaal 3 goals per ronde in jouw team', tier: 'SILVER', description: 'Vers en betaalbaar. Voor managers met aanvallende instelling.' },
        { name: 'Red Bull', logo: '🐂', weekly_income: 175, requirement: 'Top 25% in je competitie', tier: 'GOLD', description: 'Geeft je vleugels. Alleen voor de beste managers.' },
        { name: 'Emirates', logo: '✈️', weekly_income: 250, requirement: 'Top 10% in je competitie', tier: 'GOLD', description: 'Eerste klas sponsoring voor elite managers.' },
      ]
      for (const s of sponsorData) {
        await prisma.sponsor.create({ data: s })
      }
      logger.info('Sponsors geseed', { count: sponsorData.length })
    }

    logger.info('Demo seed voltooid!')
  } catch (err) {
    logger.warn('Demo seed mislukt (niet kritiek)', { err })
  }
}
