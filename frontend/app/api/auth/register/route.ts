import { NextRequest } from 'next/server'
import { signToken, ok } from '@/lib/serverAuth'

export async function POST(req: NextRequest) {
  const { email, username } = await req.json()

  // In demo mode, register always succeeds with a new user
  const newUser = {
    id: `user_${Date.now()}`,
    email,
    username,
    balance_credits: 0,
    tier: 'bronze',
    kyc_status: 'pending',
    role: 'user',
    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    is_admin: false,
    is_suspended: false,
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
    seasons_played: 0,
    best_finish: null,
    total_winnings: 0,
    total_invested: 0,
  }

  const access_token = await signToken({ sub: newUser.id, email: newUser.email, role: 'user' })
  const refresh_token = await signToken({ sub: newUser.id, type: 'refresh' })

  return ok({ user: newUser, access_token, refresh_token, expires_in: 86400 }, 201)
}
