"use client"

import { useEffect, useState } from "react"
import AdminGuard from "@/components/dashboard/AdminGuard"
import { Mic2, ChevronLeft } from "lucide-react"
import Link from "next/link"
import axios from "axios"

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

interface Voice {
  id: string
  name: string
  gender: string
  accent: string
  description: string
  is_active: boolean
}

export default function AdminVoicesPage() {
  const [voices, setVoices] = useState<Voice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : ""
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    axios.get(`${API}/admin/voices`, { headers })
      .then((res) => setVoices(res.data.voices))
      .finally(() => setIsLoading(false))
  }, [])

  const toggleVoice = async (voiceId: string, current: boolean) => {
    setToggling(voiceId)
    try {
      await axios.post(`${API}/admin/voices/${voiceId}/toggle`,
        { is_active: !current },
        { headers }
      )
      setVoices(prev => prev.map(v => v.id === voiceId ? { ...v, is_active: !current } : v))
    } finally {
      setToggling(null)
    }
  }

  const activeCount = voices.filter(v => v.is_active).length

  return (
    <AdminGuard>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-white/40 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Voices</h1>
            <p className="text-white/50 mt-0.5">{activeCount} of {voices.length} active</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {voices.map((voice) => (
              <div
                key={voice.id}
                className={`border rounded-xl p-5 flex items-center justify-between transition-all ${
                  voice.is_active
                    ? "bg-white/5 border-white/10"
                    : "bg-white/2 border-white/5 opacity-60"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    voice.is_active ? "bg-violet-600/30" : "bg-white/5"
                  }`}>
                    <Mic2 className={`w-5 h-5 ${voice.is_active ? "text-violet-400" : "text-white/20"}`} />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{voice.name}</p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {voice.gender} · {voice.accent}
                    </p>
                    <p className="text-white/30 text-xs mt-0.5">{voice.description}</p>
                  </div>
                </div>

                <button
                  onClick={() => toggleVoice(voice.id, voice.is_active)}
                  disabled={toggling === voice.id}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                    voice.is_active ? "bg-violet-600" : "bg-white/10"
                  } ${toggling === voice.id ? "opacity-50" : ""}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${
                    voice.is_active ? "left-7" : "left-1"
                  }`} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminGuard>
  )
}