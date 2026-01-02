"use client"

import { apiGet, createBrowserApiClient } from "@/lib/api-client"
import {
  mapDirectMessage,
  mapDirectMessagesResponse,
  type ChatUser,
  type DirectMessage,
  type RawDirectMessage,
} from "@/types/chat"
import { useAuth } from "@clerk/nextjs"
import { useEffect, useMemo, useRef, useState } from "react"
import type { Socket } from "socket.io-client"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { SendIcon, Wifi, WifiOff, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Textarea } from "../ui/textarea"
import { Button } from "../ui/button"
import ImageUpload from "./image-upload"

type Props = {
  otherUserId: number
  otherUser: ChatUser | null
  socket: Socket | null
  isConnected: boolean
}

const ChatPanel = ({ otherUserId, otherUser, socket, isConnected }: Props) => {
  const { getToken } = useAuth()

  const apiClient = useMemo(() => createBrowserApiClient(getToken), [getToken])

  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const [input, setInput] = useState("")
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [typingLabel, setTypingLabel] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    messagesEndRef?.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    let alive = true

    async function loadDirectMessages() {
      try {
        const response = await apiGet<DirectMessage[]>(
          apiClient,
          `/api/chat/${otherUserId}/messages`,
          {
            params: {
              limit: 100,
            },
          }
        )

        if (!alive) return
        setMessages(mapDirectMessagesResponse(response))
      } catch (error) {
        if (!alive) return
        toast.error("Failed to load messages", {
          description: "Please try again later.",
        })
      } finally {
        if (alive) {
          setIsLoadingMessages(false)
        }
      }
    }
    loadDirectMessages()

    return () => {
      alive = false
    }
  }, [apiClient, otherUserId])

  const title = otherUser?.handle
    ? `@${otherUser.handle}`
    : otherUser?.displayName || "Chat"

  useEffect(() => {
    if (!socket) return

    function handleMessage(payload: RawDirectMessage) {
      const mapped = mapDirectMessage(payload)

      const isRelevant =
        mapped.senderUserId === otherUserId ||
        mapped.recipientUserId === otherUserId

      if (!isRelevant) return

      setMessages((prev) => [...prev, mapped])
    }

    function handleTyping(payload: {
      senderUserId?: number
      recipientUserId?: number
      isTyping?: boolean
    }) {
      const { senderUserId, recipientUserId, isTyping } = payload

      if (Number(senderUserId) !== otherUserId) return

      if (isTyping) {
        setTypingLabel("Typing...")
      } else {
        setTypingLabel(null)
      }
    }

    socket.on("chat:message", handleMessage)
    socket.on("chat:typing", handleTyping)

    return () => {
      socket.off("chat:message", handleMessage)
      socket.off("chat:typing", handleTyping)
    }
  }, [socket, otherUserId])

  function setSendTypingStatus(isTyping: boolean) {
    if (!socket) return

    socket.emit("chat:typing", {
      recipientUserId: otherUserId,
      isTyping,
    })
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value
    setInput(value)

    if (!socket) return

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (value.trim()) {
      setSendTypingStatus(true)
    }

    typingTimeoutRef.current = setTimeout(() => {
      setSendTypingStatus(false)
      typingTimeoutRef.current = null
    }, 2000)
  }

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ): void => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  async function handleSend() {
    if (!socket || !isConnected) {
      toast.error("Cannot send message", {
        description: "You are not connected to the chat server.",
      })
      return
    }

    const body = input.trim()

    if (!body && !imageUrl) return

    setIsSendingMessage(true)

    try {
      socket.emit("chat:send", {
        recipientUserId: otherUserId,
        body: body || null,
        imageUrl: imageUrl || null,
      })

      setInput("")
      setImageUrl(null)
      setSendTypingStatus(false)
    } catch (error) {
    } finally {
      setIsSendingMessage(false)
    }
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden border-border/70 bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border pb-3">
        <div>
          <CardTitle className="text-base text-foreground">{title}</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Direct messages with {otherUser?.displayName || "Unknown User"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
              isConnected
                ? "bg-primary/10 text-primary"
                : "bg-accent text-accent-foreground"
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                isConnected ? "bg-primary" : "bg-accent-foreground"
              )}
            />
            {isConnected ? "Online" : "Offline"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3 overflow-y-auto bg-card p-4">
        {isLoadingMessages && (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-muted-foreground">Loading messages...</p>
          </div>
        )}
        {!isLoadingMessages && messages.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              No messages yet. Start the conversation!
            </p>
          </div>
        )}
        {!isLoadingMessages &&
          messages.map((message) => {
            const isOther = message.senderUserId === otherUserId
            const isSelf = !isOther

            const label = isOther ? title : "You"

            const time = new Date(message.createdAt).toLocaleDateString(
              "en-US",
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            )
            return (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2 text-xs",
                  isOther ? "justify-start" : "justify-end"
                )}
              >
                <div className={cn("max-w-xs", isSelf && "order-2")}>
                  <div
                    className={cn(
                      "mb-1 text-xs font-medium text-muted-foreground",
                      isSelf && "text-right"
                    )}
                  >
                    {label} · {time}
                  </div>
                  {message.body && (
                    <div
                      className={cn(
                        "inline-block rounded-lg px-3 py-2 transition-colors duration-150",
                        isOther
                          ? "bg-accent text-accent-foreground"
                          : "bg-primary/80 text-primary-foreground"
                      )}
                    >
                      <p className="wrap-break-word text-base leading-relaxed">
                        {message.body}
                      </p>
                    </div>
                  )}
                  {message.imageUrl && (
                    <div className="mt-2 overflow-hidden rounded-lg border border-border">
                      <img
                        src={message.imageUrl}
                        alt="Attachment"
                        className="max-h-52 max-w-xs rounded-lg object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        {typingLabel && (
          <div className="flex justify-start gap-2 text-xs">
            <div className="italic text-muted-foreground">{typingLabel}</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      <div className="space-y-3 border-t border-border bg-card p-5">
        {imageUrl && (
          <div className="relative rounded-lg border border-border bg-background/70 p-2">
            <button
              onClick={() => setImageUrl(null)}
              className="absolute right-3 top-3 rounded-full bg-background/90 p-1 hover:bg-background cursor-pointer"
            >
              <X className="size-3 text-muted-foreground" />
            </button>
            <img
              src={imageUrl}
              alt="Attached image"
              className="max-h-full rounded-lg border border-border object-cover"
            />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="w-full relative">
              <Textarea
                rows={2}
                value={input}
                onChange={handleInputChange}
                placeholder="Type a message..."
                onKeyDown={handleKeyDown}
                disabled={isSendingMessage || !isConnected}
                className="min-h-14 resize-none border-border bg-background text-sm wrap-break-word whitespace-pre-wrap pr-24"
                style={{
                  overflowWrap: "anywhere",
                }}
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
                <ImageUpload
                  onUpload={(url: string) => setImageUrl(url)}
                  hasImage={Boolean(imageUrl)}
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  className="cursor-pointer"
                  disabled={
                    isSendingMessage ||
                    (!input.trim() && !imageUrl) ||
                    !isConnected
                  }
                >
                  <SendIcon className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default ChatPanel
