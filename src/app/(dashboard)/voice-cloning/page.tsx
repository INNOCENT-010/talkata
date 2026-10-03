"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import api from "@/lib/api"
import { isAxiosError } from "axios"
import ClonePreview from "@/components/voices/ClonePreview"
import {
  Mic, Upload, Square, Play, Trash2, Check,
  Loader2, AlertCircle, Wand2, X, Pause
} from "lucide-react"
import { useRouter } from "next/navigation"

const MIN_REC_SEC    = 6
const MAX_REC_SEC    = 120
const RECORD_SCRIPT  = `This is a sample of my natural voice. I am speaking at a comfortable pace, with a clear and relaxed tone. Some days are quiet, and others are full of new ideas. Each story has its own rhythm. I look forward to bringing those stories to life.`

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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VoiceCloningPage() {
  const router   = useRouter()

  const [previewId, setPreviewId] = useState<string | null>(null)
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
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
  const uploadUrlRef = useRef<string | null>(null)

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
  const streamRef = useRef<MediaStream | null>(null)
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
      .catch(() => setUploadError("Could not load your voices. Please refresh."))
      .finally(() => setLoadingClones(false))
  }, [])

  useEffect(() => {
    queueMicrotask(fetchClones)
  }, [fetchClones])


  // Auto-stop at max duration
  useEffect(() => {
    if (recSeconds >= MAX_REC_SEC && recording) {
      const timeout = setTimeout(stopRec, 0)
      return () => clearTimeout(timeout)
    }
  }, [recSeconds, recording])

  // Cleanup blob URL on unmount
  useEffect(() => () => {
    if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current)
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    if (mediaRef.current?.state === "recording") { mediaRef.current.onstop = null; mediaRef.current.stop() }
    streamRef.current?.getTracks().forEach(track => track.stop())
    audioRef.current?.pause()
  }, [])

  // ── Upload flow ──────────────────────────────────────────────────────────
  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 30 * 1024 * 1024) { setUploadError("Maximum file size is 30 MB."); return }
    if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current)
    uploadUrlRef.current = URL.createObjectURL(f)
    setUploadUrl(uploadUrlRef.current)
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
      const response = await api.post("/cloning/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setPreviewId(response.data.clone_id)
      setUploadDone(true)
      setUploadFile(null)
      setUploadName("")
      fetchClones()
    } catch (err: unknown) {
      const raw = isAxiosError(err) ? err.response?.data?.detail : null
      setUploadError(typeof raw === "string" ? raw : "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  // ── Record flow ──────────────────────────────────────────────────────────
  async function startRec() {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = ms
      setStream(ms)
      const mimeType = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"]
        .find(type => MediaRecorder.isTypeSupported(type))
      const mr = new MediaRecorder(ms, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType })
        setRecorded(blob)
        ms.getTracks().forEach(t => t.stop())
        streamRef.current = null
        setStream(null)
      }
      mr.start(100)
      mediaRef.current = mr
      setRecording(true)
      setRecSeconds(0)
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000)
    } catch {
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
      setStream(null)
      setSaveError("Microphone recording could not start. Please allow microphone access and try again.")
    }
  }

  function stopRec() {
    if (mediaRef.current?.state === "recording") mediaRef.current.stop()
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
      const mime = recorded.type.split(";")[0] || "audio/webm"
      const extension = mime === "audio/mp4" ? "m4a" : mime === "audio/ogg" ? "ogg" : "webm"
      const file = new File([recorded], `recording.${extension}`, { type: mime })
      const form = new FormData()
      form.append("name", recordName.trim())
      form.append("file", file)
      const response = await api.post("/cloning/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setPreviewId(response.data.clone_id)
      discard()
      setSaveDone(true)
      fetchClones()
    } catch (err: unknown) {
      const raw = isAxiosError(err) ? err.response?.data?.detail : null
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


  return (
    <div className="mx-auto max-w-2xl px-4 py-10">

      {/* ── Header ── */}
      <div className="mb-8">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
          <Wand2 className="h-3 w-3" /> Voice Cloning
        </div>
        <h1 className="text-2xl font-bold text-white">Clone a voice</h1>
        <p className="mt-1 text-sm text-white/40">
          Upload or record 5 to 120 seconds of clear English speech. A clean 10 to 30 second sample is recommended; cloning uses the first 30 seconds.
        </p>
      </div>

      {(uploadDone || saveDone) && <div role="status" className="mb-6 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">Your voice is saved. Open its generated preview below to hear new speech in this voice.</div>}

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
                <p className="text-sm font-medium text-white/70">Choose an audio recording</p>
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
              <p className="text-xs text-white/50">Listen to your reference, then name this voice.</p>
              {uploadUrl && <audio controls preload="metadata" src={uploadUrl} className="w-full" />}
              <input
                value={uploadName}
                onChange={e => setUploadName(e.target.value)}
                maxLength={80}
                aria-label="Voice name"
                placeholder="Voice name, e.g. My narration voice"
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
            accept="audio/wav,audio/mp3,audio/mpeg,audio/mp4,audio/webm,audio/ogg,.wav,.mp3,.m4a,.mp4,.webm,.ogg"
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
            <p className="text-sm leading-7 text-white/65 italic">&ldquo;{RECORD_SCRIPT}&rdquo;</p>
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
                maxLength={80}
                aria-label="Voice name"
                placeholder="Voice name, e.g. My narration voice"
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
          Your saved voices {clones.length > 0 && <span className="text-white/20">({clones.length}/10)</span>}
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
            {clones.map(clone => <SavedVoice key={clone.id} clone={clone} open={previewId === clone.id}
              onPreview={() => setPreviewId(previewId === clone.id ? null : clone.id)}
              onRename={name => setClones(list => list.map(item => item.id === clone.id ? { ...item, name } : item))}
              onDelete={() => deleteClone(clone.id)}
              onUse={() => router.push(`/generate?voice=clone_${clone.id}`)} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function SavedVoice({ clone, open, onPreview, onRename, onDelete, onUse }: {
  clone: Clone; open: boolean; onPreview: () => void; onRename: (name: string) => void;
  onDelete: () => Promise<void>; onUse: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(clone.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  async function rename() {
    setBusy(true); setError("")
    try { const response = await api.patch(`/cloning/${clone.id}`, { name: name.trim() }); onRename(response.data.name); setEditing(false) }
    catch { setError("Couldn’t rename this voice. Please try again.") }
    finally { setBusy(false) }
  }
  async function remove() {
    if (!window.confirm(`Delete “${clone.name}”?`)) return
    setBusy(true); setError("")
    try { await onDelete() } catch { setError("Couldn’t delete this voice. Please try again."); setBusy(false) }
  }
  return <article className="rounded-2xl border border-white/10 bg-white/[.03] p-4 sm:p-5">
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-sm font-semibold text-violet-300">{clone.name.slice(0, 2).toUpperCase()}</div>
      <div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold text-white">{clone.name}</h3><p className="mt-1 text-xs text-white/40">{clone.duration_seconds ? `${clone.duration_seconds}s reference · ` : ""}{new Date(clone.created_at).toLocaleDateString()}</p></div>
    </div>
    {editing && <form onSubmit={event => { event.preventDefault(); rename() }} className="mt-3 flex flex-wrap gap-2">
      <input autoFocus aria-label="New voice name" maxLength={80} value={name} onChange={event => setName(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white" />
      <button disabled={busy || !name.trim()} className="rounded-lg bg-violet-600 px-3 py-2 text-sm text-white disabled:opacity-40">Save name</button>
      <button type="button" onClick={() => setEditing(false)} className="px-2 text-sm text-white/50">Cancel</button>
    </form>}
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <button type="button" onClick={onPreview} aria-expanded={open} className="rounded-lg border border-violet-400/20 px-3 py-2 text-xs font-medium text-violet-200">{open ? "Hide preview" : "Hear generated preview"}</button>
      <button type="button" onClick={onUse} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white">Use voice</button>
      <button type="button" disabled={busy} onClick={() => { setName(clone.name); setEditing(true) }} className="px-2 py-2 text-xs text-white/60">Rename</button>
      <button type="button" disabled={busy} onClick={remove} aria-label={`Delete ${clone.name}`} className="ml-auto rounded-lg p-2 text-white/40 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    {open && <ClonePreview key={clone.id} cloneId={clone.id} name={clone.name} />}
  </article>
}
