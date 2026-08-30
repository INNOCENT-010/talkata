"use client"

import { useEffect, useState, useRef } from "react"
import { useAuthStore } from "@/store/authStore"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import { generateAPI, voicesAPI,  } from "@/lib/api"
import { Mic2, Zap, Download, Clock, Play, Square, X, Check, Sparkles, Wand2 } from "lucide-react"
import Button from "@/components/ui/Button"

const CACHE_KEY        = "talkata_draft_text"
const VOICE_CACHE_KEY  = "talkata_draft_voice"
const MODEL_CACHE_KEY  = "talkata_draft_model"
const POLL_INTERVAL    = 3000
const POLL_TIMEOUT     = 10 * 60 * 1000
const CHARS_PER_MINUTE = 800
const CREDITS_PER_MIN  = 1000
const MIN_CREDITS      = 100

// ── Voice IDs that belong to the "Character" model (XTTS cloned) ─────────────
const CHARACTER_VOICE_IDS = new Set([
  "horror_male", "dramatic_male", "classic_narrator",
  "enthusiastic_female", "detective_female",
])

// ── Use-case groups per model ─────────────────────────────────────────────────
const STANDARD_GROUPS: { label: string; ids: string[] }[] = [
  { label: "Narration and long-form",   ids: ["nova", "ivy", "orion", "jasper"] },
  { label: "Professional and corporate", ids: ["aria", "sage", "atlas", "echo"] },
  { label: "Wellness and meditation",   ids: ["luna"] },
]
const CHARACTER_GROUPS: { label: string; ids: string[] }[] = [
  { label: "Character voices",  ids: ["horror_male", "dramatic_male", "detective_female", "enthusiastic_female"] },
  { label: "Classic narration", ids: ["classic_narrator"] },
]

interface Voice {
  id: string
  name: string
  gender: string
  accent: string
  description: string
  engine?: string
  preview_url?: string
  is_clone?: boolean
  clone_id?: string
}

type ModelType = "standard" | "character"

