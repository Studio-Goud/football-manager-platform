import { NextRequest } from 'next/server'
import { getAuthUser, DEMO_USERS, ok, err } from '@/lib/serverAuth'

export async function GET(req: NextRequest) {
  const payload = await getAuthUser(req)
  if (!payload) return err('Niet geautoriseerd', 401)

  const user = DEMO_USERS.find((u) => u.id === payload.sub)
  if (!user) return err('Gebruiker niet gevonden', 404)

  const { password: _, ...safeUser } = user
  return ok(safeUser)
}
