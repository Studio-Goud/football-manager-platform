import { Request, Response, NextFunction } from 'express'
import { verifyToken, JwtPayload } from '../utils/jwt'
import { sendError } from '../utils/apiResponse'
import prisma from '../config/database'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
    username: string
  }
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    sendError(res, 'Authenticatie vereist', 401)
    return
  }

  const token = authHeader.substring(7)

  try {
    const payload = verifyToken(token) as JwtPayload

    // Check if user exists and isn't suspended
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, username: true, is_admin: true, is_suspended: true },
    } as Parameters<typeof prisma.user.findUnique>[0])

    if (!user) {
      sendError(res, 'Gebruiker niet gevonden', 401)
      return
    }

    if ((user as unknown as { is_suspended: boolean }).is_suspended) {
      sendError(res, 'Account gesuspendeerd', 403)
      return
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: (user as unknown as { is_admin: boolean }).is_admin ? 'admin' : 'user',
      username: user.username,
    }

    next()
  } catch {
    sendError(res, 'Ongeldig token', 401)
  }
}

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'admin') {
    sendError(res, 'Admin toegang vereist', 403)
    return
  }
  next()
}
