export type UserRow = {
  id: number
  clerk_user_id: string
  display_name: string | null
  handle: string | null
  avatar_url: string | null
  bio: string | null
  created_at: Date
  updated_at: Date
}

export type User = {
  id: number
  clerkUserId: string
  displayName: string | null
  handle: string | null
  bio: string | null
  avatarUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export type UserProfile = {
  user: User
  clerkEmail: string | null
  clerkFullName: string | null
}

export type UserProfileResponse = {
  id: number
  clerkUserId: string
  displayName: string | null
  email: string | null
  handle: string | null
  avatarUrl: string | null
  bio: string | null
}

export function toUserProfileResponse(
  profile: UserProfile
): UserProfileResponse {
  const { user, clerkEmail, clerkFullName } = profile

  const { id, clerkUserId, displayName, handle, avatarUrl, bio } = user

  return {
    id,
    clerkUserId,
    email: clerkEmail ?? null,
    displayName: displayName ?? clerkFullName ?? null,
    handle: handle ?? null,
    avatarUrl: avatarUrl ?? null,
    bio: bio ?? null,
  }
}
