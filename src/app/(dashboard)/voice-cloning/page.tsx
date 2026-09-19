"use client"

import { useEffect, useRef, useState } from "react"
import { useAuthStore } from "@/store/authStore"
import api from "@/lib/api"
import {
  Mic, Upload, Square, Play, Trash2, Check,
  Loader2, AlertCircle, Wand2, X, ArrowRight
} from "lucide-react"
import { useRouter } from "next/navigation"

const ACCESS_CODE = "trojan2026"
const RECORD_SCRIPT = `My name is Trojan, and this is my voice. I build things that matter — software, stories, spaces. Every morning I wake up with a new idea and the discipline to see it through. The world moves fast, but clarity is still the most powerful tool I own. Let's make something worth remembering.`

interface Clone {
  id: string
  name: string
  duration_seconds?: number
  is_shared: boolean
  created_at: string
}

// ── Waveform bars visualiser ──────────────────────────────────────────────────
function WaveBar({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[3px] h-8">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-all duration-150 ${active ? "bg-violet-400" : "bg-white/20"}`}
          style={{
            height: active
              ? `${Math.max(4, Math.random() * 28 + 4)}px`
              : "6px",
            animationDelay: `${i * 40}ms`,
          }}
        />
      ))}
    </div>
  )
}

// ── Passphrase gate ───────────────────────────────────────────────────────────
function PassGate({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode]   = useState("")
  const [shake, setShake] = useState(false)

  function attempt() {
    if (code === ACCESS_CODE) {
      onUnlock()
    } else {
      setShake(true)
      setCode("")
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10">
          <Wand2 className="h-6 w-6 text-violet-300" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-white">Lab access</h2>
        <p className="mb-6 text-sm text-white/40">Enter your access code to continue.</p>
        <div className={`transition-transform ${shake ? "animate-bounce" : ""}`}>
          <input
            type="password"
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === "Enter" && attempt()}
            placeholder="Access code"
            autoFocus
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-white placeholder:text-white/20 focus:border-violet-500 focus:outline-none"
          />
          <button
            onClick={attempt}
            className="mt-3 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VoiceCloningPage() {
  const { user } = useAuthStore()
  const router   = useRouter()

  const [unlocked, setUnlocked]   = useState(false)
  const [tab, setTab]             = useState<"upload" | "record">("upload")
  const [clones, setClones]       = useState<Clone[]>([])
  const [loadingClones, setLoadingClones] = useState(true)

  // Upload state
  const [uploadFile, setUploadFile]   = useState<File | null>(null)
  const [uploadName, setUploadName]   = useState("")
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadDone, setUploadDone]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Record state
  const [recording, setRecording]     = useState(false)
  const [recorded, setRecorded]       = useState<Blob | null>(null)
  const [recordName, setRecordName]   = useState("")
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState<string | null>(null)
  const [saveDone, setSaveDone]       = useState(false)
  const [recSeconds, setRecSeconds]   = useState(0)
  const mediaRef    = useRef<MediaRecorder | null>(null)
  const chunksRef   = useRef<Blob[]>([])
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef    = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying]         = useState(false)

  useEffect(() => {
    if (!unlocked) return
    api.get("/cloning/").then(r => setClones(r.data.clones || [])).finally(() => setLoadingClones(false))
  }, [unlocked, uploadDone, saveDone])

  // ── Upload flow ──────────────────────────────────────────────────────────
  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setUploadFile(f)
    setUploadName(f.name.replace(/\.[^.]+$/, ""))
    setUploadError(null)
    setUploadDone(false)
    e.target.value = ""
  }

  async function doUpload() {
    if (!uploadFile || !uploadName.trim()) return
    setUploading(true); setUploadError(null)
    try {
      const form = new FormData()
      form.append("name", uploadName.trim())
      form.append("file", uploadFile)
      await api.post("/cloning/upload", form, { headers: { "Content-Type": "multipart/form-data" } })
      setUploadDone(true)
      setUploadFile(null)
      setUploadName("")
    } catch (err: any) {
      setUploadError(err?.response?.data?.detail || "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  // ── Record flow ──────────────────────────────────────────────────────────
  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" })
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        setRecorded(blob)
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start(100)
      mediaRef.current = mr
      setRecording(true)
      setRecSeconds(0)
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000)
    } catch {
      setSaveError("Microphone access denied.")
    }
  }

  function stopRec() {
    mediaRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
    setRecording(false)
  }

  function playback() {
    if (!recorded) return
    if (playing && audioRef.current) {
      audioRef.current.pause()
      setPlaying(false)
      return
    }
    const url   = URL.createObjectURL(recorded)
    const audio = new Audio(url)
    audioRef.current = audio
    audio.play()
    setPlaying(true)
    audio.onended = () => { setPlaying(false); URL.revokeObjectURL(url) }
  }

  function discard() {
    setRecorded(null)
    setRecSeconds(0)
    setSaveDone(false)
    setSaveError(null)
    setRecordName("")
  }

  async function saveRecording() {
    if (!recorded || !recordName.trim()) return
    setSaving(true); setSaveError(null)
    try {
      // Convert webm blob to wav-named file — backend accepts audio/mpeg too
      const file = new File([recorded], "recording.webm", { type: "audio/mpeg" })
      const form = new FormData()
      form.append("name", recordName.trim())
      form.append("file", file)
      await api.post("/cloning/upload", form, { headers: { "Content-Type": "multipart/form-data" } })
      setSaveDone(true)
      discard()
    } catch (err: any) {
      setSaveError(err?.response?.data?.detail || "Save failed.")
    } finally {
      setSaving(false)
    }
  }

  async function deleteClone(id: string) {
    await api.delete(`/cloning/${id}`)
    setClones(prev => prev.filter(c => c.id !== id))
  }

  function useClone(id: string) {
    router.push(`/generate?voice=clone_${id}`)
  }

  function fmt(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
  }

  if (!unlocked) return <PassGate onUnlock={() => setUnlocked(true)} />

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">

      {/* ── Header ── */}
      <div className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
          <Wand2 className="h-3 w-3" /> Lab · Voice Cloning
        </div>
        <h1 className="text-2xl font-bold text-white">Clone a voice</h1>
        <p className="mt-1 text-sm text-white/40">Upload a recording or record directly. 15–30 seconds works best.</p>
      </div>

      {/* ── Tabs ── */}
      <div className="mb-6 flex gap-1 rounded-xl border border-white/10 bg-white/[.03] p-1">
        {(["upload", "record"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all capitalize ${
              tab === t ? "bg-violet-600 text-white" : "text-white/40 hover:text-white"
            }`}
          >
            {t === "upload" ? <Upload className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {t}
          </button>
        ))}
      </div>

      {/* ── Upload tab ── */}
      {tab === "upload" && (
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
          {!uploadFile ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[.02] py-10 transition hover:border-violet-500/40 hover:bg-white/[.04]"
            >
              <Upload className="h-8 w-8 text-white/30" />
              <div className="text-center">
                <p className="text-sm font-medium text-white/70">Drop a WAV or MP3</p>
                <p className="mt-0.5 text-xs text-white/30">15–120 seconds · max 30 MB</p>
              </div>
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/20">
                  <Mic className="h-4 w-4 text-violet-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-white">{uploadFile.name}</p>
                  <p className="text-xs text-white/30">{(uploadFile.size / 1024).toFixed(0)} KB</p>
                </div>
                <button onClick={() => setUploadFile(null)} className="text-white/30 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <input
                value={uploadName}
                onChange={e => setUploadName(e.target.value)}
                placeholder="Name this voice…"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-violet-500 focus:outline-none"
              />
              {uploadError && (
                <div className="flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {uploadError}
                </div>
              )}
              {uploadDone && (
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <Check className="h-3.5 w-3.5" /> Voice clone saved!
                </div>
              )}
              <button
                onClick={doUpload}
                disabled={!uploadName.trim() || uploading}
                className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-40"
              >
                {uploading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Save voice clone"}
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="audio/wav,audio/mp3,audio/mpeg" className="hidden" onChange={pickFile} />
        </div>
      )}

      {/* ── Record tab ── */}
      {tab === "record" && (
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-6 space-y-5">

          {/* Script */}
          <div className="rounded-xl border border-white/8 bg-white/[.02] p-4">
            <p className="mb-2 text-xs font-medium text-white/30">Read this aloud</p>
            <p className="text-sm leading-7 text-white/70 italic">"{RECORD_SCRIPT}"</p>
          </div>

          {/* Recorder */}
          {!recorded ? (
            <div className="flex flex-col items-center gap-4">
              <WaveBar active={recording} />
              {recording && (
                <p className="text-sm tabular-nums text-violet-300">{fmt(recSeconds)}</p>
              )}
              <button
                onClick={recording ? stopRec : startRec}
                className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
                  recording
                    ? "bg-red-500 hover:bg-red-400 scale-110"
                    : "bg-violet-600 hover:bg-violet-500"
                }`}
              >
                {recording
                  ? <Square className="h-5 w-5 text-white fill-white" />
                  : <Mic className="h-6 w-6 text-white" />
                }
              </button>
              <p className="text-xs text-white/30">
                {recording ? "Recording — tap to stop" : "Tap to start recording"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <button
                  onClick={playback}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-300 transition hover:bg-violet-500/40"
                >
                  {playing
                    ? <Square className="h-3.5 w-3.5 fill-current" />
                    : <Play className="h-3.5 w-3.5 ml-0.5 fill-current" />
                  }
                </button>
                <div className="flex-1">
                  <p className="text-sm text-white">Recording</p>
                  <p className="text-xs text-white/30">{fmt(recSeconds)} recorded</p>
                </div>
                <button onClick={discard} className="text-white/30 hover:text-red-400 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <input
                value={recordName}
                onChange={e => setRecordName(e.target.value)}
                placeholder="Name this voice…"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:border-violet-500 focus:outline-none"
              />
              {saveError && (
                <div className="flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {saveError}
                </div>
              )}
              {saveDone && (
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <Check className="h-3.5 w-3.5" /> Voice clone saved!
                </div>
              )}
              <button
                onClick={saveRecording}
                disabled={!recordName.trim() || saving}
                className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-40"
              >
                {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Save voice clone"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Clones list ── */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-white/50">Your clones</h2>
        {loadingClones ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-white/20" />
          </div>
        ) : clones.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-white/[.02] py-10 text-center text-sm text-white/25">
            No clones yet — upload or record one above.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {clones.map(clone => (
              <div key={clone.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[.03] px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-semibold text-violet-300">
                  {clone.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-white">{clone.name}</p>
                  <p className="text-xs text-white/30">
                    {clone.duration_seconds ? `${clone.duration_seconds}s · ` : ""}
                    {new Date(clone.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => useClone(clone.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-violet-600/20 px-3 py-1.5 text-xs font-medium text-violet-300 transition hover:bg-violet-600/40"
                  >
                    Use <ArrowRight className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => deleteClone(clone.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white/20 transition hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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