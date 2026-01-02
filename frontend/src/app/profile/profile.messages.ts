export const PROFILE_MESSAGES = {
  updatedSuccess: {
    title: "Profile updated successfully!",
    description: "Your profile information has been saved.",
  },
  loadFailed: {
    title: "Failed to load profile",
    description: "Please try again later.",
  },

  updateFailed: {
    title: "Failed to update profile",
    description: "Please check your input and try again.",
  },

  unauthorized: {
    title: "Not signed in",
    description: "Please sign in to manage your profile.",
  },
} as const
