import { Pool, QueryResult, QueryResultRow } from "pg"
import { env } from "../config/env"
import { logger } from "../lib/logger"

export const pool = new Pool({
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
})

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return await pool.query<T>(text, params)
}

export async function assertDatabaseConnection(): Promise<void> {
  try {
    await pool.query("SELECT 1;")
    logger.info("Database connection established successfully.")
  } catch (error) {
    throw error
  }
}
