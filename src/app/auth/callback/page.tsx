"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authAPI } from "@/lib/api"
import { useAuthStore } from "@/store/authStore"

export default function GoogleCallbackPage() {
  const router = useRouter()
  const { setToken, fetchUser } = useAuthStore()
  const [error, setError] = useState("")

  useEffect(() => {
    const accessToken = new URLSearchParams(window.location.hash.slice(1)).get("access_token")
    if (!accessToken) { router.replace("/login?error=google"); return }
    authAPI.exchangeGoogleToken(accessToken)
      .then(async (response) => { setToken(response.data.access_token); await fetchUser(); router.replace("/dashboard") })
      .catch(() => setError("Google sign-in could not be completed. Please try again."))
  }, [fetchUser, router, setToken])

  return <div className="min-h-screen bg-[#0a0a0f] px-6 pt-32 text-center"><div className="mx-auto max-w-sm">{error ? <p className="text-sm text-red-400">{error}</p> : <><div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-500" /><p className="mt-4 text-sm text-white/60">Completing Google sign-in…</p></>}</div></div>
}
