import { Router } from "express"
import z from "zod"
import {
  toUserProfileResponse,
  UserProfile,
  UserProfileResponse,
} from "../modules/users/user.types"
import { getAuth } from "../config/clerk"
import { UnauthorizedError } from "../lib/errors"
import {
  getUserFromClerk,
  updateUserProfile,
} from "../modules/users/user.service"
import { normalizeOptionalString } from "../utils/string"

export const userRouter = Router()

const UserProfileUpdateSchema = z.object({
  displayName: z.string().trim().min(3).max(50).optional(),
  handle: z.string().trim().min(3).max(30).optional(),
  bio: z.string().trim().max(160).optional(),
  avatarUrl: z.url("Avatar must be a valid URL").trim().optional(),
})

function toResponse(profile: UserProfile): UserProfileResponse {
  return toUserProfileResponse(profile)
}

userRouter.get("/", async (req, res, next) => {
  try {
    const auth = getAuth(req)
    if (!auth.userId) {
      throw new UnauthorizedError()
    }

    const profile = await getUserFromClerk(auth.userId)
    const response = toResponse(profile)

    res.json({ data: response })
  } catch (error) {
    next(error)
  }
})

userRouter.patch("/", async (req, res, next) => {
  try {
    const auth = getAuth(req)
    if (!auth.userId) {
      throw new UnauthorizedError()
    }

    const parsedData = UserProfileUpdateSchema.parse(req.body)

    const displayName = normalizeOptionalString(parsedData.displayName)
    const handle = normalizeOptionalString(parsedData.handle)
    const bio = normalizeOptionalString(parsedData.bio)
    const avatarUrl = normalizeOptionalString(parsedData.avatarUrl)

    const profile = await updateUserProfile({
      clerkUserId: auth.userId,
      displayName,
      handle,
      bio,
      avatarUrl,
    })

    const response = toResponse(profile)

    res.json({ data: response })
  } catch (error) {
    next(error)
  }
})
