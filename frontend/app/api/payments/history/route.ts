import { NextRequest } from 'next/server'
import { getAuthUser, ok, err } from '@/lib/serverAuth'
import { mockTransactions } from '@/lib/mockData'

export async function GET(req: NextRequest) {
  const payload = await getAuthUser(req)
  if (!payload) return err('Niet geautoriseerd', 401)
  return ok({ transactions: mockTransactions, total: mockTransactions.length })
}