// ── Preview play/stop button ──────────────────────────────────────────────────
function PreviewButton({ url, voiceId }: { url?: string; voiceId: string }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!url) return
    const existing = (window as any).__talkataPreview as HTMLAudioElement | undefined
    if (existing && existing !== audioRef.current) { existing.pause(); existing.src = "" }
    if (playing && audioRef.current) {
      audioRef.current.pause(); audioRef.current.src = ""
      audioRef.current = null; delete (window as any).__talkataPreview
      setPlaying(false); return
    }
    const audio = new Audio(url)
    audioRef.current = audio;(window as any).__talkataPreview = audio
    audio.play(); setPlaying(true)
    audio.onended = () => { setPlaying(false); audioRef.current = null; delete (window as any).__talkataPreview }
  }

  useEffect(() => () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null } }, [])

  if (!url) return null
  return (
    <button
      onClick={toggle}
      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
        playing ? "bg-violet-500 text-white" : "bg-white/10 text-white/50 hover:bg-violet-500/30 hover:text-violet-300"
      }`}
      title={playing ? "Stop" : "Preview"}
    >
      {playing
        ? <Square className="w-2.5 h-2.5 fill-current" />
        : <Play  className="w-2.5 h-2.5 ml-0.5 fill-current" />
      }
    </button>
  )
}

// ── Voice picker modal ────────────────────────────────────────────────────────
function VoicePicker({
  voices, selected, onSelect, onClose,
}: {
  voices: Voice[]
  selected: Voice | null
  onSelect: (v: Voice) => void
  onClose: () => void
}) {
  const voiceMap = Object.fromEntries(voices.map(v => [v.id, v]))

  const [activeModel, setActiveModel] = useState<ModelType>(() => {
    if (selected && CHARACTER_VOICE_IDS.has(selected.id)) return "character"
    return "standard"
  })

  const groups = activeModel === "standard" ? STANDARD_GROUPS : CHARACTER_GROUPS
  const cloneVoices = voices.filter(v => v.is_clone)

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed z-50 inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center md:p-6">
        <div
          className="bg-[#13131f] border border-white/10 rounded-t-2xl md:rounded-2xl w-full md:max-w-lg shadow-2xl flex flex-col"
          style={{ maxHeight: "85vh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
            <h3 className="text-white font-semibold text-base">Choose a voice</h3>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Model toggle */}
          <div className="px-5 pt-4 pb-3 flex-shrink-0">
            <p className="text-white/30 text-xs font-medium uppercase tracking-widest mb-3">Voice type</p>
            <div className="grid grid-cols-2 gap-2">
              {/* Standard */}
              <button
                onClick={() => setActiveModel("standard")}
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all text-left ${
                  activeModel === "standard"
                    ? "border-violet-500/50 bg-violet-600/10"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  activeModel === "standard" ? "bg-violet-500/20" : "bg-white/5"
                }`}>
                  <Sparkles className={`w-4 h-4 ${activeModel === "standard" ? "text-violet-400" : "text-white/30"}`} />
                </div>
                <div>
                  <p className={`text-sm font-medium ${activeModel === "standard" ? "text-white" : "text-white/60"}`}>
                    Standard
                  </p>
                  <p className="text-white/30 text-xs mt-0.5 leading-snug">Natural voices — fast generation</p>
                </div>
              </button>

              {/* Character */}
              <button
                onClick={() => setActiveModel("character")}
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all text-left ${
                  activeModel === "character"
                    ? "border-violet-500/50 bg-violet-600/10"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  activeModel === "character" ? "bg-violet-500/20" : "bg-white/5"
                }`}>
                  <Wand2 className={`w-4 h-4 ${activeModel === "character" ? "text-violet-400" : "text-white/30"}`} />
                </div>
                <div>
                  <p className={`text-sm font-medium ${activeModel === "character" ? "text-white" : "text-white/60"}`}>
                    Character
                  </p>
                  <p className="text-white/30 text-xs mt-0.5 leading-snug">Distinctive voices — voice cloning</p>
                </div>
              </button>
            </div>
          </div>

          {/* Voice list */}
          <div className="overflow-y-auto flex-1 border-t border-white/5">

            {/* My Cloned Voices */}
            {cloneVoices.length > 0 && (
              <div>
                <div className="px-5 py-2 bg-white/[0.02] border-b border-white/5 sticky top-0">
                  <span className="text-violet-400/60 text-xs font-medium uppercase tracking-widest">
                    ⚡ My Cloned Voices
                  </span>
                </div>
                <div className="flex flex-col">
                  {cloneVoices.map((v) => {
                    const isSelected = selected?.id === v.id
                    return (
                      <button
                        key={v.id}
                        onClick={() => { onSelect(v); onClose() }}
                        className={`flex items-center gap-3 px-5 py-3.5 border-b border-white/5 transition-colors text-left w-full ${
                          isSelected ? "bg-violet-600/15" : "hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-medium flex-shrink-0 text-violet-300">
                          {v.name.replace("⚡ ", "").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-sm font-medium truncate ${isSelected ? "text-white" : "text-white/80"}`}>
                              {v.name}
                            </p>
                            {isSelected && <Check className="w-3 h-3 text-violet-400 flex-shrink-0" />}
                          </div>
                          <p className="text-white/30 text-xs truncate">{v.accent}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {groups.map((group) => {
              const groupVoices = group.ids.map(id => voiceMap[id]).filter(Boolean)
              if (!groupVoices.length) return null
              return (
                <div key={group.label}>
                  {/* Group header */}
                  <div className="px-5 py-2 bg-white/[0.02] border-b border-white/5 sticky top-0">
                    <span className="text-white/25 text-xs font-medium uppercase tracking-widest">
                      {group.label}
                    </span>
                  </div>

                  {/* Voice rows — 2 columns */}
                  <div className="grid grid-cols-2 divide-x divide-white/5">
                    {groupVoices.map((v, i) => {
                      const isSelected = selected?.id === v.id
                      const initials = v.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
                      const isFemale = v.gender === "female"
                      return (
                        <button
                          key={v.id}
                          onClick={() => { onSelect(v); onClose() }}
                          className={`flex items-center gap-3 px-4 py-3.5 border-b border-white/5 transition-colors text-left w-full ${
                            isSelected ? "bg-violet-600/15" : "hover:bg-white/[0.03]"
                          } ${i % 2 === 0 && groupVoices.length % 2 !== 0 && i === groupVoices.length - 1 ? "col-span-2" : ""}`}
                        >
                          {/* Avatar */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                            isFemale ? "bg-pink-500/20 text-pink-300" : "bg-blue-500/20 text-blue-300"
                          }`}>
                            {initials}
                          </div>

                          {/* Name + accent */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={`text-sm font-medium truncate ${isSelected ? "text-white" : "text-white/80"}`}>
                                {v.name}
                              </p>
                              {isSelected && <Check className="w-3 h-3 text-violet-400 flex-shrink-0" />}
                            </div>
                            <p className="text-white/30 text-xs truncate">{v.accent}</p>
                          </div>

                          <PreviewButton url={v.preview_url} voiceId={v.id} />
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Mobile safe area */}
          <div className="md:hidden flex-shrink-0 pb-6" />
        </div>
      </div>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GeneratePage() {
  const { user, fetchUser } = useAuthStore()
  const router = useRouter()
  const [text, setText] = useState("")
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null)
  const [speed, setSpeed] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingVoices, setIsLoadingVoices] = useState(true)
  const [voicePickerOpen, setVoicePickerOpen] = useState(false)
  const [result, setResult] = useState<{ url: string; credits_used: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) setText(cached)
        voicesAPI.list().then(async (res) => {
      const v = res.data.voices
      try {
        const [clonesRes, sharedRes] = await Promise.all([
          api.get("/cloning/"),
          api.get("/cloning/shared-with-me"),
        ])
        const cloneVoices = [
          ...(clonesRes.data.clones || []).map((c: any) => ({
            id:          `clone_${c.id}`,
            name:        `⚡ ${c.name}`,
            gender:      "",
            accent:      "Your Clone",
            description: "Your cloned voice",
            preview_url: undefined,
            is_clone:    true,
            clone_id:    c.id,
          })),
          ...(sharedRes.data.voices || []).map((c: any) => ({
            id:          `clone_${c.clone_id}`,
            name:        `⚡ ${c.name}`,
            gender:      "",
            accent:      `Shared by ${c.owner_name}`,
            description: "Shared voice clone",
            preview_url: undefined,
            is_clone:    true,
            clone_id:    c.clone_id,
          })),
        ]
        const allVoices = [...v, ...cloneVoices]
        setVoices(allVoices)
        const cachedVoiceId = localStorage.getItem(VOICE_CACHE_KEY)
        const match = allVoices.find((x: Voice) => x.id === cachedVoiceId)
        setSelectedVoice(match ?? allVoices[0])
        // Check for ?voice= URL param (from "Use" button on cloning page)
        const urlParams = new URLSearchParams(window.location.search)
        const voiceParam = urlParams.get("voice")
        if (voiceParam) {
          const paramMatch = allVoices.find((x: Voice) => x.id === voiceParam)
          if (paramMatch) setSelectedVoice(paramMatch)
        } else if (!match) {
          localStorage.removeItem(VOICE_CACHE_KEY)
        }
      } catch {
        setVoices(v)
        const cachedVoiceId = localStorage.getItem(VOICE_CACHE_KEY)
        const match = v.find((x: Voice) => x.id === cachedVoiceId)
        setSelectedVoice(match ?? v[0])
        if (!match) localStorage.removeItem(VOICE_CACHE_KEY)
      }
    }).finally(() => setIsLoadingVoices(false))
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  useEffect(() => { localStorage.setItem(CACHE_KEY, text) }, [text])
  useEffect(() => {
    if (selectedVoice) localStorage.setItem(VOICE_CACHE_KEY, selectedVoice.id)
  }, [selectedVoice])

  const creditCost = Math.max(MIN_CREDITS, Math.round((text.length / CHARS_PER_MINUTE) * CREDITS_PER_MIN))

  const activeModelLabel = selectedVoice && CHARACTER_VOICE_IDS.has(selectedVoice.id)
    ? "Character"
    : "Standard"

  const handleGenerate = async () => {
    if (!text.trim() || !selectedVoice) return
    setIsGenerating(true); setError(null); setStatusMsg("Submitting job...")
    try {
      await generateAPI.create({ text: text.trim(), voice_id: selectedVoice.id, speed })
      router.push("/history?processing=true")
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Generation failed. Is the ML worker online?")
      setIsGenerating(false); setStatusMsg(null)
    }
  }

  const clearCache = () => { localStorage.removeItem(CACHE_KEY); setText(""); setResult(null) }

  if (isLoadingVoices) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse">
        <div className="h-8 w-48 bg-white/10 rounded mb-2" />
        <div className="h-4 w-64 bg-white/5 rounded mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-6">
          <div className="h-72 bg-white/5 rounded-xl" />
          <div className="flex flex-col gap-4">
            <div className="h-24 bg-white/5 rounded-xl" />
            <div className="h-40 bg-white/5 rounded-xl" />
            <div className="h-20 bg-white/5 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Generate Voice</h1>
          <p className="text-white/50 mt-1">Type your text, pick a voice, and generate</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-6">

          {/* ── Left — text area ───────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>Your Text</span>
                <div className="flex items-center gap-3">
                  <span>{text.length} characters</span>
                  {text.length > 0 && (
                    <button onClick={clearCache} className="text-red-400/60 hover:text-red-400 transition-colors">Clear</button>
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
                  <p className="text-white/40 text-xs mt-0.5">You can leave this page — check History to find your audio when done.</p>
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
                  <Download className="w-4 h-4" />Download audio
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

          {/* ── Right panel ────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Credits */}
            <div className="bg-violet-600/10 border border-violet-500/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-violet-400" />
                <span className="text-violet-400 text-sm">Available Credits</span>
              </div>
              <p className="text-white text-2xl font-bold">{(user?.credits ?? 0).toLocaleString()}</p>
            </div>

            {/* Voice selector */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-white/60 text-sm mb-3">Voice</p>

              {/* Selected voice card */}
              {selectedVoice ? (
                <button
                  onClick={() => setVoicePickerOpen(true)}
                  className="w-full bg-white/5 border border-violet-500/20 rounded-xl p-3.5 mb-2 text-left hover:border-violet-500/40 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                      selectedVoice.gender === "female"
                        ? "bg-pink-500/20 text-pink-300"
                        : "bg-blue-500/20 text-blue-300"
                    }`}>
                      {selectedVoice.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-semibold">{selectedVoice.name}</p>
                        <span className="text-xs text-violet-400/70 bg-violet-500/10 px-1.5 py-0.5 rounded-md">
                          {activeModelLabel}
                        </span>
                      </div>
                      <p className="text-white/40 text-xs mt-0.5">{selectedVoice.accent}</p>
                      <p className="text-white/25 text-xs mt-1 line-clamp-2">{selectedVoice.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <PreviewButton url={selectedVoice.preview_url} voiceId={selectedVoice.id} />
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                    <span className="text-white/30 text-xs">Tap to change voice</span>
                    <span className="text-violet-400/60 text-xs">Browse all →</span>
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => setVoicePickerOpen(true)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mb-2 text-center hover:border-violet-500/40 transition-colors"
                >
                  <p className="text-white/50 text-sm">Select a voice</p>
                </button>
              )}
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
                <span>0.5x</span><span>2.0x</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {voicePickerOpen && (
        <VoicePicker
          voices={voices}
          selected={selectedVoice}
          onSelect={setSelectedVoice}
          onClose={() => setVoicePickerOpen(false)}
        />
      )}
    </>
  )
}