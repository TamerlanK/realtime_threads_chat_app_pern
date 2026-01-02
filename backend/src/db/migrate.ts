import path from "path"
import fs from "node:fs"

import { logger } from "../lib/logger"
import { query } from "./db"

const migrateDir = path.resolve(process.cwd(), "src", "migrations")

async function runMigrations() {
  logger.info(`Running migrations from directory: ${migrateDir}`)

  const files = fs
    .readdirSync(migrateDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()

  if (files.length === 0) {
    logger.info("No migration files found.")
    return
  }

  for (const file of files) {
    const fullPath = path.join(migrateDir, file)
    const sql = fs.readFileSync(fullPath, "utf-8")

    logger.info(`Applying migration: ${file}`)

    await query(sql)

    logger.info(`Successfully applied migration: ${file}`)
  }
}

runMigrations()
  .then(() => {
    logger.info("All migrations applied successfully.")
    process.exit(0)
  })
  .catch((error) => {
    logger.error("Error applying migrations:", error)
    process.exit(1)
  })
