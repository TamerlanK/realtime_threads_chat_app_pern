import { UserProfile } from "./user.types"
import { clerkClient } from "../../config/clerk"
import {
  updateUserByClerkUserId,
  upsertUserFromClerkProfile,
} from "./user.repository"

type ClerkProfile = {
  fullName: string | null
  email: string | null
  avatarUrl: string | null
}

async function fetchClerkProfile(clerkUserId: string): Promise<ClerkProfile> {
  if (!clerkUserId) {
    throw new Error("Clerk User ID is required to fetch profile.")
  }

  const user = await clerkClient.users.getUser(clerkUserId)

  const primaryEmail =
    user.emailAddresses.find(({ id }) => id === user.primaryEmailAddressId) ??
    user.emailAddresses[0]

  return {
    fullName: user.fullName ?? null,
    email: primaryEmail?.emailAddress ?? null,
    avatarUrl: user.imageUrl ?? null,
  }
}

export async function getUserFromClerk(
  clerkUserId: string
): Promise<UserProfile> {
  const { fullName, email, avatarUrl } = await fetchClerkProfile(clerkUserId)

  const user = await upsertUserFromClerkProfile({
    clerkUserId,
    displayName: fullName,
    avatarUrl,
  })

  return {
    user,
    clerkEmail: email,
    clerkFullName: fullName,
  }
}

export async function updateUserProfile(params: {
  clerkUserId: string
  displayName?: string
  handle?: string
  bio?: string
  avatarUrl?: string
}): Promise<UserProfile> {
  const { clerkUserId, displayName, handle, bio, avatarUrl } = params

  const updatedUser = await updateUserByClerkUserId({
    clerkUserId,
    displayName,
    handle,
    bio,
    avatarUrl,
  })

  const { fullName, email } = await fetchClerkProfile(clerkUserId)

  return {
    user: updatedUser,
    clerkEmail: email,
    clerkFullName: fullName,
  }
}
