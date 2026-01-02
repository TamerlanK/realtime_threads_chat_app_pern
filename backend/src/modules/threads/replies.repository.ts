import { query } from "../../db/db"
import { BadRequestError, NotFoundError } from "../../lib/errors"
import { getThreadById } from "./threads.repository"

export async function findRepliesByThreadId(threadId: number) {
  if (!Number.isInteger(threadId) || threadId <= 0) {
    throw new BadRequestError("Invalid thread ID")
  }

  const result = await query(
    `
        SELECT
          r.id,
          r.body,
          r.created_at,
          u.display_name AS author_display_name,
          u.handle AS author_handle
        FROM replies r
        JOIN users u ON r.author_user_id = u.id
        WHERE r.thread_id = $1
        ORDER BY r.created_at ASC
    `,
    [threadId]
  )

  return result.rows.map((row) => ({
    id: row.id as number,
    body: row.body as string,
    createdAt: row.created_at as Date,
    author: {
      displayName: (row.author_display_name as string) ?? null,
      handle: (row.author_handle as string) ?? null,
    },
  }))
}

export async function insertReply(params: {
  threadId: number
  authorUserId: number
  body: string
}) {
  const { threadId, authorUserId, body } = params

  const result = await query(
    `
        INSERT INTO replies (thread_id, author_user_id, body)
        VALUES ($1, $2, $3)
        RETURNING id, created_at
    `,
    [threadId, authorUserId, body]
  )

  const row = result.rows[0]

  const fullReply = await query(
    `
        SELECT r.id, r.body, r.created_at, u.display_name AS author_display_name, u.handle AS author_handle
        FROM replies r
        JOIN users u ON r.author_user_id = u.id
        WHERE r.id = $1
        LIMIT 1
    `,
    [row.id]
  )

  const replyRow = fullReply.rows[0]

  return {
    id: replyRow.id as number,
    body: replyRow.body as string,
    createdAt: replyRow.created_at as Date,
    author: {
      displayName: (replyRow.author_display_name as string) ?? null,
      handle: (replyRow.author_handle as string) ?? null,
    },
  }
}

export async function getThreadByReplyId(replyId: number) {
  const result = await query(
    `
            SELECT thread_id
            FROM replies
            WHERE id = $1
            LIMIT 1
        `,
    [replyId]
  )

  const row = result.rows[0]

  if (!row) {
    throw new NotFoundError("Reply not found")
  }

  return row.thread_id as number
}

export async function getAuthorIdByReplyId(replyId: number) {
  const result = await query(
    `
            SELECT author_user_id
            FROM replies
            WHERE id = $1
            LIMIT 1
        `,
    [replyId]
  )

  const row = result.rows[0]

  if (!row) {
    throw new NotFoundError("Reply not found")
  }

  return row.author_user_id as number
}

export async function deleteReplyById(replyId: number) {
  await query(
    `
        DELETE FROM replies
        WHERE id = $1
    `,
    [replyId]
  )
}

export async function likeThread(params: { threadId: number; userId: number }) {
  const { threadId, userId } = params

  await query(
    `
            INSERT INTO thread_reactions (thread_id, user_id)
            VALUES ($1, $2)
            ON CONFLICT (thread_id, user_id) DO NOTHING
        `,
    [threadId, userId]
  )
}

export async function unlikeThread(params: {
  threadId: number
  userId: number
}) {
  const { threadId, userId } = params

  await query(
    `
        DELETE FROM thread_reactions
        WHERE thread_id = $1 AND user_id = $2
    `,
    [threadId, userId]
  )
}

export async function getThreadStatsById(params: {
  threadId: number
  viewerUserId: number | null
}) {
  const { threadId, viewerUserId } = params

  const thread = await getThreadById(threadId)

  const likeResult = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM thread_reactions
      WHERE thread_id = $1
    `,
    [threadId]
  )

  const likeCount = (likeResult.rows[0]?.count as number | undefined) ?? 0

  const replyResult = await query(
    `
      SELECT COUNT(*)::int AS count
      FROM replies
      WHERE thread_id = $1  
    `,
    [threadId]
  )

  const replyCount = (replyResult.rows[0]?.count as number | undefined) ?? 0

  let viewerHasLiked = false

  if (viewerUserId) {
    const viewerLikeResult = await query(
      `
        SELECT 1
        FROM thread_reactions
        WHERE thread_id = $1 AND user_id = $2
        LIMIT 1
        `,
      [threadId, viewerUserId]
    )

    const count = viewerLikeResult?.rowCount ?? 0

    if (count > 0) {
      viewerHasLiked = true
    }
  }

  return {
    ...thread,
    likeCount,
    replyCount,
    viewerHasLiked,
  }
}
