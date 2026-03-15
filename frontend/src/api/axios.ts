import axios, { AxiosError } from "axios"

interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

const getToken = () => {
  return (
    localStorage.getItem("token") ||
    sessionStorage.getItem("token")
  )
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true
})

api.interceptors.request.use((config) => {

  const token = getToken()

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`
    }
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {

    if (error.response?.status === 401) {

      localStorage.removeItem("token")
      localStorage.removeItem("user")

      sessionStorage.removeItem("token")
      sessionStorage.removeItem("user")

      window.location.href = "/login"
    }

    return Promise.reject(error)
  }
)