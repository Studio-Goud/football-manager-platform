import { Request, Response, NextFunction } from 'express'
import logger from '../config/logger'

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode ?? 500
  const message = err.message ?? 'Interne serverfout'

  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    statusCode,
  })

  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Interne serverfout' : message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route niet gevonden: ${req.method} ${req.url}`,
  })
}
