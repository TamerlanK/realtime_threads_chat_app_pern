"use client"

import ChatPanel from "@/components/chat/chat-panel"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSocket } from "@/hooks/use-socket"
import { apiGet, createBrowserApiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { ChatUser } from "@/types/chat"
import { useAuth } from "@clerk/nextjs"
import { MessageSquare, Users } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

const ChatPage = () => {
  const { getToken } = useAuth()
  const { socket, isConnected } = useSocket()

  const apiClient = useMemo(() => createBrowserApiClient(getToken), [getToken])

  const [users, setUsers] = useState<ChatUser[]>([])
  const [activeUserId, setActiveUserId] = useState<number | null>(null)
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false)
  const [onlineUserIds, setOnlineUserIds] = useState<number[]>([])

  useEffect(() => {
    let alive = true

    async function loadChatUsers() {
      try {
        setIsLoadingUsers(true)
        const response = await apiGet<ChatUser[]>(apiClient, "/api/chat/users")

        if (!alive) return
        setUsers(
          response.map((user) => ({
            id: Number(user.id),
            displayName: user.displayName ?? "Unknown",
            handle: user.handle ?? "unknown",
            avatarUrl: user.avatarUrl ?? null,
          }))
        )

        if (response.length > 0 && activeUserId === null) {
          setActiveUserId(response[0].id)
        }
      } catch (error) {
        if (!alive) return
        toast.error("Failed to load chat users", {
          description: "Please try again later.",
        })
      } finally {
        if (alive) {
          setIsLoadingUsers(false)
        }
      }
    }

    loadChatUsers()

    return () => {
      alive = false
    }
  }, [getToken])

  useEffect(() => {
    if (!socket) return

    const handlePresenceUpdate = (data: { onlineUserIds: number[] }) => {
      setOnlineUserIds(data?.onlineUserIds || [])
    }

    socket.on("presence:update", handlePresenceUpdate)

    return () => {
      socket.off("presence:update", handlePresenceUpdate)
    }
  }, [socket])

  const activeUser = users.find((user) => user.id === activeUserId) || null
  const onlineCount = users.filter((u) => onlineUserIds.includes(u.id)).length

  return (
    <div className="mx-auto max-w-6xl flex w-full flex-col gap-4 py-6 md:flex-row md:gap-6 ">
      <aside className="w-full shrink-0 md:w-72">
        <Card className="h-full border-border/70 bg-card md:sticky md:top-24">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-5 text-primary" />
              <CardTitle className="text-sm text-foreground">
                Direct Messages
              </CardTitle>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {onlineCount} of {users.length} users online
            </p>
          </CardHeader>
          <CardContent className="flex max-h-[calc(100vh-12rem)] flex-col gap-1 overflow-y-auto">
            {isLoadingUsers && (
              <p className="text-muted-foreground">Loading users...</p>
            )}
            {!isLoadingUsers && users.length === 0 && (
              <p className="text-muted-foreground">No users found.</p>
            )}
            {!isLoadingUsers &&
              users.map((user) => {
                const isOnline = onlineUserIds.includes(user.id)
                const isActive = user.id === activeUserId

                const label = user.handle
                  ? `@${user.handle}`
                  : user.displayName ?? "Unknown"

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setActiveUserId(user.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg p-3 text-left text-xs transition-colors duration-150 cursor-pointer",
                      isActive
                        ? "bg-primary/20 text-primary ring-1 ring-primary/30 hover:bg-primary/25"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="size-8">
                        {user.avatarUrl && (
                          <AvatarImage src={user.avatarUrl} alt={label} />
                        )}
                      </Avatar>
                      <span
                        className={cn(
                          "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card",
                          isOnline ? "bg-primary" : "bg-muted-foreground"
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex flex-1 flex-col">
                      <span className="truncate text-xs font-medium text-foreground">
                        {label}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isOnline ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                  </button>
                )
              })}
          </CardContent>
        </Card>
      </aside>
      <main className="min-h-[calc(100vh-8rem)] flex-1 md:min-h-auto">
        {activeUserId && activeUser ? (
          <ChatPanel
            otherUserId={activeUserId}
            otherUser={activeUser}
            socket={socket}
            isConnected={isConnected}
          />
        ) : (
          <Card className="flex h-full items-center justify-center border-border/70 bg-card">
            <CardContent className="text-center">
              <Users className="mx-auto mb-3 size-12 opacity-55 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Select a user from the left panel to start a conversation.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

export default ChatPage
