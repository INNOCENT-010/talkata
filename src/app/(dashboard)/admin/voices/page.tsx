"use client"

import { useEffect, useState, useRef } from "react"
import AdminGuard from "@/components/dashboard/AdminGuard"
import { Mic2, ChevronLeft, Pencil, Check, X, GripVertical } from "lucide-react"
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
  sort_order: number
}

export default function AdminVoicesPage() {
  const [voices, setVoices] = useState<Voice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDesc, setEditDesc] = useState("")
  const [saving, setSaving] = useState(false)
  const dragItem = useRef<number | null>(null)
  const dragOver = useRef<number | null>(null)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : ""
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    axios.get(`${API}/admin/voices`, { headers })
      .then((res) => setVoices(res.data.voices.sort((a: Voice, b: Voice) => a.sort_order - b.sort_order)))
      .finally(() => setIsLoading(false))
  }, [])

  const toggleVoice = async (voiceId: string, current: boolean) => {
    setToggling(voiceId)
    try {
      await axios.post(`${API}/admin/voices/${voiceId}/toggle`, { is_active: !current }, { headers })
      setVoices(prev => prev.map(v => v.id === voiceId ? { ...v, is_active: !current } : v))
    } finally {
      setToggling(null)
    }
  }

  const saveDescription = async (voiceId: string) => {
    await axios.post(`${API}/admin/voices/${voiceId}/description`, { description: editDesc }, { headers })
    setVoices(prev => prev.map(v => v.id === voiceId ? { ...v, description: editDesc } : v))
    setEditingId(null)
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleDragStart = (index: number) => { dragItem.current = index }
  const handleDragEnter = (index: number) => { dragOver.current = index }

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOver.current === null) return
    if (dragItem.current === dragOver.current) return

    const reordered = [...voices]
    const dragged = reordered.splice(dragItem.current, 1)[0]
    reordered.splice(dragOver.current, 0, dragged)
    dragItem.current = null
    dragOver.current = null

    setVoices(reordered)
    setSaving(true)
    try {
      await axios.post(`${API}/admin/voices/reorder`,
        { order: reordered.map(v => v.id) },
        { headers }
      )
    } finally {
      setSaving(false)
    }
  }

  const activeCount = voices.filter(v => v.is_active).length

  const VoiceCard = ({ voice, index }: { voice: Voice; index: number }) => (
    <div
      draggable
      onDragStart={() => handleDragStart(index)}
      onDragEnter={() => handleDragEnter(index)}
      onDragEnd={handleDragEnd}
      onDragOver={(e) => e.preventDefault()}
      className={`border rounded-xl p-5 transition-all cursor-grab active:cursor-grabbing select-none ${
        voice.is_active
          ? "bg-white/5 border-white/10 hover:border-white/20"
          : "bg-white/[0.02] border-white/5 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Drag handle */}
          <div className="flex flex-col items-center gap-1 mt-1 shrink-0">
            <GripVertical className="w-4 h-4 text-white/20" />
          </div>

          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
            voice.is_active ? "bg-violet-600/30" : "bg-white/5"
          }`}>
            <Mic2 className={`w-4 h-4 ${voice.is_active ? "text-violet-400" : "text-white/20"}`} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm">{voice.name}</p>
            <p className="text-white/40 text-xs mt-0.5">{voice.gender} · {voice.accent}</p>

            {editingId === voice.id ? (
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="flex-1 text-xs bg-white/10 border border-white/20 rounded px-2 py-1 text-white focus:outline-none focus:border-violet-500"
                  autoFocus
                  onMouseDown={(e) => e.stopPropagation()}
                />
                <button onClick={() => saveDescription(voice.id)} className="text-green-400 hover:text-green-300">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setEditingId(null)} className="text-white/30 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-1 group">
                <p className="text-white/30 text-xs truncate">{voice.description}</p>
                <button
                  onClick={() => { setEditingId(voice.id); setEditDesc(voice.description) }}
                  className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-violet-400 transition-all"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => toggleVoice(voice.id, voice.is_active)}
          disabled={toggling === voice.id}
          className={`relative w-11 h-6 rounded-full transition-all duration-300 shrink-0 ${
            voice.is_active ? "bg-violet-600" : "bg-white/10"
          } ${toggling === voice.id ? "opacity-50" : ""}`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${
            voice.is_active ? "left-6" : "left-1"
          }`} />
        </button>
      </div>
    </div>
  )

  return (
    <AdminGuard>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-white/40 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Voices</h1>
              <p className="text-white/50 mt-0.5">{activeCount} of {voices.length} active</p>
            </div>
          </div>
          {saving && <span className="text-white/30 text-xs">Saving order...</span>}
        </div>

        <p className="text-white/30 text-xs mb-4 px-1">
          Drag voices to reorder — users see them in this order
        </p>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {voices.map((v, i) => <VoiceCard key={v.id} voice={v} index={i} />)}
          </div>
        )}
      </div>
    </AdminGuard>
  )
}