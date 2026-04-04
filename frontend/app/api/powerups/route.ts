import { mockPowerups } from '@/lib/mockData'
import { ok } from '@/lib/serverAuth'

export async function GET() {
  return ok(mockPowerups)
}
