import { mockMatches } from '@/lib/mockData'
import { ok } from '@/lib/serverAuth'

export async function GET() {
  const upcoming = mockMatches.filter((m) => m.status === 'scheduled')
  return ok(upcoming)
}
