"use client"

import { useEffect } from "react"
import { useAuthStore } from "@/store/authStore"

export default function SessionWatcher() {
  const { token, checkTokenExpiry, initialize, fetchUser } = useAuthStore()

  useEffect(() => {
    initialize()
    const syncSession = (event: StorageEvent) => {
      if (event.key === "token" || event.key === null) initialize()
    }
    window.addEventListener("storage", syncSession)
    return () => window.removeEventListener("storage", syncSession)
  }, [initialize])

  useEffect(() => {
    if (!token) return

    // Check on load
    checkTokenExpiry()

    // Check every 5 minutes
    const interval = setInterval(() => {
      checkTokenExpiry()
    }, 5 * 60 * 1000)

    // Check when tab becomes visible again (user returns to device)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        initialize()
        if (checkTokenExpiry() && useAuthStore.getState().user) fetchUser(false).catch(() => {})
      }
    }

    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [token, checkTokenExpiry, initialize, fetchUser])

  return null
}