"use client"

import { apiPost, createBrowserApiClient } from "@/lib/api-client"
import { useAuth } from "@clerk/nextjs"
import { useMemo, useRef, useState } from "react"
import { Button } from "../ui/button"
import { ImageIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"

type Props = {
  onUpload: (imageUrl: string) => void
  onRemove?: () => void
  hasImage?: boolean
}

const ImageUpload = ({ onUpload }: Props) => {
  const { getToken } = useAuth()
  const apiClient = useMemo(() => createBrowserApiClient(getToken), [getToken])

  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await apiPost<FormData, { url: string }>(
        apiClient,
        "/api/upload/image",
        formData
      )
      if (!response?.url) throw new Error()

      onUpload(response.url)

      toast.success("Image uploaded successfully", {
        description: "You can now send the image in the chat.",
      })
    } catch (error) {
      toast.error("Failed to upload image", {
        description: "Please try again later.",
      })
    } finally {
      setUploading(false)

      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  return (
    <div>
      <input
        type="file"
        ref={inputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <Button
        size="icon"
        variant="ghost"
        type="button"
        onClick={handleClick}
        disabled={uploading}
        className="border-border/40 bg-card/60 text-muted-foreground hover:bg-card/90 hover:text-foreground"
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ImageIcon className="size-4" />
        )}
      </Button>
    </div>
  )
}

export default ImageUpload
