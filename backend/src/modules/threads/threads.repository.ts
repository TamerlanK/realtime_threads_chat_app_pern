import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "../../config/pagination"
import { query } from "../../db/db"
import { BadRequestError, NotFoundError } from "../../lib/errors"
import { normalizeOptionalString } from "../../utils/string"
import {
  type Category,
  type CategoryRow,
  type ThreadDetail,
  ThreadDetailRow,
  ThreadSummary,
  ThreadSummaryRow,
  ThreadsFilter,
  mapCategoryRow,
  mapThreadDetailRow,
  mapThreadSummaryRow,
} from "./threads.types"

export function parseThreadsFilter(queryObj: {
  page?: unknown
  pageSize?: unknown
  category?: unknown
  q?: unknown
  sort?: unknown
}): ThreadsFilter {
  const page = Number(queryObj.page ?? DEFAULT_PAGE)
  const rawPageSize = Number(queryObj.pageSize)

  const pageSize = Math.min(
    Math.max(rawPageSize || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  )

  const categorySlug = normalizeOptionalString(
    typeof queryObj.category === "string" ? queryObj.category : undefined
  )

  const search = normalizeOptionalString(
    typeof queryObj.q === "string" ? queryObj.q : undefined
  )

  const sort: ThreadsFilter["sort"] =
    queryObj.sort === "oldest" ? "oldest" : "newest"

  return {
    page,
    pageSize,
    categorySlug,
    search,
    sort,
  }
}

export async function findAllCategories(): Promise<Category[]> {
  const result = await query<CategoryRow>(
    `
        SELECT id, slug, name, description
        from categories
        ORDER BY name ASC
    `
  )

  return result.rows.map(mapCategoryRow)
}

export async function insertThread(params: {
  categorySlug: string
  authorUserId: number
  title: string
  body: string
}): Promise<ThreadDetail> {
  const { categorySlug, authorUserId, title, body } = params

  const categoryResponse = await query<{ id: number }>(
    `
        SELECT id
        FROM categories
        WHERE slug = $1
        LIMIT 1
    `,
    [categorySlug]
  )

  if (categoryResponse.rows.length === 0) {
    throw new BadRequestError("Invalid category")
  }

  const categoryId = categoryResponse.rows[0].id

  const insertResponse = await query<ThreadDetail>(
    `
        INSERT INTO threads (category_id, author_user_id, title, body)
        VALUES ($1, $2, $3, $4)
        RETURNING
            id
    `,
    [categoryId, authorUserId, title, body]
  )

  const newThreadId = insertResponse.rows[0].id

  return getThreadById(newThreadId)
}

export async function getThreadById(threadId: number): Promise<ThreadDetail> {
  const result = await query<ThreadDetailRow>(
    `
        SELECT
            t.id,
            t.title,
            t.body,
            t.created_at,
            t.updated_at,
            c.slug AS category_slug,
            c.name AS category_name,
            u.display_name AS author_display_name,
            u.handle AS author_handle
        FROM threads t
        JOIN categories c ON t.category_id = c.id
        JOIN users u ON t.author_user_id = u.id
        WHERE t.id = $1
        LIMIT 1
    `,
    [threadId]
  )

  const row = result.rows[0]

  if (!row) {
    throw new NotFoundError("Thread not found")
  }

  return mapThreadDetailRow(row)
}

export async function findAllThreads(
  filter: ThreadsFilter
): Promise<ThreadSummary[]> {
  const { page, pageSize, categorySlug, sort, search } = filter

  const whereClauses: string[] = []
  const params: unknown[] = []

  let idx = 1

  if (categorySlug) {
    whereClauses.push(`c.slug = $${idx++}`)
    params.push(categorySlug)
  }

  if (search) {
    whereClauses.push(`(t.title ILIKE $${idx} OR t.body ILIKE $${idx})`)
    params.push(`%${search}%`)
    idx++
  }

  const whereSQL = whereClauses.length
    ? `WHERE ${whereClauses.join(" AND ")}`
    : ""

  const orderSQL =
    sort === "oldest"
      ? "ORDER BY t.created_at ASC"
      : "ORDER BY t.created_at DESC"

  const offset = (page - 1) * pageSize
  params.push(pageSize, offset)

  const result = await query<ThreadSummaryRow>(
    `
      SELECT
        t.id,
        t.title,
        LEFT(t.body, 200) AS excerpt,
        t.created_at,
        c.slug AS category_slug,
        c.name AS category_name,
        u.display_name AS author_display_name,
        u.handle AS author_handle
      FROM threads t
      JOIN categories c ON t.category_id = c.id
      JOIN users u ON t.author_user_id = u.id
        ${whereSQL}
        ${orderSQL}
        LIMIT $${idx++} OFFSET $${idx}
    `,
    params
  )

  return result.rows.map(mapThreadSummaryRow)
}
