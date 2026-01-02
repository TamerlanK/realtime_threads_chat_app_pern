"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { apiGet, apiPost, createBrowserApiClient } from "@/lib/api-client"

import { Category, ThreadDetail } from "@/types/thread"
import { useAuth } from "@clerk/nextjs"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

const NewThreadSchema = z.object({
  title: z
    .string()
    .min(5, `Title must be at least 5 characters`)
    .max(200, `Title must be at most 200 characters`),
  body: z
    .string()
    .min(10, `Body must be at least 10 characters`)
    .max(5000, `Body must be at most 5000 characters`),
  categorySlug: z.string().min(1, `Category is required`),
})

type NewThreadFormData = z.infer<typeof NewThreadSchema>

function NewThreadPage() {
  const { getToken } = useAuth()

  const router = useRouter()

  const apiClient = useMemo(() => createBrowserApiClient(getToken), [getToken])

  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)

  const form = useForm<NewThreadFormData>({
    resolver: zodResolver(NewThreadSchema),
    defaultValues: {
      title: "",
      body: "",
      categorySlug: "",
    },
  })

  useEffect(() => {
    const controller = new AbortController()

    async function loadCategories() {
      setIsLoadingCategories(true)

      try {
        const categories = await apiGet<Category[]>(
          apiClient,
          "/api/threads/categories",
          {
            signal: controller.signal,
          }
        )

        setCategories(categories)

        if (categories.length > 0 && !form.getValues("categorySlug")) {
          form.setValue("categorySlug", categories[0]?.slug)
        }
      } catch (error) {
        toast.error("Failed to load categories.")
      } finally {
        setIsLoadingCategories(false)
      }
    }

    loadCategories()

    return () => controller.abort()
  }, [apiClient, form])

  async function onThreadSubmit(data: NewThreadFormData) {
    try {
      const createdThread = await apiPost<NewThreadFormData, ThreadDetail>(
        apiClient,
        "/api/threads",
        data
      )

      toast.success("Thread created successfully!", {
        description: "You have successfully created a new thread.",
      })
      router.push(`/threads/${createdThread.id}`)
    } catch (error) {
      toast.error("Failed to create thread.")
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="space-y-2 ">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Start a New Thread
        </h1>
      </div>
      <Card className="border-border/70 bg-card">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">
            Thread Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-6"
            onSubmit={form.handleSubmit(onThreadSubmit)}
          >
            <div className="flex flex-col gap-3">
              <label
                className="text-sm font-semibold text-foreground"
                htmlFor="title"
              >
                Thread Title
              </label>
              <Input
                id="title"
                placeholder="Enter the thread title"
                {...form.register("title")}
                disabled={form.formState.isSubmitting || isLoadingCategories}
                className="border-border bg-background/70 text-sm"
              />
            </div>
            <div className="flex flex-col gap-3">
              <label
                className="text-sm font-semibold text-foreground"
                htmlFor="title"
              >
                Category
              </label>
              <select
                id="categorySlug"
                className="h-10 w-full rounded-md border border-border bg-background/70 px-3 text-sm text-foreground focus:outline focus:ring-2 focus:ring-primary/30 "
                {...form.register("categorySlug")}
                disabled={form.formState.isSubmitting || isLoadingCategories}
              >
                {categories.map((category) => (
                  <option
                    key={category.id}
                    id={category.slug}
                    value={category.slug}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-3">
              <label
                className="text-sm font-semibold text-foreground"
                htmlFor="body"
              >
                Description
              </label>
              <Textarea
                id="body"
                rows={10}
                placeholder="Enter the thread description"
                {...form.register("body")}
                disabled={form.formState.isSubmitting || isLoadingCategories}
                className="border-border bg-background/70 text-sm"
              />
            </div>
            <CardFooter className="p-0 flex justify-end border-t border-border">
              <Button
                className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                type="submit"
                disabled={form.formState.isSubmitting || isLoadingCategories}
              >
                {form.formState.isSubmitting
                  ? "Creating Thread..."
                  : "Create Thread"}
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default NewThreadPage
