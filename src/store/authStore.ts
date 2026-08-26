import { create } from "zustand"
import { authAPI } from "@/lib/api"

interface User {
  id: string
  email: string
  full_name: string
  credits: number
  is_admin?: boolean
}

interface AuthStore {
  user: User | null
  token: string | null
  isLoading: boolean
  setToken: (token: string) => void
  setUser: (user: User) => void
  fetchUser: () => Promise<void>
  logout: () => void
  checkTokenExpiry: () => boolean
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  isLoading: false,

  checkTokenExpiry: () => {
    const token = get().token
    if (!token) return false
    if (isTokenExpired(token)) {
      get().logout()
      return false
    }
    return true
  },

  setToken: (token: string) => {
    localStorage.setItem("token", token)
    localStorage.setItem("token_set_at", Date.now().toString())
    set({ token })
  },

  setUser: (user: User) => set({ user }),

  fetchUser: async () => {
    const token = get().token
    if (!token || isTokenExpired(token)) {
      get().logout()
      return
    }
    set({ isLoading: true })
    try {
      const res = await authAPI.me()
      set({ user: res.data })
    } catch {
      get().logout()
    } finally {
      set({ isLoading: false })
    }
  },

  logout: () => {
    localStorage.removeItem("token")
    localStorage.removeItem("token_set_at")
    set({ user: null, token: null })
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
  }
}))