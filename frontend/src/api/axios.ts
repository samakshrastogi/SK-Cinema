import axios, { AxiosHeaders } from "axios"

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

let inMemoryToken: string | null = null

export const setAuthToken = (token: string | null) => {
  inMemoryToken = token
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common.Authorization
  }
}

// Initialize once from storage on app boot
setAuthToken(getToken())

api.interceptors.request.use((config) => {
  const token = inMemoryToken || getToken()

  if (token) {
    const headers = new AxiosHeaders(config.headers)
    headers.set("Authorization", `Bearer ${token}`)
    config.headers = headers
  }

  return config
})
