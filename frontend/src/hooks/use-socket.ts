"use client"

import { useAuth } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import { io, type Socket } from "socket.io-client"

type UseSocketResult = {
  socket: Socket | null
  isConnected: boolean
}

export function useSocket(): UseSocketResult {
  const { userId, isLoaded } = useAuth()

  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!isLoaded) return

    if (!userId) {
      setIsConnected(false)
      setSocket((prev) => {
        if (prev) {
          prev.disconnect()
        }
        return null
      })

      return
    }

    const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

    if (!BASE_URL) {
      console.error(
        "[useSocket] -----> NEXT_PUBLIC_API_BASE_URL is not defined"
      )
      return
    }

    console.log(
      `[useSocket] -----> ${userId} Connecting to socket server...`,
      BASE_URL
    )

    const socketInstance: Socket = io(BASE_URL, {
      auth: {
        userId,
      },
      withCredentials: true,
      transports: ["websocket"],
    })

    setSocket(socketInstance)

    const handleConnect = () => {
      console.log(
        `[useSocket] -----> ${userId} Socket connected: ${socketInstance.id}`
      )
      setIsConnected(true)
    }

    const handleDisconnect = (reason: string) => {
      console.log(`[useSocket] -----> ${userId} Socket disconnected: ${reason}`)
      setIsConnected(false)
    }

    const handleConnectError = (error: Error) => {
      console.error(
        `[useSocket] -----> ${userId} Socket connection error:`,
        error
      )
    }

    socketInstance.on("connect", handleConnect)
    socketInstance.on("disconnect", handleDisconnect)
    socketInstance.on("connect_error", handleConnectError)

    return () => {
      console.log(`[useSocket] -----> ${userId} Disconnecting socket...`)
      socketInstance.off("connect", handleConnect)
      socketInstance.off("disconnect", handleDisconnect)
      socketInstance.off("connect_error", handleConnectError)
      socketInstance.disconnect()
      setIsConnected(false)
      setSocket(null)
    }
  }, [userId, isLoaded])

  return {
    socket,
    isConnected,
  }
}
