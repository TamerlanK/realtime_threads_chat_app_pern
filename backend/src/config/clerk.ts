import type { Response, Request, NextFunction } from "express"
import { clerkMiddleware, getAuth, clerkClient } from "@clerk/express"
import { UnauthorizedError } from "../lib/errors"

export { clerkMiddleware, clerkClient, getAuth }

export function requireAuthApi(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const auth = getAuth(req)

  if (!auth.userId) {
    return next(new UnauthorizedError())
  }

  return next()
}
