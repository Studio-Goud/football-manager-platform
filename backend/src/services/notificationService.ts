import prisma from '../config/database'

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
): Promise<void> {
  try {
    await prisma.notification.create({ data: { user_id: userId, type, title, body } })
  } catch {
    // Non-critical — don't throw
  }
}

export async function notifyDeadlineReminder(userId: string, roundName: string, hoursLeft: number): Promise<void> {
  await createNotification(userId, 'DEADLINE', `Deadline over ${hoursLeft} uur`, `Speelronde ${roundName} sluit over ${hoursLeft} uur. Pas je opstelling nog aan!`)
}

export async function notifyInjuryAlert(userId: string, playerName: string): Promise<void> {
  await createNotification(userId, 'INJURY', 'Speler geblesseerd', `${playerName} is geblesseerd geraakt. Overweeg een vervanging.`)
}

export async function notifyValueAlert(userId: string, playerName: string, changePercent: number): Promise<void> {
  const dir = changePercent > 0 ? 'gestegen' : 'gedaald'
  await createNotification(userId, 'VALUE_CHANGE', `Spelerswaarde ${dir}`, `De waarde van ${playerName} is ${Math.abs(changePercent)}% ${dir}.`)
}

export async function notifyDuelChallenge(userId: string, challengerName: string, stake: number): Promise<void> {
  await createNotification(userId, 'DUEL', 'Nieuw duel uitdaging!', `${challengerName} daagt je uit voor een duel met ${stake} coins inzet.`)
}

export async function notifyRoundResult(userId: string, score: number, rank: number): Promise<void> {
  await createNotification(userId, 'ROUND_RESULT', 'Speelronde afgelopen', `Je scoorde ${score} punten en eindigde op positie #${rank}.`)
}

export async function notifySponsorIncome(userId: string, sponsorName: string, amount: number): Promise<void> {
  await createNotification(userId, 'SPONSOR', 'Sponsor inkomen ontvangen', `Je hebt ${amount} coins ontvangen van sponsor ${sponsorName}.`)
}
