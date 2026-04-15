/**
 * Zorgt dat het test-account altijd bestaat.
 * Wordt aangeroepen bij server-start.
 */
import prisma from './config/database'
import { hashPassword } from './utils/password'
import logger from './config/logger'

export async function ensureTestAccount(): Promise<void> {
  const email    = 'ricardo@test.nl'
  const password = 'ricardo@test.nl'
  const username = 'Ricardo'

  try {
    const existing = await prisma.user.findUnique({ where: { email } })

    if (existing) {
      // Update password en zorg voor genoeg coins om te testen
      const password_hash = await hashPassword(password)
      await prisma.user.update({
        where: { email },
        data: {
          password_hash,
          kyc_status: 'VERIFIED',
          kyc_level: 1,
          is_admin: true,
          balance_credits: existing.balance_credits < 1000 ? 5000 : undefined,
        },
      })
      logger.info('Test account bijgewerkt', { email })
    } else {
      const password_hash = await hashPassword(password)
      await prisma.user.create({
        data: {
          email,
          password_hash,
          username,
          kyc_status: 'VERIFIED',
          kyc_level: 1,
          is_admin: true,
          balance_credits: 5000,
        },
      })
      logger.info('Test account aangemaakt', { email })
    }
  } catch (err) {
    logger.warn('Test account seed mislukt (niet kritiek)', { err })
  }
}
