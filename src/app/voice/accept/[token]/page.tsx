"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Wand2, Check, X, Loader2 } from "lucide-react"
import api from "@/lib/api"

export default function AcceptSharePage() {
  const params = useParams()
  const router = useRouter()
  const token  = params?.token as string

  const [state, setState] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const [voiceName, setVoiceName] = useState("")

  useEffect(() => {
    if (!token) { setState("error"); setMessage("Invalid share link."); return }

    const token_str = localStorage.getItem("token")
    if (!token_str) {
      // Not logged in — redirect to login, come back after
      router.push(`/login?redirect=/voice/accept/${token}`)
      return
    }

    api.post(`/cloning/accept/${token}`)
      .then((res) => {
        setVoiceName(res.data.name ?? "Voice")
        setMessage(res.data.message)
        setState("success")
        // Redirect to voice cloning page after 2.5s
        setTimeout(() => router.push("/voice-cloning?accepted=1"), 2500)
      })
      .catch((err) => {
        const detail = err?.response?.data?.detail ?? "Something went wrong."
        setMessage(detail)
        setState("error")
      })
  }, [token])

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-sm w-full text-center">

        {/* Logo */}
        <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center mx-auto mb-6">
          <Wand2 className="w-6 h-6 text-white" />
        </div>

        {state === "loading" && (
          <>
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-4" />
            <p className="text-white font-semibold text-lg mb-2">Adding voice to your library...</p>
            <p className="text-white/40 text-sm">Just a moment</p>
          </>
        )}

        {state === "success" && (
          <>
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-white font-semibold text-lg mb-2">
              "{voiceName}" added to your library
            </p>
            <p className="text-white/40 text-sm mb-6">{message}</p>
            <p className="text-white/25 text-xs">Redirecting to Voice Cloning...</p>
          </>
        )}

        {state === "error" && (
          <>
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-white font-semibold text-lg mb-2">Couldn't add voice</p>
            <p className="text-white/40 text-sm mb-6">{message}</p>
            <button
              onClick={() => router.push("/voice-cloning")}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium py-3 rounded-xl transition-colors"
            >
              Go to Voice Cloning
            </button>
          </>
        )}
      </div>
    </div>
  )
}