import webpush from 'web-push'
import prisma from '../config/database'
import logger from '../config/logger'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export { VAPID_PUBLIC_KEY }

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  url = '/dashboard'
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { user_id: userId },
  })

  const payload = JSON.stringify({ title, body, url, icon: '/icons/icon-192.png' })

  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  )

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'rejected') {
      const err = result.reason as { statusCode?: number }
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        // Subscription expired — remove it
        await prisma.pushSubscription.delete({ where: { id: subscriptions[i].id } }).catch(() => {})
      }
    }
  }

  logger.debug('Push sent', { userId, title, sent: results.filter(r => r.status === 'fulfilled').length })
}
