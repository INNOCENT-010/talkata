"use client"

import { useEffect } from "react"
import { useAuthStore } from "@/store/authStore"

export default function SessionWatcher() {
  const { token, checkTokenExpiry } = useAuthStore()

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
        checkTokenExpiry()
      }
    }

    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [token])

  return null
}