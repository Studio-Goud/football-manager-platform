import { NextRequest } from 'next/server'
import { DEMO_USERS, signToken, ok, err } from '@/lib/serverAuth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const user = DEMO_USERS.find(
    (u) => u.email === email && u.password === password
  )

  if (!user) {
    return err('Onjuist e-mailadres of wachtwoord.', 401)
  }

  const { password: _, ...safeUser } = user
  const access_token = await signToken({ sub: user.id, email: user.email, role: user.role })
  const refresh_token = await signToken({ sub: user.id, type: 'refresh' })

  return ok({ user: safeUser, access_token, refresh_token, expires_in: 86400 })
}
