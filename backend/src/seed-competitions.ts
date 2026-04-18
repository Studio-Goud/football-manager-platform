/**
 * Seed 4 privé testcompetities met nep-gebruikers en teams.
 * Elk team heeft 15 spelers (11 start + 4 bank) binnen budget 100cr.
 * Elke competitie krijgt historische GW-punten zodat de ranglijst gevuld is.
 */
import prisma from './config/database'
import bcrypt from 'bcryptjs'
import logger from './config/logger'

const COMPETITIES = [
  { naam: 'Vrienden van Ricardo', emoji: '👥', maxLeden: 11 },
  { naam: 'Eredivisie Experts',   emoji: '🏆', maxLeden: 12 },
  { naam: 'Kroeg Competitie',     emoji: '🍺', maxLeden:  8 },
  { naam: 'Studio Goud FC',       emoji: '⚽', maxLeden: 10 },
]

// 41 unieke Dutch-flavored nepgebruikers verdeeld over de 4 competities
const NEP_USERS = [
  // Vrienden van Ricardo (11)
  { email: 'sander.dejong@test.nl',    username: 'SanderDJ',      team: 'De Oranjes',          comp: 0 },
  { email: 'mike.vanderberg@test.nl',  username: 'MikeVDB',       team: 'Aanval FC',           comp: 0 },
  { email: 'thomas.bakker@test.nl',    username: 'ThomasBakker',  team: 'Bakker United',       comp: 0 },
  { email: 'kevin.smit@test.nl',       username: 'KevinSmit10',   team: 'Smit City',           comp: 0 },
  { email: 'david.meijer@test.nl',     username: 'DavidMeijer',   team: 'Ajax Lovers',         comp: 0 },
  { email: 'jeroen.arts@test.nl',      username: 'JeroenArts',    team: 'Arts Athletic',       comp: 0 },
  { email: 'robin.boer@test.nl',       username: 'RobinBoer',     team: 'De Boerderij',        comp: 0 },
  { email: 'frank.wolff@test.nl',      username: 'FrankWolff',    team: 'Wolf Pack FC',        comp: 0 },
  { email: 'niels.kuiper@test.nl',     username: 'NielsKuiper',   team: 'Kuiper Kickers',      comp: 0 },
  { email: 'bram.visser@test.nl',      username: 'BramVisser',    team: 'Visser Voetbal',      comp: 0 },
  { email: 'stefan.kok@test.nl',       username: 'StefanKok',     team: 'Kok FC',              comp: 0 },

  // Eredivisie Experts (12)
  { email: 'lars.van.dijk@test.nl',    username: 'LarsVanDijk',   team: 'PSV Fanatics',        comp: 1 },
  { email: 'bas.molenaar@test.nl',     username: 'BasMolenaar',   team: 'Feyenoord Army',      comp: 1 },
  { email: 'tim.hoekstra@test.nl',     username: 'TimHoekstra',   team: 'Hoekstra XI',         comp: 1 },
  { email: 'mark.hendrix@test.nl',     username: 'MarkHendrix',   team: 'Eredivisie Kings',    comp: 1 },
  { email: 'joey.brand@test.nl',       username: 'JoeyBrand',     team: 'Brand New FC',        comp: 1 },
  { email: 'alex.mulder@test.nl',      username: 'AlexMulder',    team: 'Mulder Mania',        comp: 1 },
  { email: 'daan.pietersen@test.nl',   username: 'DaanPieter',    team: 'De Experts',          comp: 1 },
  { email: 'rick.verboom@test.nl',     username: 'RickVerboom',   team: 'Verboom Ventures',    comp: 1 },
  { email: 'jasper.linden@test.nl',    username: 'JasperLinden',  team: 'Lindenpark FC',       comp: 1 },
  { email: 'koen.postma@test.nl',      username: 'KoenPostma',    team: 'Postma Power',        comp: 1 },
  { email: 'ruben.storm@test.nl',      username: 'RubenStorm',    team: 'Stormfront XI',       comp: 1 },
  { email: 'arjan.bruin@test.nl',      username: 'ArjanBruin',    team: 'Bruine Brigade',      comp: 1 },

  // Kroeg Competitie (8)
  { email: 'piet.hein@test.nl',        username: 'PietHein',      team: 'Cafetaria FC',        comp: 2 },
  { email: 'henk.jan@test.nl',         username: 'HenkJan99',     team: 'Heineken Heroes',     comp: 2 },
  { email: 'wim.jacobs@test.nl',       username: 'WimJacobs',     team: 'De Stamgasten',       comp: 2 },
  { email: 'cor.timmermans@test.nl',   username: 'CorTimmermans', team: 'Vrijdagavond FC',     comp: 2 },
  { email: 'leo.brands@test.nl',       username: 'LeoBrands',     team: 'Brands Bier XI',      comp: 2 },
  { email: 'gerard.vos@test.nl',       username: 'GerardVos',     team: 'Vos Voetbal',         comp: 2 },
  { email: 'simon.dekker@test.nl',     username: 'SimonDekker',   team: 'Dekker Dreams',       comp: 2 },
  { email: 'jan.willems@test.nl',      username: 'JanWillems',    team: 'Willems Winners',     comp: 2 },

  // Studio Goud FC (10)
  { email: 'matthieu.studio@test.nl',  username: 'MatthieuSG',    team: 'Studio Gold XI',      comp: 3 },
  { email: 'lisa.vandermeer@test.nl',  username: 'LisaVDM',       team: 'Lisa\'s Legends',     comp: 3 },
  { email: 'emma.konings@test.nl',     username: 'EmmaKonings',   team: 'Konings Kracht',      comp: 3 },
  { email: 'noah.stuiver@test.nl',     username: 'NoahStuiver',   team: 'Stuiver Stars',       comp: 3 },
  { email: 'julia.groen@test.nl',      username: 'JuliaGroen',    team: 'Groene Machine',      comp: 3 },
  { email: 'finn.bosman@test.nl',      username: 'FinnBosman',    team: 'Bosman FC',           comp: 3 },
  { email: 'noor.adriaans@test.nl',    username: 'NoorAdriaans',  team: 'Adriaans Army',       comp: 3 },
  { email: 'luca.schippers@test.nl',   username: 'LucaSchippers', team: 'Schippers Select',    comp: 3 },
  { email: 'max.bijlsma@test.nl',      username: 'MaxBijlsma',    team: 'Bijlsma Boys',        comp: 3 },
  { email: 'anna.fontein@test.nl',     username: 'AnnaFontein',   team: 'Fontein FC',          comp: 3 },
]

