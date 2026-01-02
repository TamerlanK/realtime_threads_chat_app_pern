import { query } from "../../db/db"
import {
  type ChatUser,
  type ChatUserRow,
  DirectMessage,
  DirectMessageRow,
  mapChatUserRowToChatUser,
  mapDirectMessageRowToDTO,
} from "./chat.types"

export async function findChatUsers(
  currentUserId: number
): Promise<ChatUser[]> {
  try {
    const result = await query<ChatUserRow>(
      `
            SELECT
              id,
              display_name,
              handle,
              avatar_url
            FROM users
            WHERE id <> $1
            ORDER BY COALESCE(display_name, handle, 'User') ASC
        `,
      [currentUserId]
    )

    return result.rows.map(mapChatUserRowToChatUser)
  } catch (error) {
    throw error
  }
}

export async function findDirectMessages(params: {
  userId: number
  otherUserId: number
  limit?: number
}): Promise<DirectMessage[]> {
  try {
    const { userId, otherUserId, limit } = params

    const DEFAULT_LIMIT = 50
    const MAX_LIMIT = 200

    const parsedLimit = Number(limit)
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), MAX_LIMIT)
      : DEFAULT_LIMIT

    const result = await query<DirectMessageRow>(
      `
        SELECT 
          dm.id,
          dm.sender_user_id,
          dm.recipient_user_id,
          dm.body,
          dm.image_url,
          dm.created_at,
          s.display_name AS sender_display_name,
          s.handle AS sender_handle,
          s.avatar_url AS sender_avatar_url,
          r.display_name AS recipient_display_name,
          r.handle AS recipient_handle,
          r.avatar_url AS recipient_avatar_url
        FROM direct_messages dm
        JOIN users s ON dm.sender_user_id = s.id
        JOIN users r ON dm.recipient_user_id = r.id
        WHERE
          (dm.sender_user_id = $1 AND dm.recipient_user_id = $2)
          OR
          (dm.sender_user_id = $2 AND dm.recipient_user_id = $1)
        ORDER BY dm.created_at DESC
        LIMIT $3
      `,
      [userId, otherUserId, safeLimit]
    )

    return result.rows.reverse().map(mapDirectMessageRowToDTO)
  } catch (error) {
    throw error
  }
}

export async function createDirectMessage(params: {
  senderUserId: number
  recipientUserId: number
  body?: string | null
  imageUrl?: string | null
}) {
  const { senderUserId, recipientUserId, body, imageUrl } = params

  const messageBody = body?.trim() ?? null
  const messageImageUrl = imageUrl ?? null

  if (!messageBody && !messageImageUrl) {
    throw new Error("Message must contain text or an image")
  }

  const insertResult = await query<DirectMessageRow>(
    `
      INSERT INTO direct_messages
        (sender_user_id, recipient_user_id, body, image_url)
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        created_at
    `,
    [senderUserId, recipientUserId, messageBody, messageImageUrl]
  )

  const insertedRow = insertResult.rows[0]

  const fullResponse = await query<DirectMessageRow>(
    `
        SELECT 
          dm.id,
          dm.sender_user_id,
          dm.recipient_user_id,
          dm.body,
          dm.image_url,
          dm.created_at,
          s.display_name AS sender_display_name,
          s.handle AS sender_handle,
          s.avatar_url AS sender_avatar_url,
          r.display_name AS recipient_display_name,
          r.handle AS recipient_handle,
          r.avatar_url AS recipient_avatar_url
        FROM direct_messages dm
        JOIN users s ON dm.sender_user_id = s.id
        JOIN users r ON dm.recipient_user_id = r.id
        WHERE dm.id = $1


      `,
    [insertedRow.id]
  )

  const fullRow = fullResponse.rows[0]

  if (!fullRow) {
    throw new Error("Failed to retrieve the created direct message")
  }

  return mapDirectMessageRowToDTO(fullRow)
}
