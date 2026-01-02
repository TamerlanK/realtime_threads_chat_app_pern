import http from "node:http"
import { createApp } from "./app"
import { env } from "./config/env"
import { assertDatabaseConnection } from "./db/db"
import { logger } from "./lib/logger"
import { initIO } from "./realtime/io"

async function bootstrap() {
  try {
    await assertDatabaseConnection()

    const app = createApp()
    const server = http.createServer(app)

    const PORT = Number(env.PORT) || 5000

    initIO(server)

    server.listen(PORT, () => {
      logger.info(`Server is running on http://localhost:${PORT}`)
    })
  } catch (error) {
    logger.error("Failed to start the server:", error)
    process.exit(1)
  }
}

bootstrap()