// Selecteer 15 spelers voor een team binnen budget 100cr (11 start + 4 bank)
function selecteerSpelers(
  gks: { id: number; price: number }[],
  defs: { id: number; price: number }[],
  mids: { id: number; price: number }[],
  fwds: { id: number; price: number }[],
  seed: number,
): { playerId: number; slot: string; bench: boolean; captain: boolean; viceCaptain: boolean; price: number }[] {
  const shuffle = <T>(arr: T[], offset: number): T[] => {
    const copy = [...arr]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = (i * 1103515245 + offset + seed * 12345) % (i + 1)
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }

  const gkShuffle  = shuffle(gks,  0)
  const defShuffle = shuffle(defs, 1)
  const midShuffle = shuffle(mids, 2)
  const fwdShuffle = shuffle(fwds, 3)

  // Kies startopstelling: 1 GK, 4 DEF, 4 MID, 2 FWD
  const startGk   = gkShuffle.slice(0, 1)
  const startDef  = defShuffle.slice(0, 4)
  const startMid  = midShuffle.slice(0, 4)
  const startFwd  = fwdShuffle.slice(0, 2)

  // Bank: 1 GK, 1 DEF, 1 MID, 1 FWD
  const bankGk  = gkShuffle.slice(1, 2)
  const bankDef = defShuffle.slice(4, 5)
  const bankMid = midShuffle.slice(4, 5)
  const bankFwd = fwdShuffle.slice(2, 3)

  const result: { playerId: number; slot: string; bench: boolean; captain: boolean; viceCaptain: boolean; price: number }[] = []

  startGk.forEach(p  => result.push({ playerId: p.id, slot: 'GK',   bench: false, captain: false, viceCaptain: false, price: p.price }))
  startDef.forEach((p, i) => result.push({ playerId: p.id, slot: `DEF${i+1}`, bench: false, captain: false, viceCaptain: false, price: p.price }))
  startMid.forEach((p, i) => result.push({ playerId: p.id, slot: `MID${i+1}`, bench: false, captain: false, viceCaptain: i === 1, price: p.price }))
  startFwd.forEach((p, i) => result.push({ playerId: p.id, slot: `FWD${i+1}`, bench: false, captain: i === 0, viceCaptain: false, price: p.price }))
  bankGk.forEach(p  => result.push({ playerId: p.id, slot: 'BENCH_GK',  bench: true, captain: false, viceCaptain: false, price: p.price }))
  bankDef.forEach(p => result.push({ playerId: p.id, slot: 'BENCH_DEF', bench: true, captain: false, viceCaptain: false, price: p.price }))
  bankMid.forEach(p => result.push({ playerId: p.id, slot: 'BENCH_MID', bench: true, captain: false, viceCaptain: false, price: p.price }))
  bankFwd.forEach(p => result.push({ playerId: p.id, slot: 'BENCH_FWD', bench: true, captain: false, viceCaptain: false, price: p.price }))

  return result
}

