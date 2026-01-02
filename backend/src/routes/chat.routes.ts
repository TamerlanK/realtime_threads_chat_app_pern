import { getAuth } from "@clerk/express"
import { Router } from "express"
import { UnauthorizedError } from "../lib/errors"
import { getUserFromClerk } from "../modules/users/user.service"
import { findChatUsers, findDirectMessages } from "../modules/chat/chat.service"

export const chatRouter = Router()

chatRouter.get("/users", async (req, res, next) => {
  try {
    const auth = getAuth(req)
    if (!auth.userId) {
      throw new UnauthorizedError()
    }

    const profile = await getUserFromClerk(auth.userId)

    const currentUserId = profile.user.id

    const users = await findChatUsers(currentUserId)

    res.json({ data: users })
  } catch (error) {
    next(error)
  }
})

chatRouter.get("/:otherUserId/messages", async (req, res, next) => {
  try {
    const auth = getAuth(req)
    if (!auth.userId) {
      throw new UnauthorizedError()
    }

    const profile = await getUserFromClerk(auth.userId)

    const currentUserId = profile.user.id
    const otherUserId = Number(req.params.otherUserId)

    const limitParam = req.query.limit
    const limit = typeof limitParam === "string" ? Number(limitParam) : 50

    const messages = await findDirectMessages({
      userId: currentUserId,
      otherUserId,
      limit,
    })

    res.json({ data: messages })
  } catch (error) {
    next(error)
  }
})
