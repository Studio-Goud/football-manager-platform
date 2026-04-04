import { NextRequest } from 'next/server'
import { mockPlayers } from '@/lib/mockData'
import { ok } from '@/lib/serverAuth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const position = searchParams.get('position')
  const search = searchParams.get('search')?.toLowerCase()
  const maxPrice = searchParams.get('max_price')

  let players = [...mockPlayers]

  if (position && position !== 'ALL') {
    players = players.filter((p) => p.position === position)
  }
  if (search) {
    players = players.filter(
      (p) => p.name.toLowerCase().includes(search) || p.club.toLowerCase().includes(search)
    )
  }
  if (maxPrice) {
    players = players.filter((p) => p.price <= parseFloat(maxPrice))
  }

  return ok({ players, total: players.length, page: 1, per_page: players.length })
}
