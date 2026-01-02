export type Category = {
  id: number
  slug: string
  name: string
  description: string | null
  sortOrder: number
}

export type ThreadDetail = {
  id: number
  title: string
  body: string
  category: {
    slug: string
    name: string
  }
  author: {
    displayName: string | null
    handle: string | null
  }
  createdAt: string
  updatedAt: string
  likeCount: number
  replyCount: number
  viewerHasLiked: boolean
}

export type ThreadSummary = {
  id: number
  title: string
  excerpt: string
  createdAt: string
  category: {
    slug: string
    name: string
  }
  author: {
    displayName: string | null
    handle: string | null
  }
}

export type Comment = {
  id: number
  body: string
  createdAt: string
  author: {
    displayName: string | null
    handle: string | null
  }
}

export type MeResponse = {
  id: number
  handle: string | null
}
