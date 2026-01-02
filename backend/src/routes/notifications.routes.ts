import { Router } from "express"
import { getAuth } from "../config/clerk"
import { BadRequestError, UnauthorizedError } from "../lib/errors"
import { getUserFromClerk } from "../modules/users/user.service"
import {
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../modules/notifications/notifications.service"

export const notificationsRouter = Router()

// get unreadonly=true|false
// /api/notifications?unreadonly=true|false

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const auth = getAuth(req)
    if (!auth.userId) {
      throw new UnauthorizedError()
    }

    const profile = await getUserFromClerk(auth.userId)

    const isUnreadOnly = req.query.unreadonly === "true"

    const notifications = await listNotifications({
      userId: profile.user.id,
      unreadOnly: isUnreadOnly,
    })

    res.status(200).json({
      data: notifications,
    })
  } catch (error) {
    next(error)
  }
})

// post /api/notifications/:notificationId/read
notificationsRouter.post("/:id/read", async (req, res, next) => {
  try {
    const auth = getAuth(req)
    if (!auth.userId) {
      throw new UnauthorizedError()
    }

    const notificationId = Number(req.params.id)
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      throw new BadRequestError("Invalid notification ID")
    }

    const profile = await getUserFromClerk(auth.userId)

    await markNotificationAsRead({
      userId: profile.user.id,
      notificationId,
    })

    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

// post /api/notifications/read-all
notificationsRouter.post("/read-all", async (req, res, next) => {
  try {
    const auth = getAuth(req)
    if (!auth.userId) {
      throw new UnauthorizedError()
    }

    const profile = await getUserFromClerk(auth.userId)

    await markAllNotificationsAsRead({
      userId: profile.user.id,
    })

    res.status(204).send()
  } catch (error) {
    next(error)
  }
})
