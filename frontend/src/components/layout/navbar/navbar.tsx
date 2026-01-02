"use client"

import { useNotificationCount } from "@/hooks/use-notification-count"
import { useSocket } from "@/hooks/use-socket"
import { apiGet, createBrowserApiClient } from "@/lib/api-client"
import { Notification } from "@/types/notification"
import { SignedIn, SignedOut, useAuth, UserButton } from "@clerk/nextjs"
import { Bell, Menu, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "../../ui/button"
import { NAV_ITEMS, type NavItem } from "./nav.config"

const renderNavLinks = (item: NavItem) => {
  return (
    <Link
      href={item.href}
      key={item.href}
      className="flex items-center rounded-full px-3 py-2 text-sm font-medium transition-colors bg-primary/20 shadow-sm"
    >
      {item.label}
    </Link>
  )
}

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { userId, getToken } = useAuth()
  const { socket } = useSocket()
  const { unreadCount, setUnreadCount, incrementUnreadCount } =
    useNotificationCount()

  const apiClient = useMemo(() => createBrowserApiClient(getToken), [getToken])

  useEffect(() => {
    let alive = true

    async function loadUnreadNotificationsCount() {
      if (!userId) {
        if (alive) setUnreadCount(0)
        return
      }

      try {
        const data = await apiGet<Notification[]>(
          apiClient,
          "/api/notifications?unreadonly=true"
        )

        if (!alive) return
        setUnreadCount(data.length)
      } catch (error) {
        if (!alive) return
        toast.error("Failed to load unread notifications", {
          description: "Please try again later.",
        })
      }
    }

    loadUnreadNotificationsCount()

    return () => {
      alive = false
    }
  }, [userId])

  useEffect(() => {
    if (!socket) return

    const handleNewNotification = (payload: Notification) => {
      incrementUnreadCount()
      toast.info("New Notification", {
        description:
          payload.type === "REPLY_ON_THREAD"
            ? `${
                payload.actor.displayName ?? "Someone"
              } replied to your thread.`
            : `${payload.actor.displayName ?? "Someone"} liked your thread`,
      })
    }

    socket.on("notification:new", handleNewNotification)

    return () => {
      socket.off("notification:new", handleNewNotification)
    }
  }, [socket, incrementUnreadCount])

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-sidebar-border bg-sidebar/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg text-sidebar-foreground"
          >
            <span className="bg-linear-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              Ace
            </span>
            <span className="text-foreground/90">Forum</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map(renderNavLinks)}
          </nav>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <SignedIn>
            <Button
              size="icon"
              variant="outline"
              className="relative size-9 text-muted-foreground hover:bg-card/10 hover:text-foreground cursor-pointer"
              aria-label="Notifications"
              asChild
            >
              <Link href="/notifications">
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span
                    className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm shadow-primary/40"
                    aria-label={`${unreadCount} unread notifications`}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            </Button>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <Link href="/sign-in">
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/90 cursor-pointer"
              >
                Sign In
              </Button>
            </Link>
          </SignedOut>
          <Button
            size="icon"
            onClick={toggleMobileMenu}
            variant="outline"
            className="relative size-9 text-muted-foreground hover:bg-card/10 hover:text-foreground rounded-full cursor-pointer md:hidden"
          >
            {mobileMenuOpen ? (
              <X className="size-4" />
            ) : (
              <Menu className="size-4" />
            )}
          </Button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="border-t border-sidebar-border bg-sidebar/90 md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 pb-4 pt-2">
            {NAV_ITEMS.map(renderNavLinks)}
          </nav>
        </div>
      )}
    </header>
  )
}

export default Navbar
