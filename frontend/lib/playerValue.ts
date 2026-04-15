import { Player } from '@/types'

/**
 * Berekent "waarde score" voor een speler: form × punten / prijs
 * Hogere score = betere value-for-money
 */
export function calcValueScore(player: Player): number {
  const price = Math.max(Number(player.price), 1)
  const form  = Math.max(Number(player.form), 0)
  const pts   = Math.max(Number(player.total_points), 0)
  return (form * 0.6 + (pts / price) * 0.4)
}

/**
 * Bepaal of speler "hot" is (stijgende form, bovengemiddeld)
 */
export function isHotPlayer(player: Player): boolean {
  const form = Number(player.form)
  const history = player.form_history ?? []
  if (history.length < 2) return form >= 7
  const lastTwo = history.slice(-2)
  return form >= 6.5 && lastTwo[1] > lastTwo[0]
}

/**
 * Beste waarde-spelers per positie, gesorteerd op value score
 */
export function getBestValueByPosition(
  players: Player[],
  position: string,
  limit = 3
): Player[] {
  return players
    .filter(p => p.position === position && (p.availability === 'available'))
    .sort((a, b) => calcValueScore(b) - calcValueScore(a))
    .slice(0, limit)
}

/**
 * Scout tips: top 5 beste waarde-spelers uit alle posities
 */
export function getScoutTips(players: Player[], limit = 5): Player[] {
  return players
    .filter(p => p.availability === 'available')
    .sort((a, b) => calcValueScore(b) - calcValueScore(a))
    .slice(0, limit)
}
