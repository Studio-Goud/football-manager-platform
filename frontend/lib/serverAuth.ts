import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fm-demo-secret-netlify-2024-change-in-production'
)

export async function signToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, JWT_SECRET)
  return payload
}

export async function getAuthUser(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    return await verifyToken(auth.slice(7))
  } catch {
    return null
  }
}

// ─── Demo users ───────────────────────────────────────────────────────────────

export const DEMO_USERS = [
  {
    id: 'user_demo',
    email: 'demo@footballmanager.pro',
    password: 'User1234!',
    username: 'DemoSpeler',
    balance_credits: 47.50,
    tier: 'gold',
    kyc_status: 'verified',
    role: 'user',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Demo',
    is_admin: false,
    is_suspended: false,
    created_at: '2024-01-15T10:00:00Z',
    last_login: new Date().toISOString(),
    seasons_played: 4,
    best_finish: 12,
    total_winnings: 234.50,
    total_invested: 680.00,
  },
  {
    id: 'user_admin',
    email: 'admin@footballmanager.pro',
    password: 'Admin1234!',
    username: 'AdminUser',
    balance_credits: 999.00,
    tier: 'rare',
    kyc_status: 'verified',
    role: 'admin',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
    is_admin: true,
    is_suspended: false,
    created_at: '2024-01-01T00:00:00Z',
    last_login: new Date().toISOString(),
    seasons_played: 10,
    best_finish: 1,
    total_winnings: 5000,
    total_invested: 2000,
  },
]

export function ok(data: unknown, status = 200) {
  return Response.json({ success: true, data }, { status })
}

export function err(message: string, status = 400) {
  return Response.json({ success: false, message }, { status })
}
