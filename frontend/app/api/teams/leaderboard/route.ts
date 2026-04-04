import { mockLeaderboard } from '@/lib/mockData'
import { ok } from '@/lib/serverAuth'

export async function GET() {
  return ok({ leaderboard: mockLeaderboard, total: mockLeaderboard.length })
}
