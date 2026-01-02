"use client"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { apiGet, apiPatch, createBrowserApiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs"
import { zodResolver } from "@hookform/resolvers/zod"
import { SaveIcon, User } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { PROFILE_API_URL } from "./profile.api"
import { PROFILE_MESSAGES } from "./profile.messages"
import { ProfileFormValues, ProfileSchema } from "./profile.schema"

type UserResponse = {
  id: number
  clerkUserId: string
  displayName: string | null
  email: string | null
  handle: string | null
  avatarUrl: string | null
  bio: string | null
}

const ProfilePage = () => {
  const { getToken } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const apiClient = useMemo(() => createBrowserApiClient(getToken), [getToken])

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      displayName: "",
      handle: "",
      bio: "",
      avatarUrl: "",
    },
  })

  async function onSubmit(data: ProfileFormValues) {
    try {
      const payload: Record<string, string> = {}
      if (data.displayName) payload.displayName = data.displayName
      if (data.handle) payload.handle = data.handle.toLowerCase()
      if (data.bio) payload.bio = data.bio
      if (data.avatarUrl) payload.avatarUrl = data.avatarUrl

      const apiResponse = await apiPatch<typeof payload, UserResponse>(
        apiClient,
        PROFILE_API_URL,
        payload
      )
      form.reset({
        displayName: apiResponse.displayName || "",
        handle: apiResponse.handle || "",
        bio: apiResponse.bio || "",
        avatarUrl: apiResponse.avatarUrl || "",
      })

      toast.success(PROFILE_MESSAGES.updatedSuccess.title, {
        description: PROFILE_MESSAGES.updatedSuccess.description,
      })
    } catch (error: any) {
      toast.error(PROFILE_MESSAGES.updateFailed.title, {
        description:
          error?.message || PROFILE_MESSAGES.updateFailed.description,
      })
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    async function loadProfile() {
      try {
        setIsLoading(true)
        const getUserInfo = await apiGet<UserResponse>(
          apiClient,
          PROFILE_API_URL,
          {
            signal: controller.signal,
          }
        )
        form.reset({
          displayName: getUserInfo.displayName ?? "",
          handle: getUserInfo.handle ?? "",
          bio: getUserInfo.bio ?? "",
          avatarUrl: getUserInfo.avatarUrl ?? "",
        })
      } catch (error: any) {
        if (controller.signal.aborted) return

        toast.error(PROFILE_MESSAGES.loadFailed.title, {
          description:
            error?.message || PROFILE_MESSAGES.loadFailed.description,
        })
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()

    return () => controller.abort()
  }, [apiClient, form])

  const { displayName, handle, avatarUrl } = form.watch()
  const isDirty = form.formState.isDirty

  const isSaving = form.formState.isSubmitting

  return (
    <>
      <SignedOut></SignedOut>
      <SignedIn>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
          <div>
            <h1 className="flex items-center text-3xl font-bold tracking-tight text-foreground">
              <User className="w-8 h-8 text-primary mr-2" /> Profile Settings
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your profile information and settings here.
            </p>
          </div>
          <Card className="border-border/70 bg-card">
            <CardHeader className="pb-4">
              <div className="flex items-start gap-6">
                <Avatar className="w-20 h-20">
                  {avatarUrl && (
                    <AvatarImage
                      src={avatarUrl || "/placeholder.xyz"}
                      alt={displayName || "User Avatar"}
                    />
                  )}
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-2xl text-foreground">
                    {displayName || "Unnamed User"}
                  </CardTitle>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        handle
                          ? "bg-primary/10 text-primary"
                          : "bg-accent text-accent-foreground"
                      )}
                    >
                      {handle ? `@${handle}` : "No handle set"}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-border/70 bg-card">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">
                Edit Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-6"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-foreground">
                      Display Name
                    </label>
                    <Input
                      id="displayName"
                      placeholder="Tamerlan Kangarli"
                      {...form.register("displayName")}
                      disabled={isLoading || isSaving}
                      className="border-border bg-background/60 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-foreground">
                      Handle
                    </label>
                    <Input
                      id="handle"
                      placeholder="tamerlan_kangarli"
                      {...form.register("handle")}
                      disabled={isLoading || isSaving}
                      className="border-border bg-background/60 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-2 col-span-2">
                    <label className="text-sm font-semibold text-foreground">
                      Bio
                    </label>
                    <Textarea
                      id="bio"
                      placeholder="A short bio about yourself"
                      rows={4}
                      {...form.register("bio")}
                      disabled={isLoading || isSaving}
                      className="border-border bg-background/60 text-sm"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-foreground">
                    Avatar URL
                  </label>
                  <Input
                    id="avatarUrl"
                    {...form.register("avatarUrl")}
                    disabled={isLoading || isSaving}
                    className="border-border bg-background/60 text-sm"
                  />
                </div>
                <CardFooter className="p-0">
                  <Button
                    type="submit"
                    disabled={isLoading || isSaving || !isDirty}
                    className="min-w-37.5 ml-auto bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                  >
                    <SaveIcon className="mr-2 w-4 h-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </CardFooter>
              </form>
            </CardContent>
          </Card>
        </div>
      </SignedIn>
    </>
  )
}

export default ProfilePage
