"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useNotificationCount } from "@/hooks/use-notification-count"
import { useSocket } from "@/hooks/use-socket"
import { apiGet, apiPost, createBrowserApiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { Notification } from "@/types/notification"
import { useAuth } from "@clerk/nextjs"
import { CheckCheck, InboxIcon, MessageCircle, ThumbsUp } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

function formatText(notification: Notification) {
  const actor = notification.actor.handle
    ? `@${notification.actor.handle}`
    : notification.actor.displayName
    ? notification.actor.displayName
    : "Someone"

  switch (notification.type) {
    case "REPLY_ON_THREAD":
      return `${actor} replied to your thread.`
    case "LIKE_ON_THREAD":
      return `${actor} liked your thread.`
    default:
      return "You have a new notification."
  }
}

const NotificationsPage = () => {
  const { getToken } = useAuth()
  const { socket } = useSocket()

  const router = useRouter()

  const apiClient = useMemo(() => createBrowserApiClient(getToken), [getToken])

  const { decrementUnreadCount } = useNotificationCount()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [isMarkingAll, setIsMarkingAll] = useState(false)

  useEffect(() => {
    let alive = true

    async function loadNotifications() {
      try {
        setIsLoading(true)

        const data = await apiGet<Notification[]>(
          apiClient,
          "/api/notifications"
        )

        if (!alive) return

        setNotifications(data)
      } catch (error) {
        if (!alive) return

        toast.error("Failed to load notifications", {
          description: "Please try again later.",
        })
      } finally {
        if (alive) {
          setIsLoading(false)
        }
      }
    }

    loadNotifications()

    return () => {
      alive = false
    }
  }, [apiClient, getToken])

  useEffect(() => {
    if (!socket) return

    const handleNewNotification = (notification: Notification) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === notification.id)) return prev
        return [notification, ...prev]
      })
    }

    socket.on("notification:new", handleNewNotification)

    return () => {
      socket.off("notification:new", handleNewNotification)
    }
  }, [socket])

  const unreadCount = notifications.filter((n) => !n.readAt).length

  async function readNotification(notification: Notification) {
    try {
      if (!notification.readAt) {
        await apiPost(
          apiClient,
          `/api/notifications/${notification.id}/read`,
          undefined
        )
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id
              ? { ...n, readAt: new Date().toISOString() }
              : n
          )
        )
        decrementUnreadCount()
      }
    } catch (error) {
      toast.error("Failed to mark notification as read", {
        description: "Please try again later.",
      })
      return
    }

    router.push(`/threads/${notification.threadId}`)
  }

  async function markAllAsRead() {
    try {
      setIsMarkingAll(true)
      await apiPost(apiClient, `/api/notifications/read-all`, undefined)
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      )
      decrementUnreadCount(unreadCount)
      setIsMarkingAll(false)
    } catch (error) {
      toast.error("Failed to mark all notifications as read", {
        description: "Please try again later.",
      })
      return
    } finally {
      setIsMarkingAll(false)
    }
  }

  return (
    <div className="mx-auto flex flex-col max-w-6xl w-full gap-6 py-8 px-4">
      <div className="flex items-center gap-2 justify-between">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
          <InboxIcon className="size-7 text-primary" />
          Notifications
        </h1>

        <button
          onClick={markAllAsRead}
          disabled={unreadCount === 0 || isMarkingAll}
          className={cn(
            "group flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition cursor-pointer disabled:opacity-50",
            unreadCount === 0 || isMarkingAll
              ? "text-muted-foreground cursor-default"
              : "text-primary hover:bg-primary/10"
          )}
        >
          <CheckCheck className="size-4 transition group-hover:scale-105" />
          Mark all as read
        </button>
      </div>
      <Card className="border-border/70 bg-card">
        {isLoading && (
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Loading notifications...
            </p>
          </CardContent>
        )}
        {!isLoading && notifications.length === 0 && (
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              You have no notifications.
            </p>
          </CardContent>
        )}
        {!isLoading && notifications.length > 0 && (
          <CardContent className="divide-y divide-border/70">
            {notifications.map((notification) => {
              const text = formatText(notification)
              const icon =
                notification.type === "REPLY_ON_THREAD" ? (
                  <MessageCircle
                    className={cn(
                      "size-4 text-chart-2",
                      !notification.readAt && "fill-chart-2"
                    )}
                  />
                ) : (
                  <ThumbsUp
                    className={cn(
                      "size-4 text-primary",
                      !notification.readAt && "fill-primary"
                    )}
                  />
                )

              const isUnread = !notification.readAt

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => readNotification(notification)}
                  className={cn(
                    "flex w-full items-start gap-4 px-3 py-4 text-left transition-colors duration-200 cursor-pointer",
                    isUnread
                      ? "bg-primary/5 hover:bg-primary/10"
                      : "hover:bg-primary/5"
                  )}
                >
                  <div className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-background/600">
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                      <p
                        className={cn(
                          "text-sm",
                          isUnread
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground font-bold"
                        )}
                      >
                        {text}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 text-xs",
                          isUnread
                            ? "text-primary font-medium"
                            : "text-muted-foreground"
                        )}
                      >
                        {new Date(notification.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {notification.thread.title.slice(0, 100)}
                    </p>
                    {isUnread && (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge
                          className="border-primary/30 bg-primary/10 text-xs text-primary"
                          variant="outline"
                        >
                          New
                        </Badge>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </CardContent>
        )}
      </Card>
    </div>
  )
}

export default NotificationsPage
