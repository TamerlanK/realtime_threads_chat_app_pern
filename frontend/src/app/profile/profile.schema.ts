import { z } from "zod"

const optionalText = z
  .string()
  .transform((value) => value.trim())
  .transform((value) => (value === "" ? undefined : value))
  .optional()

export const ProfileSchema = z.object({
  displayName: optionalText,
  handle: optionalText,
  bio: optionalText,
  avatarUrl: optionalText,
})

export type ProfileFormValues = z.infer<typeof ProfileSchema>
