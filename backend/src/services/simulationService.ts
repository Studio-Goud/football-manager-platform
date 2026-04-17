import prisma from '../config/database'
import { SCORING } from './scoringService'
import { Server } from 'socket.io'
import logger from '../config/logger'

export let nextTickAt: Date = new Date(Date.now() + 2 * 60 * 1000)
let tickCount = 0
const TICKS_PER_GAMEWEEK = 5

type SimEvent = 'goal' | 'assist' | 'yellow_card' | 'clean_sheet'
const EVENT_TYPES: SimEvent[] = ['goal', 'goal', 'assist', 'yellow_card', 'clean_sheet']

export async function runSimulationTick(io: Server): Promise<void> {
  try {
    tickCount++
    nextTickAt = new Date(Date.now() + 2 * 60 * 1000)

    const season = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })
    if (!season) return

    const activeGw = await prisma.gameweek.findFirst({
      where: { season_id: season.id, status: 'ACTIVE' },
      orderBy: { number: 'desc' },
    })
    if (!activeGw) return

    const allPlayers = await prisma.player.findMany({ take: 100 })
    if (allPlayers.length === 0) return

    const shuffled = [...allPlayers].sort(() => Math.random() - 0.5).slice(0, 4)

    const events: Array<{ player: typeof allPlayers[0]; event_type: SimEvent; minute: number }> = []
    for (const player of shuffled) {
      const event_type = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)]
      const minute = Math.floor(Math.random() * 90) + 1
      events.push({ player, event_type, minute })

      io.emit('match:event', {
        match_id: activeGw.id,
        player_id: player.id,
        player_name: player.display_name,
        event_type,
        minute,
        club: player.club,
        position: player.position,
      })
    }

    const affectedPlayerIds = events.map(e => e.player.id)
    const teamPlayers = await prisma.teamPlayer.findMany({
      where: {
        player_id: { in: affectedPlayerIds },
        slot_position: { not: { startsWith: 'BENCH' } },
      },
      include: {
        team: { select: { id: true, user_id: true, captain_player_id: true } },
        player: { select: { position: true, photo_url: true } },
      },
    })

    const teamDeltas: Record<string, { delta: number; userId: string | null }> = {}

    for (const tp of teamPlayers) {
      const event = events.find(e => e.player.id === tp.player_id)
      if (!event) continue

      const pos = tp.player.position as 'GK' | 'DEF' | 'MID' | 'FWD'
      let delta = 0
      if (event.event_type === 'goal') delta = SCORING.goal[pos] ?? SCORING.goal.MID
      else if (event.event_type === 'assist') delta = SCORING.assist
      else if (event.event_type === 'yellow_card') delta = SCORING.yellow_card
      else if (event.event_type === 'clean_sheet') delta = (SCORING.clean_sheet as Record<string, number>)[pos] ?? 1

      if (tp.is_captain) delta *= SCORING.captain_multiplier

      if (!teamDeltas[tp.team.id]) {
        teamDeltas[tp.team.id] = { delta: 0, userId: tp.team.user_id }
      }
      teamDeltas[tp.team.id].delta += delta
    }

    for (const [teamId, { delta, userId }] of Object.entries(teamDeltas)) {
      if (delta === 0) continue

      const tgw = await prisma.teamGameweek.upsert({
        where: { team_id_gameweek_id: { team_id: teamId, gameweek_id: activeGw.id } },
        create: { team_id: teamId, gameweek_id: activeGw.id, points: delta },
        update: { points: { increment: delta } },
      })

      await prisma.team.update({
        where: { id: teamId },
        data: { total_points: { increment: delta } },
      })

      if (userId) {
        const firstEvent = events.find(e => teamPlayers.some(tp => tp.player_id === e.player.id && tp.team.user_id === userId))
          ?? events[0]
        const playerRecord = teamPlayers.find(tp => tp.player_id === firstEvent.player.id)
        io.to(`user:${userId}`).emit('user:points', {
          total_points: Number(tgw.points),
          delta,
          event: {
            event_type: firstEvent.event_type,
            player_name: firstEvent.player.display_name,
            minute: firstEvent.minute,
            photo_url: playerRecord?.player.photo_url ?? firstEvent.player.photo_url ?? null,
          },
        })
      }
    }

    io.emit('gameweek:tick', {
      gameweek_number: activeGw.number,
      tick: tickCount,
      ticks_remaining: TICKS_PER_GAMEWEEK - (tickCount % TICKS_PER_GAMEWEEK),
      events: events.map(e => ({
        player_name: e.player.display_name,
        club: e.player.club,
        event_type: e.event_type,
        minute: e.minute,
      })),
      next_tick_at: nextTickAt.toISOString(),
    })

    logger.info(`Simulatie tick ${tickCount}: ${events.length} events`)

    if (tickCount % TICKS_PER_GAMEWEEK === 0) {
      await advanceGameweek(season.id, activeGw, io)
    }
  } catch (err) {
    logger.error('Simulatie tick mislukt', { err })
  }
}

