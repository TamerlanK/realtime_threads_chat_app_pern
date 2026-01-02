export type Category = {
  id: number
  slug: string
  name: string
  description: string | null
}

export type CategoryRow = {
  id: number
  slug: string
  name: string
  description: string | null
}

export type ThreadDetail = {
  id: number
  title: string
  body: string
  createdAt: Date
  updatedAt: Date
  category: {
    slug: string
    name: string
  }
  author: {
    displayName: string | null
    handle: string | null
  }
}

export type ThreadDetailRow = {
  id: number
  title: string
  body: string
  created_at: Date
  updated_at: Date
  category_slug: string
  category_name: string
  author_display_name: string | null
  author_handle: string | null
}

export type ThreadsFilter = {
  page: number
  pageSize: number
  categorySlug?: string
  search?: string
  sort: "newest" | "oldest"
}
export type ThreadSummary = {
  id: number
  title: string
  excerpt: string
  createdAt: Date
  category: {
    slug: string
    name: string
  }
  author: {
    displayName: string | null
    handle: string | null
  }
}

export type ThreadSummaryRow = {
  id: number
  title: string
  excerpt: string
  created_at: Date
  category_slug: string
  category_name: string
  author_display_name: string | null
  author_handle: string | null
}

export function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
  }
}

export function mapThreadDetailRow(row: ThreadDetailRow): ThreadDetail {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: {
      slug: row.category_slug,
      name: row.category_name,
    },
    author: {
      displayName: row.author_display_name,
      handle: row.author_handle,
    },
  }
}

export function mapThreadSummaryRow(row: ThreadSummaryRow): ThreadSummary {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    createdAt: row.created_at,
    category: {
      slug: row.category_slug,
      name: row.category_name,
    },
    author: {
      displayName: row.author_display_name,
      handle: row.author_handle,
    },
  }
}
