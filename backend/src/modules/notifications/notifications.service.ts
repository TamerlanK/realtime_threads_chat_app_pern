import { query } from "../../db/db"
import { getIO } from "../../realtime/io"
import {
  mapNotificationRowToNotification,
  NotificationRow,
  NotificationType,
} from "./notifications.types"

export async function createReplyNotification(params: {
  threadId: number
  actorUserId: number
}) {
  const { threadId, actorUserId } = params

  const threadResponse = await query(
    `
            SELECT author_user_id
            FROM threads
            WHERE id = $1
            LIMIT 1
        `,
    [threadId]
  )

  const threadRow = threadResponse.rows[0] as
    | { author_user_id: number }
    | undefined

  if (!threadRow) {
    return
  }

  const authorUserId = threadRow.author_user_id

  if (authorUserId === actorUserId) {
    return
  }

  const insertResponse = await query(
    `
        INSERT INTO notifications (user_id, thread_id, actor_user_id, type)
        VALUES ($1, $2, $3, $4)
        RETURNING id, created_at
    `,
    [authorUserId, threadId, actorUserId, NotificationType.REPLY_ON_THREAD]
  )

  const notificationRow = insertResponse.rows[0] as
    | { id: number; created_at: Date }
    | undefined

  if (!notificationRow) {
    return
  }

  const fullNotificationResponse = await query(
    `
        SELECT 
          n.id,
          n.type,
          n.thread_id,
          n.created_at,
          n.read_at,
          actor.display_name AS actor_display_name,
          actor.handle AS actor_handle,
          thread.title AS thread_title
        FROM notifications n
        JOIN users actor ON n.actor_user_id = actor.id
        JOIN threads thread ON n.thread_id = thread.id
        WHERE n.id = $1
        LIMIT 1
    `,
    [notificationRow.id]
  )

  const fullRow = fullNotificationResponse.rows[0] as
    | NotificationRow
    | undefined

  if (!fullRow) {
    return
  }

  const payload = mapNotificationRowToNotification(fullRow)

  const io = getIO()

  if (io) {
    io.to(`notifications:user:${authorUserId}`).emit(
      "notification:new",
      payload
    )
  }
}

export async function createLikeNotification(params: {
  threadId: number
  actorUserId: number
}) {
  const { threadId, actorUserId } = params

  const threadResponse = await query(
    `
            SELECT author_user_id
            FROM threads
            WHERE id = $1
            LIMIT 1
        `,
    [threadId]
  )

  const threadRow = threadResponse.rows[0] as
    | { author_user_id: number }
    | undefined

  if (!threadRow) {
    return
  }

  const authorUserId = threadRow.author_user_id

  if (authorUserId === actorUserId) {
    return
  }

  const insertResponse = await query(
    `
        INSERT INTO notifications (user_id, thread_id, actor_user_id, type)
        VALUES ($1, $2, $3, $4)
        RETURNING id, created_at
    `,
    [authorUserId, threadId, actorUserId, NotificationType.LIKE_ON_THREAD]
  )

  const notificationRow = insertResponse.rows[0] as
    | { id: number; created_at: Date }
    | undefined

  if (!notificationRow) {
    return
  }

  const fullNotificationResponse = await query(
    `
        SELECT 
          n.id,
          n.type,
          n.thread_id,
          n.created_at,
          n.read_at,
          actor.display_name AS actor_display_name,
          actor.handle AS actor_handle,
          thread.title AS thread_title
        FROM notifications n
        JOIN users actor ON n.actor_user_id = actor.id
        JOIN threads thread ON n.thread_id = thread.id
        WHERE n.id = $1
        LIMIT 1
    `,
    [notificationRow.id]
  )

  const fullRow = fullNotificationResponse.rows[0] as
    | NotificationRow
    | undefined

  if (!fullRow) {
    return
  }

  const payload = mapNotificationRowToNotification(fullRow)

  const io = getIO()
  if (io) {
    io.to(`notifications:user:${authorUserId}`).emit(
      "notification:new",
      payload
    )
  }
}

export async function listNotifications(params: {
  userId: number
  unreadOnly: boolean
}) {
  const { userId, unreadOnly } = params

  const conditions = ["n.user_id = $1"]
  const values: unknown[] = [userId]

  if (unreadOnly) {
    conditions.push("n.read_at IS NULL")
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`
  const result = await query(
    `
        SELECT 
          n.id,
          n.type,
          n.thread_id,
          n.created_at,
          n.read_at,
          actor.display_name AS actor_display_name,
          actor.handle AS actor_handle,
          thread.title AS thread_title
        FROM notifications n
        JOIN users actor ON n.actor_user_id = actor.id
        JOIN threads thread ON n.thread_id = thread.id
        ${whereClause}
        ORDER BY n.created_at DESC
    `,
    values
  )

  return result.rows.map((ntf) =>
    mapNotificationRowToNotification(ntf as NotificationRow)
  )
}

export async function markNotificationAsRead(params: {
  userId: number
  notificationId: number
}): Promise<void> {
  const { userId, notificationId } = params

  await query(
    `
        UPDATE notifications
        SET read_at = COALESCE(read_at, NOW())
        WHERE id = $1 AND user_id = $2
        `,
    [notificationId, userId]
  )
}

export async function markAllNotificationsAsRead(params: { userId: number }) {
  const { userId } = params

  const result = await query<{ count: number }>(
    `
          UPDATE notifications
          SET read_at = COALESCE(read_at, NOW())
          WHERE user_id = $1 AND read_at IS NULL
          RETURNING 1
          `,
    [userId]
  )

  return result.rowCount
}
