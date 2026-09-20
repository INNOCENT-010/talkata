"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useAuthStore } from "@/store/authStore"
import api from "@/lib/api"
import {
  Mic, Upload, Square, Play, Trash2, Check,
  Loader2, AlertCircle, Wand2, X, ArrowRight, Pause
} from "lucide-react"
import { useRouter } from "next/navigation"

const ACCESS_CODE    = "trojan2026"
const MIN_REC_SEC    = 6
const MAX_REC_SEC    = 120
const RECORD_SCRIPT  = `My name is Trojan, and this is my voice. I build things that matter — software, stories, spaces. Every morning I wake up with a new idea and the discipline to see it through. The world moves fast, but clarity is still the most powerful tool I own. Let's make something worth remembering.`

interface Clone {
  id: string
  name: string
  duration_seconds?: number
  is_shared: boolean
  created_at: string
}

// ── Real waveform visualiser using Web Audio API ──────────────────────────────
function LiveWaveform({ stream }: { stream: MediaStream | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const ctxRef    = useRef<AudioContext | null>(null)
  const analRef   = useRef<AnalyserNode | null>(null)

  useEffect(() => {
    if (!stream) {
      cancelAnimationFrame(rafRef.current)
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
      }
      return
    }

    const audioCtx  = new AudioContext()
    const analyser  = audioCtx.createAnalyser()
    analyser.fftSize = 64
    const source    = audioCtx.createMediaStreamSource(stream)
    source.connect(analyser)
    ctxRef.current  = audioCtx
    analRef.current = analyser
    const data      = new Uint8Array(analyser.frequencyBinCount)

    function draw() {
      rafRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(data)
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const barW = canvas.width / data.length
      data.forEach((val, i) => {
        const h = (val / 255) * canvas.height
        ctx.fillStyle = `rgba(139, 92, 246, ${0.4 + (val / 255) * 0.6})`
        ctx.fillRect(i * barW, canvas.height - h, barW - 1, h)
      })
    }
    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      audioCtx.close()
    }
  }, [stream])

  return (
    <canvas
      ref={canvasRef}
      width={280}
      height={40}
      className="w-full rounded-lg bg-white/[.03]"
    />
  )
}

// ── Idle waveform (static bars) ───────────────────────────────────────────────
function IdleWave() {
  return (
    <div className="flex h-10 w-full items-center justify-center gap-[3px] rounded-lg bg-white/[.03]">
      {[3,5,4,7,6,4,8,5,3,6,4,7,5,3,6,8,4,5,3,6].map((h, i) => (
        <div key={i} className="w-[3px] rounded-full bg-white/15" style={{ height: `${h * 2}px` }} />
      ))}
    </div>
  )
}