async function advanceGameweek(seasonId: number, currentGw: { id: number; number: number }, io: Server) {
  try {
    await prisma.gameweek.update({ where: { id: currentGw.id }, data: { status: 'FINISHED' } })

    const nextGw = await prisma.gameweek.findFirst({
      where: { season_id: seasonId, status: 'UPCOMING', number: { gt: currentGw.number } },
      orderBy: { number: 'asc' },
    })

    let newGw
    if (nextGw) {
      newGw = await prisma.gameweek.update({ where: { id: nextGw.id }, data: { status: 'ACTIVE' } })
    } else {
      const now = new Date()
      newGw = await prisma.gameweek.create({
        data: {
          season_id: seasonId,
          number: currentGw.number + 1,
          deadline: now,
          start_date: now,
          end_date: new Date(now.getTime() + 10 * 60 * 1000),
          status: 'ACTIVE',
        },
      })
    }

    io.emit('gameweek:new', {
      gameweek_number: newGw.number,
      started_at: new Date().toISOString(),
      next_tick_at: nextTickAt.toISOString(),
    })

    logger.info(`Nieuwe gameweek gestart: GW${newGw.number}`)
  } catch (err) {
    logger.error('Advance gameweek mislukt', { err })
  }
}

export async function fixTeamForUser(userId: string): Promise<string> {
  const season = await prisma.season.findFirst({ where: { status: 'ACTIVE' } })
  if (!season) throw new Error('Geen actief seizoen')

  const oldTeam = await prisma.team.findFirst({ where: { user_id: userId } })
  if (oldTeam) {
    await prisma.teamPlayer.deleteMany({ where: { team_id: oldTeam.id } })
    await prisma.teamGameweek.deleteMany({ where: { team_id: oldTeam.id } })
    await prisma.team.delete({ where: { id: oldTeam.id } })
  }

  const allPlayers = await prisma.player.findMany({ take: 100 })
  const gks  = allPlayers.filter(p => p.position === 'GK').slice(0, 2)
  const defs = allPlayers.filter(p => p.position === 'DEF').slice(0, 5)
  const mids = allPlayers.filter(p => p.position === 'MID').slice(0, 5)
  const fwds = allPlayers.filter(p => p.position === 'FWD').slice(0, 3)
  const squad = [...gks, ...defs, ...mids, ...fwds]

  const team = await prisma.team.create({
    data: {
      user_id: userId,
      season_id: season.id,
      name: 'Ricardo XI',
      formation: '4-3-3',
      tactic_style: 'BALANCED',
      entry_fee: 0,
      total_points: 847,
    },
  })

  const slots = ['GK', 'BENCH_GK', 'DEF1', 'DEF2', 'DEF3', 'DEF4', 'BENCH_DEF', 'MID1', 'MID2', 'MID3', 'BENCH_MID', 'FWD1', 'FWD2', 'FWD3', 'BENCH_FWD']
  for (let i = 0; i < squad.length && i < slots.length; i++) {
    await prisma.teamPlayer.create({
      data: {
        team_id: team.id,
        player_id: squad[i].id,
        slot_position: slots[i],
        is_captain: slots[i] === 'FWD1',
        is_vice_captain: slots[i] === 'MID1',
        purchase_price: Number(squad[i].price),
      },
    })
  }

  const gameweeks = await prisma.gameweek.findMany({
    where: { season_id: season.id },
    orderBy: { number: 'asc' },
  })
  for (const gw of gameweeks) {
    if (gw.status === 'FINISHED' || gw.status === 'ACTIVE') {
      await prisma.teamGameweek.upsert({
        where: { team_id_gameweek_id: { team_id: team.id, gameweek_id: gw.id } },
        create: { team_id: team.id, gameweek_id: gw.id, points: Math.floor(Math.random() * 60) + 20, rank: Math.floor(Math.random() * 50) + 1 },
        update: {},
      })
    }
  }

  return team.id
}
