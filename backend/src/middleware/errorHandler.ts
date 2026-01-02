import type { ErrorRequestHandler } from "express"
import { ZodError } from "zod"
import { HttpError } from "../lib/errors"
import { logger } from "../lib/logger"

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  logger.error("Error handler invoked:", err)

  let status = 500
  let message = "Internal Server Error"
  let details: unknown = undefined

  if (err instanceof HttpError) {
    status = err.status
    message = err.message
    details = err.details
  } else if (err instanceof ZodError) {
    status = 400
    message = "Validation Error"
    details = err.issues.map((issue) => ({
      path: issue.path,
      message: issue.message,
    }))
  }

  logger.error(`${req.method} ${req.originalUrl} ---> ${status}-${message}`)

  res.status(status).json({
    error: {
      message,
      status,
      details,
    },
  })
}
