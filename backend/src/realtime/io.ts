import { Server } from "socket.io"
import { Server as HttpServer } from "http"
import { logger } from "../lib/logger"
import { getUserFromClerk } from "../modules/users/user.service"
import { SocketData } from "./socket.types"
import { createDirectMessage } from "../modules/chat/chat.service"

let io: Server | null = null

const onlineUsers = new Map<number, Set<string>>()

function addOnlineUser(rawUserId: unknown, socketId: string) {
  const userId = Number(rawUserId)
  if (!Number.isFinite(userId) || userId <= 0) return

  const existingUserSockets = onlineUsers.get(userId)

  if (existingUserSockets) {
    existingUserSockets.add(socketId)
  } else {
    onlineUsers.set(userId, new Set([socketId]))
  }
}

function removeOnlineUser(rawUserId: unknown, socketId: string) {
  const userId = Number(rawUserId)
  if (!Number.isFinite(userId) || userId <= 0) return

  const existingUserSockets = onlineUsers.get(userId)

  if (!existingUserSockets) return

  existingUserSockets.delete(socketId)

  if (existingUserSockets.size === 0) {
    onlineUsers.delete(userId)
  }
}

function broadcastPresence() {
  if (!io) return

  io?.emit("presence:update", {
    onlineUserIds: Array.from(onlineUsers.keys()),
  })
}

export function initIO(httpServer: HttpServer) {
  if (io) return io

  io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
    },
  })

  io.on("connection", async (socket) => {
    logger.info(`[IO] -----> New client connected: ${socket.id}`)

    try {
      const clerkUserId = socket.handshake.auth?.userId

      if (!clerkUserId || typeof clerkUserId !== "string") {
        logger.info(
          `[IO] -----> Missing or invalid userId in handshake auth for socket: ${socket.id}`
        )
        socket.disconnect(true)
        return
      }

      const profile = await getUserFromClerk(clerkUserId)

      const rawUserId = profile.user.id
      const userId = Number(rawUserId)

      const displayName = profile.user.displayName ?? null
      const handle = profile.user.handle ?? null

      if (!Number.isFinite(userId) || userId <= 0) {
        logger.info(
          `[IO] -----> Invalid userId from Clerk for socket: ${socket.id}`
        )
        socket.disconnect(true)
        return
      }

      const data = socket.data as SocketData
      data.userId = userId
      data.displayName = displayName
      data.handle = handle

      const notificationRoom = `notifications:user:${userId}`
      socket.join(notificationRoom)

      const chatRoom = `chat:user:${userId}`
      socket.join(chatRoom)

      socket.on("chat:send", async (payload: unknown) => {
        try {
          const data = payload as {
            recipientUserId?: number
            body?: string | null
            imageUrl?: string | null
          }

          const senderUserId = (socket.data as SocketData).userId

          if (!senderUserId) return

          const recipientUserId = Number(data?.recipientUserId)
          if (!Number.isFinite(recipientUserId) || recipientUserId <= 0) return

          if (senderUserId === recipientUserId) return

          const message = await createDirectMessage({
            senderUserId,
            recipientUserId,
            body: data?.body ?? null,
            imageUrl: data?.imageUrl ?? null,
          })

          const senderRoom = `chat:user:${senderUserId}`
          const recipientRoom = `chat:user:${recipientUserId}`

          io?.to(senderRoom).to(recipientRoom).emit("chat:message", message)
        } catch (error) {
          logger.error(
            `[IO] -----> Error handling chat:send from socket: ${socket.id}`,
            error
          )
        }
      })

      socket.on("chat:typing", (payload: unknown) => {
        const data = payload as {
          recipientUserId?: number
          isTyping?: boolean
        }

        const senderUserId = (socket.data as SocketData).userId
        if (!senderUserId) return

        const recipientUserId = Number(data?.recipientUserId)
        if (!Number.isFinite(recipientUserId) || recipientUserId <= 0) return

        const recipientRoom = `chat:user:${recipientUserId}`
        io?.to(recipientRoom).emit("chat:typing", {
          senderUserId,
          recipientUserId,
          isTyping: Boolean(data?.isTyping),
        })
      })

      // socket.on("disconnect", () => {
      //   {
      //     logger.info(`[IO] -----> Client disconnected: ${socket.id}`)
      //     removeOnlineUser(rawUserId, socket.id)
      //     broadcastPresence()
      //   }
      // })

      addOnlineUser(userId, socket.id)
      broadcastPresence()
    } catch (error) {
      logger.error(
        `[IO] -----> Error during connection setup for socket: ${socket.id}`,
        error
      )
      socket.disconnect(true)
    }
  })
}

export function getIO() {
  return io
}
