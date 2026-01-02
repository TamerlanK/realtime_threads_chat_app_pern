"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  apiDelete,
  apiGet,
  apiPost,
  createBrowserApiClient,
} from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { Comment, MeResponse, ThreadDetail } from "@/types/thread"
import { useAuth } from "@clerk/nextjs"
import { ArrowLeft, MessageCircle, ThumbsUp, TrashIcon } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

function ThreadDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = Number(params.id)

  const router = useRouter()

  const { getToken, userId } = useAuth()
  const apiClient = useMemo(() => createBrowserApiClient(getToken), [getToken])

  const [thread, setThread] = useState<ThreadDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [handle, setHandle] = useState<string | null>(null)

  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [deletingComment, setDeletingComment] = useState<number | null>(null)

  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isTogglingLike, setIsTogglingLike] = useState(false)

  useEffect(() => {
    let alive = true

    async function loadThread() {
      setIsLoading(true)

      try {
        const [threadResponse, commentsResponse] = await Promise.all([
          apiGet<ThreadDetail>(apiClient, `/api/threads/${id}`),
          apiGet<Comment[]>(apiClient, `/api/threads/${id}/replies`),
        ])

        if (!alive) return

        setThread(threadResponse)
        setLikeCount(threadResponse.likeCount)
        setIsLiked(threadResponse.viewerHasLiked)
        setComments(commentsResponse)

        if (userId) {
          const me = await apiGet<MeResponse>(apiClient, `/api/me`)
          if (!alive) return
          setHandle(me.handle)
        }
      } catch {
        if (!alive) return
        toast.error("Failed to load thread.", {
          description: "Please try again later.",
        })
      } finally {
        if (alive) setIsLoading(false)
      }
    }

    if (Number.isFinite(id)) {
      loadThread()
    }

    return () => {
      alive = false
    }
  }, [apiClient, userId, id])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center jusify-center px-4 py-10">
        <p className="text-sm text-muted-foreground">Loading thread...</p>
      </div>
    )
  }

  if (!thread) {
    return (
      <div className="flex flex-col items-center jusify-center px-4 py-10">
        <p className="text-sm text-muted-foreground">
          Thread not found or has been deleted.
        </p>
      </div>
    )
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault()

    const trimmedComment = newComment.trim()
    if (trimmedComment.length < 2 || isSubmittingComment) return

    if (!userId) {
      toast.error("You must be logged in to submit a comment.", {
        description: "Please log in and try again.",
      })
      return
    }

    setIsSubmittingComment(true)

    try {
      const createdComment: Comment = await apiPost(
        apiClient,
        `/api/threads/${id}/replies`,
        {
          body: trimmedComment,
        }
      )

      setComments((prevComments) => [createdComment, ...prevComments])
      setNewComment("")

      toast.success("Comment submitted successfully.", {
        description: "Your comment has been added to the thread.",
      })
    } catch (error) {
      toast.error("Failed to submit comment.", {
        description: "Please try again later.",
      })
    } finally {
      setIsSubmittingComment(false)
    }
  }

  async function handleDeleteComment(commentId: number) {
    if (deletingComment === commentId) return

    if (!userId) {
      toast.error("You must be logged in to delete a comment.", {
        description: "Please log in and try again.",
      })
      return
    }

    try {
      setDeletingComment(commentId)
      await apiDelete<void>(
        apiClient,
        `/api/threads/replies/${commentId}`
      )
      setComments((prevComments) =>
        prevComments.filter((comment) => comment.id !== commentId)
      )
      toast.success("Comment deleted successfully.", {
        description: "Your comment has been removed from the thread.",
      })
    } catch (error) {
      toast.error("Failed to delete comment.", {
        description: "Please try again later.",
      })
    } finally {
      setDeletingComment(null)
    }
  }

  async function handleToggleLike() {
    if (isTogglingLike || !thread) return

    if (!userId) {
      toast.error("You must be logged in to like a thread.", {
        description: "Please log in and try again.",
      })
      return
    }

    try {
      setIsTogglingLike(true)
      if (isLiked) {
        await apiDelete<void>(apiClient, `/api/threads/${id}/likes`)
        setIsLiked(false)
        setLikeCount((count) => Math.max(0, count - 1))
        toast.success("Like removed.", {
          description: "You have unliked this thread.",
        })
      } else {
        await apiPost<undefined, void>(
          apiClient,
          `/api/threads/${id}/likes`,
          undefined
        )
        setIsLiked(true)
        setLikeCount((count) => count + 1)
        toast.success("Thread liked.", {
          description: "You have liked this thread.",
        })
      }
    } catch (error) {
      toast.error("Failed to toggle like.", {
        description: "Please try again later.",
      })
    } finally {
      setIsTogglingLike(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <Button
        className="cursor-pointer w-fit rounded-full border border-border/70 bg-card/70 px-3 text-xs font-medium text-muted-foreground"
        variant="ghost"
        onClick={() => router.push("/")}
      >
        <ArrowLeft className="mr-2 size-4" />
        Back to Threads
      </Button>
      <Card className="border-border/70 bg-card">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge
                  variant="outline"
                  className="border-border/70 bg-secondary/70 text-xs"
                >
                  {thread.category.name}
                </Badge>
                {thread.author.handle && (
                  <span className="font-bold text-muted-foreground">
                    Posted by @{thread.author.handle}
                  </span>
                )}
                <span className="text-muted-foreground">
                  {new Date(thread.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                {thread?.title}
              </h1>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 md:flex-col md:items-stretch">
              {userId && (
                <Button
                  size="sm"
                  variant={isLiked ? "default" : "outline"}
                  disabled={isTogglingLike}
                  className={cn("cursor-pointer", {
                    "bg-primary text-primary-foreground hover:bg-primary/95":
                      isLiked,
                    "border-border/70 bg-card hover:bg-accent/60": !isLiked,
                    "opacity-70": isTogglingLike,
                  })}
                  onClick={handleToggleLike}
                >
                  <ThumbsUp className="mr-2 size-4" />
                  {isTogglingLike ? "..." : likeCount}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {thread.body}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border/70 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageCircle className="size-5 text-primary" />
            Comments ({comments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {comments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No comments yet. Be the first to comment on this thread!
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => {
                const isAuthor =
                  !!comment.author.handle &&
                  !!handle &&
                  comment.author.handle === handle

                return (
                  <div
                    key={comment.id}
                    className="rounded-lg border border-border/80 bg-background/70 p-5"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        {comment.author.handle && (
                          <span className="text-sm font-medium text-foreground">
                            @{comment.author.handle}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {isAuthor && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                              disabled={deletingComment === comment.id}
                            >
                              <TrashIcon className="size-5" />
                            </Button>
                          </AlertDialogTrigger>

                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete comment?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. The comment will
                                be permanently removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter>
                              <AlertDialogCancel className="cursor-pointer">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
                                onClick={() => handleDeleteComment(comment.id)}
                              >
                                {deletingComment === comment.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {comment.body}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          <form
            className="space-y-3 border-t border-border pt-6 flex flex-col"
            onSubmit={handleAddComment}
          >
            <label className="block text-sm font-semibold text-foreground">
              Add a Comment
            </label>
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={5}
              placeholder="Write your comment here..."
              disabled={!userId || isSubmittingComment}
              className="border-border bg-background/70 text-sm"
            />
            <Button
              disabled={!newComment.trim() || isSubmittingComment || !userId}
              className="bg-primary text-primary-foreground hover:bg-primary/95 ml-auto cursor-pointer"
            >
              {isSubmittingComment ? "Submitting..." : "Submit Comment"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ThreadDetailsPage
