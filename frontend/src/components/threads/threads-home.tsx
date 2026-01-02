"use client"

import { apiGet, createBrowserApiClient } from "@/lib/api-client"
import { Category, ThreadSummary } from "@/types/thread"
import { useAuth } from "@clerk/nextjs"
import { Plus, Search, X } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Input } from "../ui/input"

function getCategoryClasses(isActive: boolean) {
  return [
    "flex w-full items-center rounded-md p-3 text-sm font-medium transition-colors cursor-pointer",
    isActive
      ? "bg-secondary text-foreground"
      : "text-muted-foreground hover:bg-card/80 hover:text-foreground",
  ].join(" ")
}

function ThreadsHomePage() {
  const { getToken } = useAuth()

  const router = useRouter()
  const searchParams = useSearchParams()

  const apiClient = useMemo(() => createBrowserApiClient(getToken), [getToken])

  const [categories, setCategories] = useState<Category[]>([])
  const [threads, setThreads] = useState<ThreadSummary[]>([])

  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isFiltering, setIsFiltering] = useState(false)
  const [search, setSearch] = useState(searchParams.get("q") ?? "")
  const [activeCategory, setActiveCategory] = useState(
    searchParams.get("category") ?? "all"
  )

  useEffect(() => {
    const controller = new AbortController()

    async function loadThreadsData() {
      setIsInitialLoading(true)
      try {
        const [apiCategories, apiThreads] = await Promise.all([
          apiGet<Category[]>(apiClient, "/api/threads/categories", {
            signal: controller.signal,
          }),
          apiGet<ThreadSummary[]>(apiClient, "/api/threads", {
            signal: controller.signal,
            params: {
              category:
                activeCategory && activeCategory !== "all"
                  ? activeCategory
                  : undefined,
              q: search.trim() !== "" ? search.trim() : undefined,
            },
          }),
        ])
        setCategories(apiCategories)
        setThreads(apiThreads)
      } catch (error) {
        if (controller.signal.aborted) return

        toast.error("Failed to load threads.", {
          description: "Please try again later.",
        })
      } finally {
        setIsInitialLoading(false)
      }
    }

    loadThreadsData()

    return () => {
      controller.abort()
    }
  }, [apiClient])

  useEffect(() => {
    setActiveCategory(searchParams.get("category") ?? "all")
    setSearch(searchParams.get("q") ?? "")
  }, [searchParams])

  async function applyFilters(currentCategory: string, currentSearch: string) {
    const params = new URLSearchParams()

    if (currentCategory && currentCategory !== "all") {
      params.append("category", currentCategory)
    }

    if (currentSearch.trim() !== "") {
      params.append("q", currentSearch.trim())
    }

    router.push(`?${params.toString()}`)

    setIsFiltering(true)

    try {
      const filteredThreads = await apiGet<ThreadSummary[]>(
        apiClient,
        "/api/threads",
        {
          params: {
            category:
              currentCategory && currentCategory !== "all"
                ? currentCategory
                : undefined,
            q: currentSearch.trim() !== "" ? currentSearch.trim() : undefined,
          },
        }
      )
      setThreads(filteredThreads)
    } catch (error) {
      toast.error("Failed to load threads.", {
        description: "Please try again later.",
      })
    } finally {
      setIsFiltering(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-72">
        <Card className="sticky top-24 border-sidebar-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Categories</CardTitle>
              <Button asChild size="icon">
                <Link href="/threads/new">
                  <Plus className="size-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              className={getCategoryClasses(activeCategory === "all")}
              onClick={() => {
                setActiveCategory("all")
                applyFilters("all", search)
              }}
            >
              All Categories
            </button>
            {isInitialLoading && (
              <div className="flex items-center justify-center rounded-lg border border-border bg-card py-10">
                <p className="text-sm text-muted-foreground">
                  Loading Categories...
                </p>
              </div>
            )}
            {categories.map((category) => (
              <button
                key={category.slug}
                className={getCategoryClasses(activeCategory === category.slug)}
                onClick={() => {
                  setActiveCategory(category.slug)
                  applyFilters(category.slug, search)
                }}
                disabled={isFiltering}
              >
                {category.name}
              </button>
            ))}
          </CardContent>
        </Card>
      </aside>
      <div className="flex-1 space-y-6">
        <Card className="border-border/70 bg-card/95">
          <CardHeader className="pb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Latest Threads
            </CardTitle>
            <Button asChild className="w-full md:w-auto">
              <Link href="/threads/new">
                <Plus className="size-4" />
                New Thread
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    disabled={isFiltering}
                    className="pl-10 pr-10 bg-secondary/80 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                    placeholder="Search Threads..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        applyFilters(activeCategory, search)
                      }
                    }}
                  />

                  {search && (
                    <button
                      type="button"
                      disabled={isFiltering}
                      onClick={() => {
                        setSearch("")
                        applyFilters(activeCategory, "")
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4 cursor-pointer" />
                    </button>
                  )}
                </div>

                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                  onClick={() => applyFilters(activeCategory, search)}
                >
                  Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {isInitialLoading && (
            <div className="flex items-center justify-center rounded-lg border border-border bg-card py-10">
              <p className="text-sm text-muted-foreground">
                Loading Threads...
              </p>
            </div>
          )}
          {!isInitialLoading && threads.length === 0 && !isFiltering && (
            <Card className="border-dashed border-border bg-card">
              <CardContent className="py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  There are no threads yet. Be the first to create one!
                </p>
              </CardContent>
            </Card>
          )}
          {!isInitialLoading &&
            threads.map((thread) => (
              <Card
                key={thread.id}
                className="group cursor-pointer border-border/70 bg-card transition-colors duration-150 hover:border-primary/90 hover:bg-card/90"
              >
                <Link href={`/threads/${thread.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge
                            variant="outline"
                            className="border-border/70 bg-secondary/70 text-xs"
                          >
                            {thread.category.name || "Uncategorized"}
                          </Badge>
                          {thread?.author?.handle && (
                            <span className="text-muted-foreground/90">
                              by @{thread?.author?.handle}
                            </span>
                          )}
                          <span className="text-muted-foreground/85">
                            {new Date(thread.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary">
                          {thread?.title || "Untitled Thread"}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-4">
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {thread.excerpt || "No description available."}
                    </p>
                  </CardContent>
                </Link>
              </Card>
            ))}
        </div>
      </div>
    </div>
  )
}

export default ThreadsHomePage