// ── Passphrase gate ───────────────────────────────────────────────────────────
function PassGate({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode]   = useState("")
  const [wrong, setWrong] = useState(false)

  function attempt() {
    if (code === ACCESS_CODE) {
      onUnlock()
    } else {
      setWrong(true)
      setCode("")
      setTimeout(() => setWrong(false), 600)
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
        <div className={wrong ? "animate-bounce" : ""}>
          <input
            type="password"
            value={code}
            onChange={e => { setCode(e.target.value); setWrong(false) }}
            onKeyDown={e => e.key === "Enter" && attempt()}
            placeholder="Access code"
            autoFocus
            className={`w-full rounded-xl border px-4 py-3 text-center text-white placeholder:text-white/20 focus:outline-none bg-white/5 transition-colors ${
              wrong ? "border-red-500/60" : "border-white/10 focus:border-violet-500"
            }`}
          />
          {wrong && <p className="mt-2 text-xs text-red-400">Incorrect code.</p>}
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

  const [unlocked, setUnlocked]           = useState(false)
  const [tab, setTab]                     = useState<"upload" | "record">("upload")
  const [clones, setClones]               = useState<Clone[]>([])
  const [loadingClones, setLoadingClones] = useState(true)

  // Upload state
  const [uploadFile, setUploadFile]   = useState<File | null>(null)
  const [uploadName, setUploadName]   = useState("")
  const [uploading, setUploading]     = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadDone, setUploadDone]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Record state
  const [stream, setStream]         = useState<MediaStream | null>(null)
  const [recording, setRecording]   = useState(false)
  const [recorded, setRecorded]     = useState<Blob | null>(null)
  const [recordName, setRecordName] = useState("")
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState<string | null>(null)
  const [saveDone, setSaveDone]     = useState(false)
  const [recSeconds, setRecSeconds] = useState(0)
  const [playing, setPlaying]       = useState(false)
  const mediaRef  = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef  = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  // Refresh clones after save
  const fetchClones = useCallback(() => {
    setLoadingClones(true)
    api.get("/cloning/")
      .then(r => setClones(r.data.clones || []))
      .finally(() => setLoadingClones(false))
  }, [])

  useEffect(() => {
    if (unlocked) fetchClones()
  }, [unlocked, fetchClones])

  // Auto-stop at max duration
  useEffect(() => {
    if (recSeconds >= MAX_REC_SEC && recording) stopRec()
  }, [recSeconds, recording])

  // Cleanup blob URL on unmount
  useEffect(() => () => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
  }, [])

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
      await api.post("/cloning/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setUploadDone(true)
      setUploadFile(null)
      setUploadName("")
      fetchClones()
    } catch (err: any) {
      const raw = err?.response?.data?.detail
      setUploadError(typeof raw === "string" ? raw : "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  // ── Record flow ──────────────────────────────────────────────────────────
  async function startRec() {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true })
      setStream(ms)
      const mr = new MediaRecorder(ms, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      })
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType })
        setRecorded(blob)
        ms.getTracks().forEach(t => t.stop())
        setStream(null)
      }
      mr.start(100)
      mediaRef.current = mr
      setRecording(true)
      setRecSeconds(0)
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000)
    } catch {
      setSaveError("Microphone access was denied. Please allow microphone access and try again.")
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
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    const url = URL.createObjectURL(recorded)
    blobUrlRef.current = url
    const audio = new Audio(url)
    audioRef.current = audio
    audio.play()
    setPlaying(true)
    audio.onended = () => setPlaying(false)
    audio.onpause = () => setPlaying(false)
  }

  function discard() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
    setRecorded(null)
    setRecSeconds(0)
    setSaveDone(false)
    setSaveError(null)
    setRecordName("")
    setPlaying(false)
  }

  async function saveRecording() {
    if (!recorded || !recordName.trim()) return
    setSaving(true); setSaveError(null)
    try {
      const file = new File([recorded], "recording.webm", { type: "audio/mpeg" })
      const form = new FormData()
      form.append("name", recordName.trim())
      form.append("file", file)
      await api.post("/cloning/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setSaveDone(true)
      discard()
      fetchClones()
    } catch (err: any) {
      const raw = err?.response?.data?.detail
      setSaveError(typeof raw === "string" ? raw : "Save failed.")
    } finally {
      setSaving(false)
    }
  }

  async function deleteClone(id: string) {
    await api.delete(`/cloning/${id}`)
    setClones(prev => prev.filter(c => c.id !== id))
  }

  function fmt(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
  }

  const tooShort   = recSeconds < MIN_REC_SEC
  const recProgress = Math.min((recSeconds / MAX_REC_SEC) * 100, 100)

  if (!unlocked) return <PassGate onUnlock={() => setUnlocked(true)} />

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">

      {/* ── Header ── */}
      <div className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
          <Wand2 className="h-3 w-3" /> Lab · Voice Cloning
        </div>
        <h1 className="text-2xl font-bold text-white">Clone a voice</h1>
        <p className="mt-1 text-sm text-white/40">
          Upload a recording or record directly. {MIN_REC_SEC}–{MAX_REC_SEC} seconds of clean speech works best.
        </p>
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
                <p className="mt-0.5 text-xs text-white/30">
                  {MIN_REC_SEC}–{MAX_REC_SEC} seconds · max 30 MB
                </p>
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
                <button onClick={() => { setUploadFile(null); setUploadError(null) }} className="text-white/30 hover:text-white transition-colors">
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
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {uploadError}
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
                {uploading
                  ? <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  : "Save voice clone"
                }
              </button>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="audio/wav,audio/mp3,audio/mpeg,.wav,.mp3"
            className="hidden"
            onChange={pickFile}
          />
        </div>
      )}

      {/* ── Record tab ── */}
      {tab === "record" && (
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-6 space-y-5">

          {/* Script */}
          <div className="rounded-xl border border-white/8 bg-white/[.02] p-4">
            <p className="mb-2 text-xs font-medium text-white/30">Read this aloud naturally</p>
            <p className="text-sm leading-7 text-white/65 italic">"{RECORD_SCRIPT}"</p>
          </div>

          {!recorded ? (
            <div className="space-y-4">
              {/* Waveform */}
              {recording ? <LiveWaveform stream={stream} /> : <IdleWave />}

              {/* Timer + progress */}
              {recording && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-white/40">
                    <span className="tabular-nums text-violet-300">{fmt(recSeconds)}</span>
                    <span>{tooShort ? `${MIN_REC_SEC - recSeconds}s more needed` : "Good — stop when ready"}</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all"
                      style={{ width: `${recProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Record button */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={recording ? stopRec : startRec}
                  disabled={recording && tooShort}
                  className={`flex h-14 w-14 items-center justify-center rounded-full transition-all disabled:opacity-40 ${
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
                  {recording
                    ? tooShort
                      ? `Keep going — minimum ${MIN_REC_SEC}s`
                      : "Tap to stop"
                    : "Tap to start"
                  }
                </p>
              </div>

              {saveError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {saveError}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Playback row */}
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <button
                  onClick={playback}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-300 transition hover:bg-violet-500/40"
                >
                  {playing
                    ? <Pause className="h-3.5 w-3.5 fill-current" />
                    : <Play className="h-3.5 w-3.5 ml-0.5 fill-current" />
                  }
                </button>
                <div className="flex-1">
                  <p className="text-sm text-white">Recording</p>
                  <p className="text-xs text-white/30">{fmt(recSeconds)} recorded</p>
                </div>
                <button
                  onClick={discard}
                  className="text-white/30 hover:text-red-400 transition-colors"
                  title="Discard and re-record"
                >
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
                <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {saveError}
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
                {saving
                  ? <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  : "Save voice clone"
                }
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Clones list ── */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-white/40">
          Your clones {clones.length > 0 && <span className="text-white/20">({clones.length}/10)</span>}
        </h2>
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
              <div
                key={clone.id}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[.03] px-4 py-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-semibold text-violet-300">
                  {clone.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-white">{clone.name}</p>
                  <p className="text-xs text-white/30">
                    {clone.duration_seconds ? `${clone.duration_seconds}s · ` : ""}
                    {new Date(clone.created_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => router.push(`/generate?voice=clone_${clone.id}`)}
                    className="flex items-center gap-1.5 rounded-lg bg-violet-600/20 px-3 py-1.5 text-xs font-medium text-violet-300 transition hover:bg-violet-600/40"
                  >
                    Use <ArrowRight className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => deleteClone(clone.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-white/20 transition hover:text-red-400"
                    title="Delete clone"
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