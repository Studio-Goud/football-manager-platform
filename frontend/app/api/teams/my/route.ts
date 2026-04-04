import { NextRequest } from 'next/server'
import { getAuthUser, ok, err } from '@/lib/serverAuth'
import { mockTeam } from '@/lib/mockData'

export async function GET(req: NextRequest) {
  const payload = await getAuthUser(req)
  if (!payload) return err('Niet geautoriseerd', 401)
  return ok(mockTeam)
}

export async function POST(req: NextRequest) {
  const payload = await getAuthUser(req)
  if (!payload) return err('Niet geautoriseerd', 401)
  const body = await req.json()
  return ok({ ...mockTeam, ...body, id: `team_${Date.now()}` }, 201)
}
