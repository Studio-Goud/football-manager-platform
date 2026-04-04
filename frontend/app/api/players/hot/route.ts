import { mockPlayers } from '@/lib/mockData'
import { ok } from '@/lib/serverAuth'

export async function GET() {
  const hot = [...mockPlayers]
    .sort((a, b) => (b.form ?? 0) - (a.form ?? 0))
    .slice(0, 5)
  return ok(hot)
}
