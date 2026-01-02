import axios, {
  type AxiosRequestConfig,
  type AxiosError,
  type AxiosInstance,
} from "axios"

export function createBrowserApiClient(
  getToken: () => Promise<string | null>
): AxiosInstance {
  const client = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000",
    withCredentials: false,
  })

  client.interceptors.request.use(async (config) => {
    const token = await getToken()

    if (token) {
      config.headers = config.headers ?? {}
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  })

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      return Promise.reject(error)
    }
  )

  return client
}

export async function apiGet<T>(
  client: AxiosInstance,
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await client.get<{ data: T }>(url, config)
  return response.data.data
}

export async function apiPatch<TBody, TResponse>(
  client: AxiosInstance,
  url: string,
  body: TBody,
  config?: AxiosRequestConfig
): Promise<TResponse> {
  const response = await client.patch<{ data: TResponse }>(url, body, config)
  return response.data.data
}

export async function apiPost<TBody, TResponse>(
  client: AxiosInstance,
  url: string,
  body: TBody,
  config?: AxiosRequestConfig
): Promise<TResponse> {
  const response = await client.post<{ data: TResponse }>(url, body, config)
  return response.data.data
}

export async function apiDelete<TResponse, TBody = undefined>(
  client: AxiosInstance,
  url: string,
  body?: TBody,
  config?: AxiosRequestConfig
): Promise<TResponse> {
  const response = await client.delete<{ data: TResponse }>(url, {
    ...config,
    data: body,
  })

  return response.data.data
}
