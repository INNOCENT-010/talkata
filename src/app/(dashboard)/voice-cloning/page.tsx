"use client"

import { useEffect, useRef, useState } from "react"
import {
  Wand2, Upload, Mic, Trash2, Share2, Check, Copy,
  X, Play, Square, Users, Info, Plus, Circle, StopCircle,
} from "lucide-react"
import api from "@/lib/api"

interface Clone {
  id: string
  name: string
  duration_seconds?: number
  is_shared: boolean
  share_token?: string
  created_at: string
}

interface SharedVoice {
  access_id: string
  clone_id: string
  name: string
  duration_seconds?: number
  owner_name: string
  shared_at: string
}

function formatDuration(s?: number) {
  if (!s) return null
  return s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="text-white/30 hover:text-violet-400 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function AudioPreviewButton({ cloneId }: { cloneId: string }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const toggle = async () => {
    if (playing && audioRef.current) {
      audioRef.current.pause(); audioRef.current = null; setPlaying(false); return
    }
    try {
      const res = await api.get(`/cloning/${cloneId}/url`)
      const audio = new Audio(res.data.url)
      audioRef.current = audio
      audio.play(); setPlaying(true)
      audio.onended = () => { setPlaying(false); audioRef.current = null }
    } catch { alert("Could not load preview") }
  }

  useEffect(() => () => { if (audioRef.current) audioRef.current.pause() }, [])

  return (
    <button
      onClick={toggle}
      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
        playing ? "bg-violet-500 text-white" : "bg-white/10 text-white/40 hover:bg-violet-500/20 hover:text-violet-300"
      }`}
      title={playing ? "Stop" : "Preview"}
    >
      {playing ? <Square className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 ml-0.5 fill-current" />}
    </button>
  )
}

// ── Recorder component ────────────────────────────────────────────────────────
function VoiceRecorder({ onRecorded }: { onRecorded: (file: File, duration: number) => void }) {
  const [state, setState] = useState<"idle" | "recording" | "recorded">("idle")
  const [elapsed, setElapsed] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setState("recorded")
        const file = new File([blob], "recording.wav", { type: "audio/wav" })
        onRecorded(file, elapsed)
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      setState("recording")
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } catch {
      alert("Microphone access denied. Please allow microphone in your browser settings.")
    }
  }

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRef.current?.stop()
  }

  const reset = () => {
    setState("idle")
    setElapsed(0)
    setAudioUrl(null)
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  if (state === "idle") return (
    <button
      onClick={start}
      className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-white/10 hover:border-violet-500/30 rounded-xl py-6 text-white/40 hover:text-violet-300 transition-colors text-sm"
    >
      <Circle className="w-4 h-4 text-red-400" />
      Record your voice instead
    </button>
  )

  if (state === "recording") return (
    <div className="flex flex-col items-center gap-4 bg-red-500/5 border border-red-500/20 rounded-xl p-6">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        <span className="text-red-400 text-sm font-medium">Recording... {elapsed}s</span>
      </div>
      <p className="text-white/30 text-xs text-center">
        Speak clearly — read a paragraph naturally. Min 6s, max 2 mins.
      </p>
      <button
        onClick={stop}
        disabled={elapsed < 6}
        className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-40 text-red-300 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
      >
        <StopCircle className="w-4 h-4" />
        {elapsed < 6 ? `Stop (${6 - elapsed}s min)` : "Stop Recording"}
      </button>
    </div>
  )

  return (
    <div className="flex flex-col gap-3 bg-violet-600/5 border border-violet-500/20 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-violet-300 text-sm font-medium">✓ Recording ready ({elapsed}s)</span>
        <button onClick={reset} className="text-white/30 hover:text-red-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      {audioUrl && <audio controls src={audioUrl} className="w-full h-8" />}
    </div>
  )
}

export default function VoiceCloningPage() {
  const [clones, setClones]             = useState<Clone[]>([])
  const [sharedWithMe, setSharedWithMe] = useState<SharedVoice[]>([])
  const [isLoading, setIsLoading]       = useState(true)
  const [isUploading, setIsUploading]   = useState(false)
  const [uploadName, setUploadName]     = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileDuration, setFileDuration] = useState<number | null>(null)
  const [fileError, setFileError]       = useState<string | null>(null)
  const [shareLinks, setShareLinks]     = useState<Record<string, string>>({})
  const [togglingShare, setTogglingShare] = useState<string | null>(null)
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [inputMode, setInputMode]       = useState<"upload" | "record">("upload")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const MAX_CLONES = 10 // silent limit

  const fetchAll = async () => {
    const [clonesRes, sharedRes] = await Promise.all([
      api.get("/cloning/"),
      api.get("/cloning/shared-with-me"),
    ])
    setClones(clonesRes.data.clones)
    setSharedWithMe(sharedRes.data.voices)
    const links: Record<string, string> = {}
    for (const c of clonesRes.data.clones) {
      if (c.is_shared && c.share_token) {
        links[c.id] = `https://talkata.ink/voice/accept/${c.share_token}`
      }
    }
    setShareLinks(links)
  }

  useEffect(() => { fetchAll().finally(() => setIsLoading(false)) }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileError(null)
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    const audio = new Audio(url)
    audio.onloadedmetadata = () => {
      const dur = audio.duration
      URL.revokeObjectURL(url)
      if (dur < 6) { setFileError("Too short — minimum 6 seconds."); setSelectedFile(null); setFileDuration(null); return }
      if (dur > 120) { setFileError("Too long — maximum 2 minutes."); setSelectedFile(null); setFileDuration(null); return }
      setFileDuration(dur)
    }
    audio.onerror = () => { setFileError("Could not read file — try WAV or MP3."); setSelectedFile(null) }
  }

  const handleRecorded = (file: File, duration: number) => {
    setSelectedFile(file)
    setFileDuration(duration)
    setFileError(null)
  }

  const handleUpload = async () => {
    if (!selectedFile || !uploadName.trim()) return
    setIsUploading(true)
    try {
      const form = new FormData()
      form.append("name", uploadName.trim())
      form.append("file", selectedFile)
      await api.post("/cloning/upload", form, { headers: { "Content-Type": "multipart/form-data" } })
      setUploadName(""); setSelectedFile(null); setFileDuration(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      await fetchAll()
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  const handleToggleShare = async (cloneId: string) => {
    setTogglingShare(cloneId)
    try {
      const res = await api.post(`/cloning/${cloneId}/share`)
      if (res.data.is_shared) {
        setShareLinks(prev => ({ ...prev, [cloneId]: res.data.share_link }))
      } else {
        setShareLinks(prev => { const n = { ...prev }; delete n[cloneId]; return n })
      }
      await fetchAll()
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "Could not toggle sharing")
    } finally {
      setTogglingShare(null)
    }
  }

  const handleDelete = async (cloneId: string) => {
    if (!confirm("Delete this voice clone?")) return
    setDeletingId(cloneId)
    try {
      await api.delete(`/cloning/${cloneId}`)
      await fetchAll()
    } catch { alert("Could not delete clone") }
    finally { setDeletingId(null) }
  }

  const handleRemoveShared = async (accessId: string) => {
    if (!confirm("Remove this shared voice?")) return
    try {
      await api.delete(`/cloning/shared-with-me/${accessId}`)
      await fetchAll()
    } catch { alert("Could not remove") }
  }

  if (isLoading) return (
    <div className="max-w-3xl mx-auto animate-pulse">
      <div className="h-8 w-56 bg-white/10 rounded mb-2" />
      <div className="h-4 w-72 bg-white/5 rounded mb-8" />
      <div className="h-48 bg-white/5 rounded-xl mb-4" />
      <div className="h-48 bg-white/5 rounded-xl" />
    </div>
  )

  const atLimit = clones.length >= MAX_CLONES

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Wand2 className="w-6 h-6 text-violet-400" />
          Voice Cloning
        </h1>
        <p className="text-white/50 mt-1">Clone any voice from a short audio clip and share it with others</p>
      </div>

      <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-4 mb-6">
        <Info className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
        <div className="text-white/40 text-sm leading-relaxed">
          Upload or record a <span className="text-white/60">6–120 second</span> clean audio clip — single speaker, no background noise.
          Shared voices can be used by others with their own credits.
        </div>
      </div>

      {/* ── Upload / Record section ───────────────────────────────────────── */}
      {!atLimit && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
          <p className="text-white font-medium text-sm mb-4">Create a new voice clone</p>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setInputMode("upload"); setSelectedFile(null); setFileDuration(null); setFileError(null) }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                inputMode === "upload" ? "bg-violet-600/20 text-violet-300 border border-violet-500/30" : "bg-white/5 text-white/40 hover:text-white/60"
              }`}
            >
              <Upload className="w-3.5 h-3.5" /> Upload file
            </button>
            <button
              onClick={() => { setInputMode("record"); setSelectedFile(null); setFileDuration(null); setFileError(null) }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                inputMode === "record" ? "bg-violet-600/20 text-violet-300 border border-violet-500/30" : "bg-white/5 text-white/40 hover:text-white/60"
              }`}
            >
              <Mic className="w-3.5 h-3.5" /> Record now
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <input
              value={uploadName}
              onChange={e => setUploadName(e.target.value)}
              placeholder="Voice name (e.g. My Voice, David Narrator)"
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none placeholder:text-white/20 focus:border-violet-500/50 w-full"
            />

            {inputMode === "upload" ? (
              <>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl px-6 py-8 text-center cursor-pointer transition-colors ${
                    selectedFile ? "border-violet-500/40 bg-violet-600/5" : "border-white/10 hover:border-violet-500/30"
                  }`}
                >
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <Mic className="w-8 h-8 text-violet-400" />
                      <p className="text-white text-sm font-medium">{selectedFile.name}</p>
                      {fileDuration && <p className="text-white/40 text-xs">{formatDuration(fileDuration)} ✓</p>}
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedFile(null); setFileDuration(null); if (fileInputRef.current) fileInputRef.current.value = "" }}
                        className="text-white/20 hover:text-red-400 transition-colors mt-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-white/30">
                      <Upload className="w-8 h-8" />
                      <p className="text-sm">Click to upload WAV or MP3</p>
                      <p className="text-xs">6 seconds minimum · 2 minutes maximum</p>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="audio/wav,audio/mp3,audio/mpeg" className="hidden" onChange={handleFileChange} />
              </>
            ) : (
              <VoiceRecorder onRecorded={handleRecorded} />
            )}

            {fileError && <p className="text-red-400 text-xs">{fileError}</p>}

            <button
              onClick={handleUpload}
              disabled={!selectedFile || !uploadName.trim() || isUploading || !!fileError}
              className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-3 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              {isUploading ? "Creating..." : "Create Voice Clone"}
            </button>
          </div>
        </div>
      )}

      {/* ── My Clones ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-3">My Voices</h2>
        {clones.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl py-10 text-center text-white/25 text-sm">
            No voice clones yet — upload or record one above.
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {clones.map((clone, i) => (
              <div key={clone.id} className={`flex items-center gap-4 px-5 py-4 ${i < clones.length - 1 ? "border-b border-white/5" : ""}`}>
                <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Mic className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{clone.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {clone.duration_seconds && (
                      <span className="text-white/30 text-xs">{formatDuration(clone.duration_seconds)}</span>
                    )}
                    {clone.is_shared && (
                      <span className="text-xs text-violet-400/70 bg-violet-500/10 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <Users className="w-2.5 h-2.5" /> Shared
                      </span>
                    )}
                  </div>
                  {clone.is_shared && shareLinks[clone.id] && (
                    <div className="flex items-center gap-2 mt-1.5 bg-white/5 rounded-lg px-3 py-1.5 max-w-sm">
                      <p className="text-white/30 text-xs font-mono truncate flex-1">{shareLinks[clone.id]}</p>
                      <CopyButton text={shareLinks[clone.id]} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <AudioPreviewButton cloneId={clone.id} />
                  <a
                    href={`/generate?voice=clone_${clone.id}`}
                    className="flex items-center gap-1 text-xs bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    Use
                  </a>
                  <button
                    onClick={() => handleToggleShare(clone.id)}
                    disabled={togglingShare === clone.id}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      clone.is_shared ? "bg-violet-500/20 text-violet-400 hover:bg-red-500/20 hover:text-red-400" : "bg-white/10 text-white/40 hover:bg-violet-500/20 hover:text-violet-300"
                    }`}
                    title={clone.is_shared ? "Disable sharing" : "Share"}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(clone.id)}
                    disabled={deletingId === clone.id}
                    className="w-7 h-7 rounded-full bg-white/5 text-white/25 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Shared with me ────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-3">
          Shared With Me
          {sharedWithMe.length > 0 && <span className="ml-2 text-violet-400">{sharedWithMe.length}</span>}
        </h2>
        {sharedWithMe.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl py-10 text-center text-white/25 text-sm">
            No voices shared with you yet.
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {sharedWithMe.map((v, i) => (
              <div key={v.access_id} className={`flex items-center gap-4 px-5 py-4 ${i < sharedWithMe.length - 1 ? "border-b border-white/5" : ""}`}>
                <div className="w-9 h-9 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-pink-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{v.name}</p>
                  <p className="text-white/30 text-xs mt-0.5">from {v.owner_name}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <AudioPreviewButton cloneId={v.clone_id} />
                  <a
                    href={`/generate?voice=clone_${v.clone_id}`}
                    className="flex items-center gap-1 text-xs bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    Use
                  </a>
                  <button
                    onClick={() => handleRemoveShared(v.access_id)}
                    className="w-7 h-7 rounded-full bg-white/5 text-white/25 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}