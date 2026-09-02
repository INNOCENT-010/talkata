"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authAPI } from "@/lib/api"
import { useAuthStore } from "@/store/authStore"
import Link from "next/link"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function GoogleCallbackPage() {
  const router = useRouter()
  const { setToken, fetchUser } = useAuthStore()
  const [error, setError] = useState("")

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1))
    const query = new URLSearchParams(window.location.search)
    const accessToken = fragment.get("access_token")
    const providerError = fragment.get("error_description") || query.get("error_description")
    if (!accessToken) {
      const message = providerError || "Google returned without a sign-in session. Please start Google sign-in again."
      queueMicrotask(() => setError(message))
      return
    }
    authAPI.exchangeGoogleToken(accessToken)
      .then(async (response) => { setToken(response.data.access_token); await fetchUser(); router.replace("/dashboard") })
      .catch(() => setError("Google sign-in could not be completed. Please try again."))
  }, [fetchUser, router, setToken])

  return <div className="min-h-screen bg-[#0a0a0f] px-6 pt-32 text-center"><div className="mx-auto max-w-sm">{error ? <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-6"><AlertCircle className="mx-auto h-7 w-7 text-red-300" /><h1 className="mt-3 font-semibold text-white">Google sign-in was not completed</h1><p className="mt-2 text-sm leading-6 text-white/55">{error}</p><Link href="/login" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white"><RefreshCw className="h-4 w-4" /> Try again</Link></div> : <><div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-500" /><p className="mt-4 text-sm text-white/60">Completing Google sign-in…</p></>}</div></div>
}
