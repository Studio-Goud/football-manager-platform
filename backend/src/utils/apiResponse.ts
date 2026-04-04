import { Response } from 'express'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
  pagination?: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

export const sendSuccess = <T>(res: Response, data: T, message?: string, statusCode = 200): void => {
  res.status(statusCode).json({
    success: true,
    data,
    message,
  } as ApiResponse<T>)
}

export const sendPaginated = <T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  perPage: number
): void => {
  res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
    },
  })
}

export const sendError = (res: Response, message: string, statusCode = 400, error?: string): void => {
  res.status(statusCode).json({
    success: false,
    message,
    error,
  } as ApiResponse)
}
