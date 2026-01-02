import { Router } from "express"
import { userRouter } from "./user.routes"
import { threadsRouter } from "./threads.routes"
import { notificationsRouter } from "./notifications.routes"
import { chatRouter } from "./chat.routes"
import { uploadRouter } from "./upload.routes"

export const apiRouter = Router()

apiRouter.use("/me", userRouter)
apiRouter.use("/threads", threadsRouter)
apiRouter.use("/notifications", notificationsRouter)
apiRouter.use("/chat", chatRouter)
apiRouter.use("/upload", uploadRouter)
