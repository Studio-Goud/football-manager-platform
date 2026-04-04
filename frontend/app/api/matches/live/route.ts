import { mockMatches } from '@/lib/mockData'
import { ok } from '@/lib/serverAuth'

export async function GET() {
  const live = mockMatches.filter((m) => m.status === 'live')
  return ok(live)
}
