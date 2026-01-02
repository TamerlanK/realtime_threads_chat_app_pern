import { NextFunction, Router, Request, Response } from "express"
import multer from "multer"
import { BadRequestError } from "../lib/errors"
import { cloudinary } from "../config/cloudinary"

export const uploadRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB file size limit
  },
})

uploadRouter.post(
  "/image",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new BadRequestError("No file uploaded")
      }

      const file = req.file

      if (!file.mimetype.startsWith("image/")) {
        throw new BadRequestError("Uploaded file is not an image")
      }

      const result = await new Promise<{
        secure_url: string
        width: number
        height: number
      }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "realtime_chat_threads_app",
          },
          (error, result) => {
            if (error || !result) {
              return reject(error ?? new Error("Upload failed"))
            }

            resolve({
              secure_url: result.secure_url,
              width: result.width,
              height: result.height,
            })
          }
        )

        uploadStream.end(file.buffer)
      })

      res.status(200).json({
        data: {
          url: result.secure_url,
          width: result.width,
          height: result.height,
        },
      })
    } catch (error) {
      next(error)
    }
  }
)
