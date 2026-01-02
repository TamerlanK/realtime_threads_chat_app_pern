import { Router } from "express"
import { z } from "zod"
import { getAuth } from "../config/clerk"
import {
  BadRequestError,
  ForbiddenError,
  UnauthorizedError,
} from "../lib/errors"
import {
  createLikeNotification,
  createReplyNotification,
} from "../modules/notifications/notifications.service"
import {
  deleteReplyById,
  findRepliesByThreadId,
  getAuthorIdByReplyId,
  getThreadStatsById,
  insertReply,
  likeThread,
  unlikeThread,
} from "../modules/threads/replies.repository"
import {
  findAllCategories,
  findAllThreads,
  insertThread,
  parseThreadsFilter,
} from "../modules/threads/threads.repository"
import { getUserFromClerk } from "../modules/users/user.service"

export const threadsRouter = Router()

const CreateThreadSchema = z.object({
  title: z.string().trim().min(5).max(200),
  body: z.string().trim().min(10).max(5000),
  categorySlug: z.string().trim().min(1),
})

threadsRouter.get("/categories", async (_req, res, next) => {
  try {
    const categories = await findAllCategories()

    res.status(200).json({ data: categories })
  } catch (error) {
    next(error)
  }
})

threadsRouter.post("/", async (req, res, next) => {
  try {
    const auth = getAuth(req)

    if (!auth.userId) {
      throw new UnauthorizedError()
    }

    const parsedBody = CreateThreadSchema.safeParse(req.body)

    if (!parsedBody.success) {
      throw parsedBody.error
    }

    const profile = await getUserFromClerk(auth.userId)

    const { categorySlug, title, body } = parsedBody.data

    const thread = await insertThread({
      categorySlug,
      authorUserId: profile.user.id,
      title,
      body,
    })

    res.status(201).json({ data: thread })
  } catch (error) {
    next(error)
  }
})

threadsRouter.get("/:threadId", async (req, res, next) => {
  try {
    const threadId = Number(req.params.threadId)

    if (isNaN(threadId) || threadId <= 0) {
      throw new BadRequestError("Invalid thread ID")
    }

    const auth = getAuth(req)

    if (!auth.userId) {
      throw new UnauthorizedError()
    }

    const profile = await getUserFromClerk(auth.userId)
    const viewerUserId = profile.user.id

    const thread = await getThreadStatsById({
      threadId,
      viewerUserId,
    })

    res.status(200).json({ data: thread })
  } catch (error) {
    next(error)
  }
})

threadsRouter.get("/", async (req, res, next) => {
  try {
    const filter = parseThreadsFilter({
      page: req.query.page,
      pageSize: req.query.pageSize,
      category: req.query.category,
      q: req.query.q,
      sort: req.query.sort,
    })

    const threads = await findAllThreads(filter)

    res.status(200).json({ data: threads })
  } catch (error) {
    next(error)
  }
})

// replies & likes routes

threadsRouter.get("/:threadId/replies", async (req, res, next) => {
  try {
    const auth = getAuth(req)
    if (!auth.userId) {
      throw new UnauthorizedError()
    }

    const threadId = Number(req.params.threadId)

    if (isNaN(threadId) || threadId <= 0) {
      throw new BadRequestError("Invalid thread ID")
    }

    const replies = await findRepliesByThreadId(threadId)

    res.status(200).json({ data: replies })
  } catch (error) {
    next(error)
  }
})

threadsRouter.post("/:threadId/replies", async (req, res, next) => {
  try {
    const auth = getAuth(req)
    if (!auth.userId) {
      throw new UnauthorizedError()
    }

    const threadId = Number(req.params.threadId)

    if (isNaN(threadId) || threadId <= 0) {
      throw new BadRequestError("Invalid thread ID")
    }

    const bodyRaw = typeof req.body?.body === "string" ? req.body.body : ""

    if (bodyRaw.trim().length < 2 || bodyRaw.trim().length > 5000) {
      throw new BadRequestError(
        "Reply body must be between 2 and 5000 characters"
      )
    }

    const profile = await getUserFromClerk(auth.userId)

    const reply = await insertReply({
      threadId,
      authorUserId: profile.user.id,
      body: bodyRaw.trim(),
    })

    await createReplyNotification({
      threadId,
      actorUserId: profile.user.id,
    })

    res.status(201).json({ data: reply })
  } catch (error) {
    next(error)
  }
})

threadsRouter.delete("/replies/:replyId", async (req, res, next) => {
  try {
    const auth = getAuth(req)
    if (!auth.userId) {
      throw new UnauthorizedError()
    }

    const replyId = Number(req.params.replyId)

    if (!Number.isInteger(replyId) || replyId <= 0) {
      throw new BadRequestError("Invalid reply ID")
    }

    const profile = await getUserFromClerk(auth.userId)

    const authorId = await getAuthorIdByReplyId(replyId)

    if (profile.user.id !== authorId) {
      throw new ForbiddenError("You are not authorized to delete this reply")
    }

    await deleteReplyById(replyId)

    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

threadsRouter.post("/:threadId/likes", async (req, res, next) => {
  try {
    const auth = getAuth(req)
    if (!auth.userId) {
      throw new UnauthorizedError()
    }

    const threadId = Number(req.params.threadId)

    if (isNaN(threadId) || threadId <= 0) {
      throw new BadRequestError("Invalid thread ID")
    }

    const profile = await getUserFromClerk(auth.userId)

    await likeThread({
      threadId,
      userId: profile.user.id,
    })

    await createLikeNotification({
      threadId,
      actorUserId: profile.user.id,
    })

    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

threadsRouter.delete("/:threadId/likes", async (req, res, next) => {
  try {
    const auth = getAuth(req)
    if (!auth.userId) {
      throw new UnauthorizedError()
    }

    const threadId = Number(req.params.threadId)

    if (isNaN(threadId) || threadId <= 0) {
      throw new BadRequestError("Invalid thread ID")
    }

    const profile = await getUserFromClerk(auth.userId)

    await unlikeThread({
      threadId,
      userId: profile.user.id,
    })

    res.status(204).send()
  } catch (error) {
    next(error)
  }
})
