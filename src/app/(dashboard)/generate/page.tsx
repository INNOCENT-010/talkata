"use client"

import { useEffect, useState, useRef } from "react"
import { useAuthStore } from "@/store/authStore"
import { generateAPI, voicesAPI } from "@/lib/api"
import { Mic2, Zap, Download, ChevronDown, Clock } from "lucide-react"
import Button from "@/components/ui/Button"

const CACHE_KEY = "talkata_draft_text"
const VOICE_CACHE_KEY = "talkata_draft_voice"
const POLL_INTERVAL = 3000       // check every 3 seconds
const POLL_TIMEOUT = 10 * 60 * 1000  // give up after 10 minutes

interface Voice {
  id: string
  name: string
  gender: string
  accent: string
  description: string
}

export default function GeneratePage() {
  const { user, fetchUser } = useAuthStore()
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
  const dropdownRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setVoiceOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const creditCost = Math.max(1, Math.ceil(text.length / 100))

  const pollJobStatus = (jobId: string) => {
    const startTime = Date.now()

    pollRef.current = setInterval(async () => {
      // Give up after 10 minutes
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
          // Still queued or processing
          const elapsed = Math.round((Date.now() - startTime) / 1000)
          setStatusMsg(
            job.status === "queued"
              ? "Queued — waiting for worker..."
              : `Processing your audio... ${elapsed}s`
          )
        }
      } catch {
        // Network blip — keep polling
      }
    }, POLL_INTERVAL)
  }

  const handleGenerate = async () => {
    if (!text.trim() || !selectedVoice) return
    setIsGenerating(true)
    setError(null)
    setResult(null)
    setStatusMsg("Submitting job...")

    try {
      const res = await generateAPI.create({
        text: text.trim(),
        voice_id: selectedVoice.id,
        speed,
      })

      const jobId = res.data.job_id
      setStatusMsg("Job submitted — processing...")
      pollJobStatus(jobId)

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

          {/* Status while processing */}
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

          {/* Result */}
          {result && (
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-green-400 text-sm font-medium">Generation complete</span>
                <span className="text-white/40 text-xs">{(result.credits_used ).toLocaleString()} characters</span>
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
            {isGenerating ? "Generating..." : `Generate — ${creditCost.toLocaleString()} characters`}
          </Button>
        </div>

        {/* Right panel — unchanged */}
        <div className="flex flex-col gap-4">
          <div className="bg-violet-600/10 border border-violet-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-violet-400" />
              <span className="text-violet-400 text-sm">Available Credits</span>
            </div>
            <p className="text-white text-2xl font-bold">{(user?.credits ?? 0) }</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-white/60 text-sm mb-3">Voice</p>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setVoiceOpen(!voiceOpen)}
                className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm hover:border-white/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Mic2 className="w-4 h-4 text-violet-400" />
                  {selectedVoice?.name}
                </div>
                <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${voiceOpen ? "rotate-180" : ""}`} />
              </button>

              {voiceOpen && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-[#1a1a2e] border border-white/10 rounded-xl overflow-hidden z-50 shadow-xl">
                  {voices.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => { setSelectedVoice(v); setVoiceOpen(false) }}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${
                        selectedVoice?.id === v.id ? "bg-violet-600/20 text-white" : "text-white/70"
                      }`}
                    >
                      <p className="font-medium">{v.name}</p>
                      <p className="text-white/40 text-xs mt-0.5">{v.gender} · {v.accent}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

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
    </div>
  )
}