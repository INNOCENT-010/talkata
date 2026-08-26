"use client"

import { useEffect, useState, useRef } from "react"
import { useAuthStore } from "@/store/authStore"
import { useRouter } from "next/navigation"
import { generateAPI, voicesAPI } from "@/lib/api"
import { Mic2, Zap, Download, ChevronDown, Clock, Play, Square } from "lucide-react"
import Button from "@/components/ui/Button"

const CACHE_KEY       = "talkata_draft_text"
const VOICE_CACHE_KEY = "talkata_draft_voice"
const POLL_INTERVAL   = 3000
const POLL_TIMEOUT    = 10 * 60 * 1000

interface Voice {
  id: string
  name: string
  gender: string
  accent: string
  description: string
  preview_url?: string
}

// ── Tiny inline preview player ────────────────────────────────────────────────
function PreviewButton({ url, voiceId }: { url?: string; voiceId: string }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!url) return

    const existing = (window as any).__talkataPreview as HTMLAudioElement | undefined
    if (existing && existing !== audioRef.current) {
      existing.pause()
      existing.src = ""
    }

    if (playing && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
      audioRef.current = null
      delete (window as any).__talkataPreview
      setPlaying(false)
      return
    }

    const audio = new Audio(url)
    audioRef.current = audio
    ;(window as any).__talkataPreview = audio
    audio.play()
    setPlaying(true)
    audio.onended = () => {
      setPlaying(false)
      audioRef.current = null
      delete (window as any).__talkataPreview
    }
  }

  useEffect(() => () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
  }, [])

  if (!url) return null

  return (
    <button
      onClick={toggle}
      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
        playing
          ? "bg-violet-500/30 text-violet-300"
          : "bg-white/10 text-white/50 hover:bg-violet-500/20 hover:text-violet-400"
      }`}
      title={playing ? "Stop preview" : "Preview voice"}
    >
      {playing
        ? <Square className="w-2.5 h-2.5 fill-current" />
        : <Play className="w-2.5 h-2.5 ml-0.5 fill-current" />
      }
    </button>
  )
}

export default function GeneratePage() {
  const { user, fetchUser } = useAuthStore()
  const router = useRouter()
  const [text, setText] = useState("")
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null)
  const [speed, setSpeed] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingVoices, setIsLoadingVoices] = useState(true)
  const [voiceOpen, setVoiceOpen] = useState(false)
  const [result, setResult] = useState<{ url: string; credits_used: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  // For positioning the dropdown via fixed coords
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) setText(cached)

    voicesAPI.list().then((res) => {
      const v = res.data.voices
      setVoices(v)
      const cachedVoiceId = localStorage.getItem(VOICE_CACHE_KEY)
      const match = v.find((x: Voice) => x.id === cachedVoiceId)
      setSelectedVoice(match ?? v[0])
      if (!match) localStorage.removeItem(VOICE_CACHE_KEY)
    }).finally(() => setIsLoadingVoices(false))

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  useEffect(() => { localStorage.setItem(CACHE_KEY, text) }, [text])
  useEffect(() => {
    if (selectedVoice) localStorage.setItem(VOICE_CACHE_KEY, selectedVoice.id)
  }, [selectedVoice])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) setVoiceOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Reposition dropdown whenever it opens
  useEffect(() => {
    if (!voiceOpen || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const dropH = Math.min(320, window.innerHeight * 0.55)

    if (spaceBelow >= dropH) {
      // Open downward
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        maxHeight: dropH,
        zIndex: 9999,
      })
    } else {
      // Open upward
      setDropdownStyle({
        position: "fixed",
        bottom: window.innerHeight - rect.top + 6,
        left: rect.left,
        width: rect.width,
        maxHeight: dropH,
        zIndex: 9999,
      })
    }
  }, [voiceOpen])

  const CHARS_PER_MINUTE = 800
  const CREDITS_PER_MIN  = 1000
  const MIN_CREDITS      = 100
  const creditCost = Math.max(MIN_CREDITS, Math.round((text.length / CHARS_PER_MINUTE) * CREDITS_PER_MIN))

  const pollJobStatus = (jobId: string) => {
    const startTime = Date.now()
    pollRef.current = setInterval(async () => {
      if (Date.now() - startTime > POLL_TIMEOUT) {
        clearInterval(pollRef.current!)
        setIsGenerating(false)
        setStatusMsg(null)
        setError("Generation is taking longer than expected. Check History — it may still complete.")
        return
      }
      try {
        const res = await generateAPI.status(jobId)
        const job = res.data
        if (job.status === "complete") {
          clearInterval(pollRef.current!)
          setResult({ url: job.audio_url, credits_used: job.credits_used })
          setStatusMsg(null)
          setIsGenerating(false)
          await fetchUser()
        } else if (job.status === "failed") {
          clearInterval(pollRef.current!)
          setError(job.error ?? "Generation failed.")
          setStatusMsg(null)
          setIsGenerating(false)
        } else {
          const elapsed = Math.round((Date.now() - startTime) / 1000)
          setStatusMsg(
            job.status === "queued"
              ? "Queued — waiting for worker..."
              : `Processing your audio... ${elapsed}s`
          )
        }
      } catch { /* network blip */ }
    }, POLL_INTERVAL)
  }

  const handleGenerate = async () => {
    if (!text.trim() || !selectedVoice) return
    setIsGenerating(true)
    setError(null)
    setStatusMsg("Submitting job...")
    try {
      await generateAPI.create({ text: text.trim(), voice_id: selectedVoice.id, speed })
      router.push("/history?processing=true")
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Generation failed. Is the ML worker online?")
      setIsGenerating(false)
      setStatusMsg(null)
    }
  }

  const clearCache = () => {
    localStorage.removeItem(CACHE_KEY)
    setText("")
    setResult(null)
  }

  if (isLoadingVoices) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse">
        <div className="h-8 w-48 bg-white/10 rounded mb-2" />
        <div className="h-4 w-64 bg-white/5 rounded mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-6">
          <div className="h-72 bg-white/5 rounded-xl" />
          <div className="flex flex-col gap-4">
            <div className="h-24 bg-white/5 rounded-xl" />
            <div className="h-36 bg-white/5 rounded-xl" />
            <div className="h-20 bg-white/5 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Generate Voice</h1>
        <p className="text-white/50 mt-1">Type your text, pick a voice, and generate</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-6">

        {/* ── Left — text area ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-white/40">
              <span>Your Text</span>
              <div className="flex items-center gap-3">
                <span>{text.length} characters</span>
                {text.length > 0 && (
                  <button onClick={clearCache} className="text-red-400/60 hover:text-red-400 transition-colors">
                    Clear
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter any text here — no character limit. Paste an entire script, article, or book chapter..."
              className="bg-transparent text-white text-sm leading-relaxed resize-none outline-none placeholder:text-white/20 min-h-[280px]"
            />
          </div>

          {statusMsg && (
            <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 flex items-center gap-3">
              <Clock className="w-4 h-4 text-violet-400 shrink-0 animate-pulse" />
              <div>
                <p className="text-violet-300 text-sm font-medium">{statusMsg}</p>
                <p className="text-white/40 text-xs mt-0.5">
                  You can leave this page — check History to find your audio when done.
                </p>
              </div>
            </div>
          )}

          {result && (
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-green-400 text-sm font-medium">Generation complete</span>
                <span className="text-white/40 text-xs">{result.credits_used.toLocaleString()} credits used</span>
              </div>
              <audio controls className="w-full mb-3" src={result.url} />
              <a href={result.url} download className="flex items-center gap-2 text-violet-400 text-sm hover:text-violet-300 transition-colors">
                <Download className="w-4 h-4" />
                Download audio
              </a>
            </div>
          )}

          {error && (
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <Button
            onClick={handleGenerate}
            isLoading={isGenerating}
            disabled={!text.trim() || isGenerating || (user?.credits ?? 0) < creditCost}
            className="w-full"
          >
            <Mic2 className="w-4 h-4" />
            {isGenerating ? "Generating..." : `Generate — ${creditCost.toLocaleString()} credits`}
          </Button>
        </div>

        {/* ── Right panel ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Credits */}
          <div className="bg-violet-600/10 border border-violet-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-violet-400" />
              <span className="text-violet-400 text-sm">Available Credits</span>
            </div>
            <p className="text-white text-2xl font-bold">{(user?.credits ?? 0).toLocaleString()}</p>
          </div>

          {/* Voice selector — no overflow-hidden on the card */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-white/60 text-sm mb-3">Voice</p>

            {/* Selected voice card */}
            {selectedVoice && (
              <div className="bg-white/5 border border-violet-500/20 rounded-lg px-3 py-2.5 mb-2 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{selectedVoice.name}</p>
                  <p className="text-white/40 text-xs mt-0.5 line-clamp-2">{selectedVoice.description}</p>
                </div>
                <PreviewButton url={selectedVoice.preview_url} voiceId={selectedVoice.id} />
              </div>
            )}

            {/* Dropdown trigger — measured for portal positioning */}
            <button
              ref={triggerRef}
              onClick={() => setVoiceOpen(!voiceOpen)}
              className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white/60 text-sm hover:border-white/20 transition-colors"
            >
              <span>Change voice</span>
              <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${voiceOpen ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Speed */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/60 text-sm">Speed</p>
              <span className="text-white text-sm font-medium">{speed}x</span>
            </div>
            <input
              type="range" min={0.5} max={2} step={0.1} value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-white/30 text-xs mt-1">
              <span>0.5x</span>
              <span>2.0x</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Dropdown portal — fixed positioned, always on top ──────────────── */}
      {voiceOpen && (
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-y-auto"
        >
          {(["male", "female"] as const).map((gender) => {
            const group = voices.filter(v => v.gender === gender)
            if (!group.length) return null
            return (
              <div key={gender}>
                <div className="px-4 py-2 bg-white/[0.03] border-b border-white/5 sticky top-0">
                  <span className="text-white/30 text-xs font-medium uppercase tracking-wider">
                    {gender === "male" ? "Male Narrators" : "Female Narrators"}
                  </span>
                </div>
                {group.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => { setSelectedVoice(v); setVoiceOpen(false) }}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${
                      selectedVoice?.id === v.id ? "bg-violet-600/20" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium truncate ${selectedVoice?.id === v.id ? "text-white" : "text-white/80"}`}>
                          {v.name}
                        </p>
                        <p className="text-white/35 text-xs mt-0.5 truncate">{v.accent}</p>
                      </div>
                      <PreviewButton url={v.preview_url} voiceId={v.id} />
                    </div>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
