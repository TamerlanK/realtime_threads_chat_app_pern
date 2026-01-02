export type ChatUserRow = {
  id: number
  display_name: string | null
  handle: string | null
  avatar_url: string | null
}

export type ChatUser = {
  id: number
  displayName: string | null
  handle: string | null
  avatarUrl: string | null
}

export interface DirectMessageRow {
  id: number
  sender_user_id: number
  recipient_user_id: number

  body: string | null
  image_url: string | null
  created_at: Date

  sender_display_name: string | null
  sender_handle: string | null
  sender_avatar_url: string | null

  recipient_display_name: string | null
  recipient_handle: string | null
  recipient_avatar_url: string | null
}

export interface DirectMessage {
  id: number
  senderUserId: number
  recipientUserId: number
  body: string | null
  imageUrl: string | null
  createdAt: string

  sender: {
    displayName: string | null
    handle: string | null
    avatarUrl: string | null
  }

  recipient: {
    displayName: string | null
    handle: string | null
    avatarUrl: string | null
  }
}

export function mapChatUserRowToChatUser(row: ChatUserRow): ChatUser {
  return {
    id: row.id,
    displayName: row.display_name,
    handle: row.handle,
    avatarUrl: row.avatar_url,
  }
}

export function mapDirectMessageRowToDTO(row: DirectMessageRow): DirectMessage {
  return {
    id: row.id,
    senderUserId: row.sender_user_id,
    recipientUserId: row.recipient_user_id,
    body: row.body,
    imageUrl: row.image_url,
    createdAt: row.created_at.toISOString(),

    sender: {
      displayName: row.sender_display_name,
      handle: row.sender_handle,
      avatarUrl: row.sender_avatar_url,
    },

    recipient: {
      displayName: row.recipient_display_name,
      handle: row.recipient_handle,
      avatarUrl: row.recipient_avatar_url,
    },
  }
}
