import { create } from "zustand"
import { isAxiosError } from "axios"
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
  initialize: () => void
  setToken: (token: string) => void
  setUser: (user: User) => void
  fetchUser: (force?: boolean) => Promise<void>
  logout: () => void
  checkTokenExpiry: () => boolean
}

const PROFILE_CACHE = "talkata_profile"
let pending: { token: string; promise: Promise<void> } | null = null
let lastFetched = 0

function tokenSubject(token: string): string | null {
  try {
    const raw = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    const payload = JSON.parse(atob(raw))
    return typeof payload.sub === "string" && Number.isFinite(payload.exp) && payload.exp * 1000 > Date.now() ? payload.sub : null
  } catch { return null }
}

// Cached profile data is for display only. The API enforces permissions and credits.
function cacheUser(user: User | null) {
  try {
    if (user) sessionStorage.setItem(PROFILE_CACHE, JSON.stringify(user))
    else sessionStorage.removeItem(PROFILE_CACHE)
  } catch { /* Session storage can be unavailable in private browsing. */ }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  initialize: () => {
    if (typeof window === "undefined") return
    const token = localStorage.getItem("token")
    const subject = token && tokenSubject(token)
    if (!subject) {
      localStorage.removeItem("token")
      cacheUser(null)
      set({ token: null, user: null })
      return
    }
    if (get().token === token) return
    let user: User | null = null
    try {
      const cached = JSON.parse(sessionStorage.getItem(PROFILE_CACHE) || "null")
      if (cached?.id === subject && typeof cached.email === "string" && typeof cached.full_name === "string" && Number.isFinite(cached.credits)) user = cached
    } catch { cacheUser(null) }
    lastFetched = 0
    set({ token, user })
  },
  checkTokenExpiry: () => {
    const token = get().token
    if (!token) return false
    if (!tokenSubject(token)) { get().logout(); return false }
    return true
  },
  setToken: (token) => {
    localStorage.setItem("token", token)
    localStorage.setItem("token_set_at", Date.now().toString())
    cacheUser(null)
    lastFetched = 0
    set({ token, user: null, isLoading: false })
  },
  setUser: (user) => { cacheUser(user); set({ user }) },
  fetchUser: (force = true) => {
    const token = get().token
    if (!token || !tokenSubject(token)) { get().logout(); return Promise.resolve() }
    if (pending?.token === token) return pending.promise
    if (!force && get().user && Date.now() - lastFetched < 15_000) return Promise.resolve()
    set({ isLoading: true })
    const promise = (async () => {
      try {
        const res = await authAPI.me()
        if (get().token !== token) return
        if (res.data.id !== tokenSubject(token)) throw new Error("Profile does not match session")
        get().setUser(res.data)
        lastFetched = Date.now()
      } catch (error) {
        if (get().token !== token) return
        if (isAxiosError(error) && [401, 404].includes(error.response?.status || 0)) get().logout()
        throw error
      } finally {
        if (get().token === token) set({ isLoading: false })
        if (pending?.token === token) pending = null
      }
    })()
    pending = { token, promise }
    return promise
  },
  logout: () => {
    localStorage.removeItem("token")
    localStorage.removeItem("token_set_at")
    cacheUser(null)
    lastFetched = 0
    set({ user: null, token: null, isLoading: false })
    // Reset in-memory account data when an authenticated session ends.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (typeof window !== "undefined" && window.location.pathname !== "/login") window.location.assign("/login")
  },
}))
