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

api.interceptors.request.use((config) => {

  const token = getToken()

  if (token) {
    const headers = new AxiosHeaders(config.headers)
    headers.set("Authorization", `Bearer ${token}`)
    config.headers = headers
  }

  return config
})

api.interceptors.request.use((config) => {

  const token = getToken()

  console.log("TOKEN BEING SENT:", token) // ✅ ADD HERE

  if (token) {
    const headers = new AxiosHeaders(config.headers)
    headers.set("Authorization", `Bearer ${token}`)
    config.headers = headers
  }

  return config
})