// Pseudo-random punten per GW (deterministisch op basis van seed)
function gwPunten(seed: number, gwNr: number): number {
  const base = 30 + ((seed * 7 + gwNr * 13) % 45)
  return base
}

export async function seedCompetities(): Promise<{ leagues: number; users: number; teams: number }> {
  const passwordHash = await bcrypt.hash('Welkom123!', 10)

  // Haal actief seizoen op
  const seizoen = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })
  if (!seizoen) throw new Error('Geen actief seizoen gevonden — run eerst seed-demo')

  // Haal alle gameweeks op (FINISHED voor historische punten)
  const gameweeks = await prisma.gameweek.findMany({
    where: { season_id: seizoen.id },
    orderBy: { number: 'asc' },
  })
  const finishedGws = gameweeks.filter(gw => gw.status === 'FINISHED')

  // Haal spelers op per positie
  const allPlayers = await prisma.player.findMany({ where: { availability: 'AVAILABLE' } })
  const gks  = allPlayers.filter(p => p.position === 'GK').map(p => ({ id: p.id, price: Number(p.price) }))
  const defs = allPlayers.filter(p => p.position === 'DEF').map(p => ({ id: p.id, price: Number(p.price) }))
  const mids = allPlayers.filter(p => p.position === 'MID').map(p => ({ id: p.id, price: Number(p.price) }))
  const fwds = allPlayers.filter(p => p.position === 'FWD').map(p => ({ id: p.id, price: Number(p.price) }))

  if (gks.length < 2 || defs.length < 5 || mids.length < 5 || fwds.length < 3) {
    throw new Error('Niet genoeg spelers in de database — run eerst seed-demo')
  }

  let totalUsers = 0
  let totalTeams = 0

  // Maak leagues en bijhorende users aan
  const leagueIds: string[] = []

  for (let ci = 0; ci < COMPETITIES.length; ci++) {
    const comp = COMPETITIES[ci]

    // Maak privé competitie aan (of gebruik bestaande)
    const codeBase = `TST${ci}${ci}${ci}`
    const existing = await prisma.privateLeague.findFirst({ where: { name: comp.naam } })
    let league = existing

    if (!league) {
      league = await prisma.privateLeague.create({
        data: {
          name: comp.naam,
          code: codeBase,
          owner_id: (await prisma.user.findFirst({ where: { email: 'ricardo@test.nl' } }))?.id
            ?? (await prisma.user.findFirst())!.id,
          max_members: comp.maxLeden + 2,
          season_id: seizoen.id,
        },
      })
    }
    leagueIds.push(league.id)
  }

  // Maak nep-users, teams en lid-koppeling aan
  for (let ui = 0; ui < NEP_USERS.length; ui++) {
    const u = NEP_USERS[ui]

    // Upsert user
    let user = await prisma.user.findUnique({ where: { email: u.email } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: u.email,
          username: u.username,
          password_hash: passwordHash,
          balance_credits: 500,
          tier: 'BRONZE',
        },
      })
      totalUsers++
    }

    // Maak team aan (als nog niet bestaat voor dit seizoen)
    let team = await prisma.team.findFirst({
      where: { user_id: user.id, season_id: seizoen.id },
    })

    if (!team) {
      const spelers = selecteerSpelers(gks, defs, mids, fwds, ui)
      const captain = spelers.find(s => s.captain)
      const vice    = spelers.find(s => s.viceCaptain)

      // Bereken totale punten op basis van GW-scores
      const totalPts = finishedGws.reduce((sum, gw) => sum + gwPunten(ui, gw.number), 0)

      team = await prisma.team.create({
        data: {
          user_id: user.id,
          season_id: seizoen.id,
          name: u.team,
          formation: ['4-4-2', '4-3-3', '3-5-2', '4-5-1'][ui % 4],
          tactic_style: ['BALANCED', 'HIGH_PRESS', 'LOW_BLOCK', 'TIKI_TAKA', 'COUNTER_ATTACK'][ui % 5],
          captain_player_id: captain?.playerId ?? null,
          vice_captain_player_id: vice?.playerId ?? null,
          total_points: totalPts,
          entry_fee: 10,
        },
      })

      // Voeg spelers toe aan team
      for (const s of spelers) {
        await prisma.teamPlayer.create({
          data: {
            team_id: team.id,
            player_id: s.playerId,
            slot_position: s.slot,
            is_captain: s.captain,
            is_vice_captain: s.viceCaptain,
            purchase_price: s.price,
          },
        })
      }

      // Historische GW-scores
      for (const gw of finishedGws) {
        const pts = gwPunten(ui, gw.number)
        await prisma.teamGameweek.upsert({
          where: { team_id_gameweek_id: { team_id: team.id, gameweek_id: gw.id } },
          create: { team_id: team.id, gameweek_id: gw.id, points: pts },
          update: {},
        })
      }

      totalTeams++
    }

    // Voeg user toe aan de competitie als die er nog niet in zit
    const leagueId = leagueIds[u.comp]
    const lidBestaat = await prisma.privateLeagueMember.findFirst({
      where: { private_league_id: leagueId, user_id: user.id },
    })
    if (!lidBestaat) {
      await prisma.privateLeagueMember.create({
        data: {
          private_league_id: leagueId,
          user_id: user.id,
          team_id: team.id,
        },
      })
    }
  }

  // Voeg ook het testaccount toe aan elke competitie
  const testUser = await prisma.user.findUnique({ where: { email: 'ricardo@test.nl' } })
  if (testUser) {
    const testTeam = await prisma.team.findFirst({ where: { user_id: testUser.id, season_id: seizoen.id } })
    for (const lid of leagueIds) {
      const al = await prisma.privateLeagueMember.findFirst({
        where: { private_league_id: lid, user_id: testUser.id },
      })
      if (!al && testTeam) {
        await prisma.privateLeagueMember.create({
          data: { private_league_id: lid, user_id: testUser.id, team_id: testTeam.id },
        })
      }
    }
  }

  logger.info('Competitie-seed voltooid', { leagues: leagueIds.length, totalUsers, totalTeams })
  return { leagues: leagueIds.length, users: totalUsers, teams: totalTeams }
}
