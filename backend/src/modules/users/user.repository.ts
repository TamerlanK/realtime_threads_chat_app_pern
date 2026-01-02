import { query } from "../../db/db"
import { User, UserRow } from "./user.types"

function hydrateUser(row: UserRow): User {
  return {
    id: row.id,
    clerkUserId: row.clerk_user_id,
    displayName: row.display_name,
    handle: row.handle,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function upsertUserFromClerkProfile(params: {
  clerkUserId: string
  displayName: string | null
  avatarUrl: string | null
}): Promise<User> {
  const { clerkUserId, displayName, avatarUrl } = params

  const result = await query<UserRow>(
    `
        INSERT INTO users (clerk_user_id, display_name, avatar_url)
        VALUES ($1, $2, $3)
        ON CONFLICT (clerk_user_id)
        DO UPDATE SET
           updated_at   = NOW()
        RETURNING
           id,
           clerk_user_id,
           display_name,
           handle,
           avatar_url,
           bio,
           created_at,
           updated_at
        `,
    [clerkUserId, displayName, avatarUrl]
  )

  return hydrateUser(result.rows[0])
}

export async function updateUserByClerkUserId(params: {
  clerkUserId: string
  displayName?: string
  handle?: string
  bio?: string
  avatarUrl?: string
}): Promise<User> {
  if (!params.clerkUserId) {
    throw new Error("Clerk User ID is required to update profile.")
  }

  const { clerkUserId, displayName, handle, bio, avatarUrl } = params

  const setClauses: string[] = []
  const values: unknown[] = [clerkUserId]
  let idx = 2

  if (displayName !== undefined) {
    setClauses.push(`display_name = $${idx++}`)
    values.push(displayName)
  }

  if (handle !== undefined) {
    setClauses.push(`handle = $${idx++}`)
    values.push(handle)
  }

  if (bio !== undefined) {
    setClauses.push(`bio = $${idx++}`)
    values.push(bio)
  }

  if (avatarUrl !== undefined) {
    setClauses.push(`avatar_url = $${idx++}`)
    values.push(avatarUrl)
  }

  if (setClauses.length === 0) {
    throw new Error("At least one field must be provided to update profile.")
  }

  setClauses.push(`updated_at = NOW()`)

  const result = await query<UserRow>(
    `
      UPDATE users
      SET ${setClauses.join(", ")}
      WHERE clerk_user_id = $1
      RETURNING
        id,
        clerk_user_id,
        display_name,
        handle,
        avatar_url,
        bio,
        created_at,
        updated_at
    `,
    values
  )

  if (result.rows.length === 0) {
    throw new Error(`User with Clerk User ID ${clerkUserId} not found.`)
  }

  return hydrateUser(result.rows[0])
}
