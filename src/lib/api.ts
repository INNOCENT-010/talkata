import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json"
  }
})

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  register: (data: { email: string; password: string; full_name: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  me: () => api.get("/auth/me")
}

export const voicesAPI = {
  list: () => api.get("/generate/voices"),
  get: (id: string) => api.get(`/voices/${id}`),
  preview: (id: string) => api.get(`/voices/${id}/preview`)
}

export const generateAPI = {
  create: (data: { voice_id: string; text: string; speed?: number }) =>
    api.post("/generate/", data),
  status: (jobId: string) => api.get(`/generate/job/${jobId}`),
  history: () => api.get("/generate/history")
}

export const creditsAPI = {
  balance: () => api.get("/credits/balance"),
  plans: () => api.get("/credits/plans"),
  initialize: (planId: string) => api.post(`/credits/initialize/${planId}`),
  verify: (reference: string) => api.post("/credits/verify", { reference })
}

export default api