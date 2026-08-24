import { create } from "zustand"
import { authAPI } from "@/lib/api"

interface User {
  id: string
  email: string
  full_name: string
  credits: number
}

interface AuthStore {
  user: User | null
  token: string | null
  isLoading: boolean
  setToken: (token: string) => void
  setUser: (user: User) => void
  fetchUser: () => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  isLoading: false,

  setToken: (token: string) => {
    localStorage.setItem("token", token)
    set({ token })
  },

  setUser: (user: User) => set({ user }),

  fetchUser: async () => {
    set({ isLoading: true })
    try {
      const res = await authAPI.me()
      set({ user: res.data })
    } catch {
      localStorage.removeItem("token")
      set({ user: null, token: null })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: () => {
    localStorage.removeItem("token")
    set({ user: null, token: null })
    window.location.href = "/login"
  }
}))