"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
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
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
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
      audioRef.current.pause()
      audioRef.current = null
      setPlaying(false)
      return
    }
    try {
      const res = await api.get(`/cloning/${cloneId}/url`)
      const audio = new Audio(res.data.url)
      audioRef.current = audio
      audio.play()
      setPlaying(true)
      audio.onended = () => { setPlaying(false); audioRef.current = null }
    } catch { alert("Could not load preview") }
  }

  useEffect(() => () => { if (audioRef.current) audioRef.current.pause() }, [])

  return (
    <button
      onClick={toggle}
      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
        playing
          ? "bg-violet-500 text-white"
          : "bg-white/10 text-white/40 hover:bg-violet-500/20 hover:text-violet-300"
      }`}
      title={playing ? "Stop" : "Preview"}
    >
      {playing
        ? <Square className="w-2.5 h-2.5 fill-current" />
        : <Play className="w-2.5 h-2.5 ml-0.5 fill-current" />
      }
    </button>
  )
}

// ── Noise reduction via Web Audio API ─────────────────────────────────────────
// Applies high-pass filter + dynamics compressor to clean the recording
// Returns a cleaned Blob ready to upload
async function applyNoiseReduction(rawBlob: Blob): Promise<Blob> {
  const arrayBuffer = await rawBlob.arrayBuffer()
  const audioCtx    = new AudioContext()
  const decoded     = await audioCtx.decodeAudioData(arrayBuffer)

  // Create offline context at same specs as input
  const offlineCtx = new OfflineAudioContext(
    decoded.numberOfChannels,
    decoded.length,
    decoded.sampleRate
  )

  const source = offlineCtx.createBufferSource()
  source.buffer = decoded

  // 1. High-pass filter — removes low-frequency rumble (AC hum, desk vibration)
  const highPass = offlineCtx.createBiquadFilter()
  highPass.type            = "highpass"
  highPass.frequency.value = 80   // cut below 80Hz
  highPass.Q.value         = 0.7

  // 2. Low-pass filter — removes very high frequency hiss
  const lowPass = offlineCtx.createBiquadFilter()
  lowPass.type            = "lowpass"
  lowPass.frequency.value = 8000  // cut above 8kHz

  // 3. Dynamics compressor — evens out volume, reduces sudden loud spikes
  const compressor = offlineCtx.createDynamicsCompressor()
  compressor.threshold.value = -24
  compressor.knee.value      = 30
  compressor.ratio.value     = 4
  compressor.attack.value    = 0.003
  compressor.release.value   = 0.25

  // 4. Gain — bring final level back up after compression
  const gain = offlineCtx.createGain()
  gain.gain.value = 1.4

  // Chain: source → highPass → lowPass → compressor → gain → destination
  source.connect(highPass)
  highPass.connect(lowPass)
  lowPass.connect(compressor)
  compressor.connect(gain)
  gain.connect(offlineCtx.destination)

  source.start(0)
  const rendered = await offlineCtx.startRendering()

  // Convert AudioBuffer back to WAV blob
  const wavBlob = audioBufferToWav(rendered)
  await audioCtx.close()
  return wavBlob
}

// Minimal AudioBuffer → WAV encoder
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numCh     = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const length    = buffer.length * numCh * 2 + 44
  const view      = new DataView(new ArrayBuffer(length))

  const writeStr = (offset: number, str: string) =>
    [...str].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))
  const writeU16 = (offset: number, v: number) => view.setUint16(offset, v, true)
  const writeU32 = (offset: number, v: number) => view.setUint32(offset, v, true)

  writeStr(0, "RIFF")
  writeU32(4, length - 8)
  writeStr(8, "WAVE")
  writeStr(12, "fmt ")
  writeU32(16, 16)
  writeU16(20, 1)                         // PCM
  writeU16(22, numCh)
  writeU32(24, sampleRate)
  writeU32(28, sampleRate * numCh * 2)
  writeU16(32, numCh * 2)
  writeU16(34, 16)
  writeStr(36, "data")
  writeU32(40, buffer.length * numCh * 2)

  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([view], { type: "audio/wav" })
}

// ── Recorder component ────────────────────────────────────────────────────────
type RecorderState = "idle" | "recording" | "processing" | "ready"

function VoiceRecorder({
  onReady,
  onReset,
}: {
  onReady: (file: File, duration: number) => void
  onReset: () => void
}) {
  const [state, setState]     = useState<RecorderState>("idle")
  const [elapsed, setElapsed] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [duration, setDuration]     = useState(0)
  const mediaRef  = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef  = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
  ? "audio/webm;codecs=opus"
  : MediaRecorder.isTypeSupported("audio/webm")
  ? "audio/webm"
  : ""
const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRef.current  = mr
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
  stream.getTracks().forEach(t => t.stop())
  setState("processing")
  try {
    const rawBlob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" })

    // Verify raw blob has content before processing
    if (rawBlob.size < 1000) {
      throw new Error("Recording too small — microphone may not have captured audio")
    }

    const cleanBlob = await applyNoiseReduction(rawBlob)

    // Verify cleaned output has content
    if (cleanBlob.size < 1000) {
      throw new Error("Noise reduction produced empty output — falling back to raw")
    }

    const url = URL.createObjectURL(cleanBlob)
    setPreviewUrl(url)
    setDuration(elapsed)
    setState("ready")
    const file = new File([cleanBlob], "recording.wav", { type: "audio/wav" })
    onReady(file, elapsed)

  } catch (e) {
    console.warn("Noise reduction failed, using raw recording:", e)
    // Fall back to raw blob — keep original mime type so browser can play it
    const rawBlob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" })
    const url = URL.createObjectURL(rawBlob)
    setPreviewUrl(url)
    setDuration(elapsed)
    setState("ready")
    // Still send as wav filename but with correct content
    const file = new File([rawBlob], "recording.wav", { type: rawBlob.type })
    onReady(file, elapsed)
  }
}
      mr.start(100) // collect chunks every 100ms
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
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setState("idle")
    setElapsed(0)
    setPreviewUrl(null)
    setDuration(0)
    onReset()
  }

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  if (state === "idle") return (
    <button
      onClick={start}
      className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-white/10 hover:border-red-500/30 hover:bg-red-500/5 rounded-xl py-8 text-white/40 hover:text-red-300 transition-all text-sm"
    >
      <Circle className="w-4 h-4 text-red-400" />
      Click to start recording
    </button>
  )

  if (state === "recording") return (
    <div className="flex flex-col items-center gap-4 bg-red-500/5 border border-red-500/20 rounded-xl p-6">
      {/* Animated bars */}
      <div className="flex items-center gap-1 h-8">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="w-1 bg-red-400 rounded-full animate-pulse"
            style={{
              height: `${20 + Math.random() * 60}%`,
              animationDelay: `${i * 0.08}s`,
              animationDuration: "0.6s",
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
        <span className="text-red-400 text-sm font-medium tabular-nums">
          {Math.floor(elapsed / 60).toString().padStart(2, "0")}:{(elapsed % 60).toString().padStart(2, "0")}
        </span>
      </div>
      <p className="text-white/30 text-xs text-center">
        Speak clearly — read naturally. Noise reduction will be applied automatically.
      </p>
      <button
        onClick={stop}
        disabled={elapsed < 6}
        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
          elapsed >= 6
            ? "bg-red-500 hover:bg-red-400 text-white"
            : "bg-white/5 text-white/25 cursor-not-allowed"
        }`}
      >
        <StopCircle className="w-4 h-4" />
        {elapsed < 6 ? `Record at least ${6 - elapsed}s more` : "Stop & Clean Recording"}
      </button>
    </div>
  )

  if (state === "processing") return (
    <div className="flex flex-col items-center gap-3 bg-violet-600/5 border border-violet-500/20 rounded-xl p-6">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      <p className="text-violet-300 text-sm font-medium">Applying noise reduction...</p>
      <p className="text-white/25 text-xs">High-pass filter · Compressor · Gain normalisation</p>
    </div>
  )

  // ready
  return (
    <div className="flex flex-col gap-3 bg-violet-600/5 border border-violet-500/20 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-400" />
          <span className="text-white text-sm font-medium">
            Recording ready — {formatDuration(duration)}
          </span>
        </div>
        <button onClick={reset} className="text-white/30 hover:text-red-400 transition-colors" title="Re-record">
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-white/30 text-xs">✓ Noise reduced · Ready to upload</p>
      {previewUrl && (
        <audio controls src={previewUrl} className="w-full h-8 mt-1" />
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VoiceCloningPage() {
  const searchParams = useSearchParams()
  const justAccepted = searchParams.get("accepted") === "1"

  const [clones, setClones]               = useState<Clone[]>([])
  const [sharedWithMe, setSharedWithMe]   = useState<SharedVoice[]>([])
  const [isLoading, setIsLoading]         = useState(true)
  const [isUploading, setIsUploading]     = useState(false)
  const [uploadName, setUploadName]       = useState("")
  const [selectedFile, setSelectedFile]   = useState<File | null>(null)
  const [fileDuration, setFileDuration]   = useState<number | null>(null)
  const [fileError, setFileError]         = useState<string | null>(null)
  const [shareLinks, setShareLinks]       = useState<Record<string, string>>({})
  const [togglingShare, setTogglingShare] = useState<string | null>(null)
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [inputMode, setInputMode]         = useState<"upload" | "record">("upload")
  const [acceptBanner, setAcceptBanner]   = useState(justAccepted)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const MAX_CLONES = 10

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

  useEffect(() => {
    fetchAll().finally(() => setIsLoading(false))
    if (justAccepted) setTimeout(() => setAcceptBanner(false), 5000)
  }, [])

  // ── File upload handler ───────────────────────────────────────────────────
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
      if (dur < 6)  { setFileError("Too short — minimum 6 seconds."); setSelectedFile(null); setFileDuration(null); return }
      if (dur > 120) { setFileError("Too long — maximum 2 minutes."); setSelectedFile(null); setFileDuration(null); return }
      setFileDuration(dur)
    }
    audio.onerror = () => { setFileError("Could not read file — try WAV or MP3."); setSelectedFile(null) }
  }

  // ── Upload to backend ─────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!selectedFile || !uploadName.trim()) return
    setIsUploading(true)
    try {
      const form = new FormData()
      form.append("name", uploadName.trim())
      form.append("file", selectedFile)
      await api.post("/cloning/upload", form, {
        headers: { "Content-Type": "multipart/form-data" }
      })
      setUploadName("")
      setSelectedFile(null)
      setFileDuration(null)
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
    } catch { alert("Could not delete") }
    finally { setDeletingId(null) }
  }

  const handleRemoveShared = async (accessId: string) => {
    if (!confirm("Remove this shared voice from your library?")) return
    try {
      await api.delete(`/cloning/shared-with-me/${accessId}`)
      await fetchAll()
    } catch { alert("Could not remove") }
  }

  // Can submit when: name filled + file selected + no file error
  const canSubmit = !!selectedFile && !!uploadName.trim() && !fileError && !isUploading

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

      {/* Accepted banner */}
      {acceptBanner && (
        <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-4 mb-6">
          <Check className="w-4 h-4 text-green-400 shrink-0" />
          <p className="text-green-300 text-sm font-medium">Voice added to your library — find it in Shared With Me below.</p>
          <button onClick={() => setAcceptBanner(false)} className="ml-auto text-white/20 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-4 mb-6">
        <Info className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
        <div className="text-white/40 text-sm leading-relaxed">
          Upload or record a <span className="text-white/60">6–120 second</span> clean audio clip.
          Noise reduction is applied automatically before upload.
          Shared voices can be used by others with their own credits.
        </div>
      </div>

      {/* ── Upload / Record section ──────────────────────────────────────── */}
      {!atLimit && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
          <p className="text-white font-medium text-sm mb-4">Create a new voice clone</p>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-4">
            {(["upload", "record"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => {
                  setInputMode(mode)
                  setSelectedFile(null)
                  setFileDuration(null)
                  setFileError(null)
                  if (fileInputRef.current) fileInputRef.current.value = ""
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  inputMode === mode
                    ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                    : "bg-white/5 text-white/40 hover:text-white/60"
                }`}
              >
                {mode === "upload" ? <Upload className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                {mode === "upload" ? "Upload file" : "Record now"}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {/* Name always visible */}
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
                    selectedFile
                      ? "border-violet-500/40 bg-violet-600/5"
                      : "border-white/10 hover:border-violet-500/30"
                  }`}
                >
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <Mic className="w-8 h-8 text-violet-400" />
                      <p className="text-white text-sm font-medium">{selectedFile.name}</p>
                      {fileDuration && (
                        <p className="text-green-400 text-xs">
                          ✓ {formatDuration(fileDuration)} — looks good
                        </p>
                      )}
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setSelectedFile(null)
                          setFileDuration(null)
                          if (fileInputRef.current) fileInputRef.current.value = ""
                        }}
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/wav,audio/mp3,audio/mpeg"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </>
            ) : (
              <VoiceRecorder
                onReady={(file, dur) => {
                  setSelectedFile(file)
                  setFileDuration(dur)
                  setFileError(null)
                }}
                onReset={() => {
                  setSelectedFile(null)
                  setFileDuration(null)
                }}
              />
            )}

            {fileError && <p className="text-red-400 text-xs">{fileError}</p>}

            {/* Generate button — violet when ready, muted when not */}
            <button
              onClick={handleUpload}
              disabled={!canSubmit}
              className={`flex items-center justify-center gap-2 text-sm font-medium px-4 py-3 rounded-xl transition-all ${
                canSubmit
                  ? "bg-violet-600 hover:bg-violet-500 text-white"
                  : "bg-white/5 text-white/20 cursor-not-allowed"
              }`}
            >
              <Plus className="w-4 h-4" />
              {isUploading ? "Creating clone..." : "Create Voice Clone"}
            </button>

            {/* Hint when waiting for recording */}
            {inputMode === "record" && !selectedFile && (
              <p className="text-white/20 text-xs text-center">
                Record at least 6 seconds to unlock the button
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── My Clones ──────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-3">
          My Voices
          {clones.length > 0 && (
            <span className="ml-2 text-white/30">{clones.length}/{MAX_CLONES}</span>
          )}
        </h2>
        {clones.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl py-10 text-center text-white/25 text-sm">
            No voice clones yet — upload or record one above.
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {clones.map((clone, i) => (
              <div
                key={clone.id}
                className={`flex items-center gap-4 px-5 py-4 ${
                  i < clones.length - 1 ? "border-b border-white/5" : ""
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Mic className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{clone.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
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
                      <p className="text-white/30 text-xs font-mono truncate flex-1">
                        {shareLinks[clone.id]}
                      </p>
                      <CopyButton text={shareLinks[clone.id]} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <AudioPreviewButton cloneId={clone.id} />
                  <a
                    href={`/generate?voice=clone_${clone.id}`}
                    className="text-xs bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    Use
                  </a>
                  <button
                    onClick={() => handleToggleShare(clone.id)}
                    disabled={togglingShare === clone.id}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      clone.is_shared
                        ? "bg-violet-500/20 text-violet-400 hover:bg-red-500/20 hover:text-red-400"
                        : "bg-white/10 text-white/40 hover:bg-violet-500/20 hover:text-violet-300"
                    }`}
                    title={clone.is_shared ? "Disable sharing" : "Share this voice"}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(clone.id)}
                    disabled={deletingId === clone.id}
                    className="w-7 h-7 rounded-full bg-white/5 text-white/25 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Shared with me ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-3">
          Shared With Me
          {sharedWithMe.length > 0 && (
            <span className="ml-2 text-violet-400">{sharedWithMe.length}</span>
          )}
        </h2>
        {sharedWithMe.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-xl py-10 text-center text-white/25 text-sm">
            No voices shared with you yet.<br />
            Ask a friend to share their clone link.
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {sharedWithMe.map((v, i) => (
              <div
                key={v.access_id}
                className={`flex items-center gap-4 px-5 py-4 ${
                  i < sharedWithMe.length - 1 ? "border-b border-white/5" : ""
                }`}
              >
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
                    className="text-xs bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    Use
                  </a>
                  <button
                    onClick={() => handleRemoveShared(v.access_id)}
                    className="w-7 h-7 rounded-full bg-white/5 text-white/25 hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-all"
                    title="Remove from library"
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