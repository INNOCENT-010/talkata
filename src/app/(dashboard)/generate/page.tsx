"use client"

import { useEffect, useState, useRef } from "react"
import { useAuthStore } from "@/store/authStore"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import { isAxiosError } from "axios"
import { generateAPI, voicesAPI,  } from "@/lib/api"
import { Mic2, Zap, Download, Clock, Play, Square, X, Check } from "lucide-react"
import Button from "@/components/ui/Button"
import ClonePreview from "@/components/voices/ClonePreview"

const CACHE_KEY        = "talkata_draft_text"
const VOICE_CACHE_KEY  = "talkata_draft_voice"
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
  { label: "Film and drama", ids: ["horror_male", "dramatic_male"] },
  { label: "Expressive characters", ids: ["detective_female", "enthusiastic_female"] },
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


// ── Preview play/stop button ──────────────────────────────────────────────────
function PreviewButton({ url, voiceId }: { url?: string; voiceId: string }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!url) return
    const previewWindow = window as Window & { __talkataPreview?: HTMLAudioElement }
    const existing = previewWindow.__talkataPreview as HTMLAudioElement | undefined
    if (existing && existing !== audioRef.current) { existing.pause(); existing.src = "" }
    if (playing && audioRef.current) {
      audioRef.current.pause(); audioRef.current.src = ""
      audioRef.current = null; delete previewWindow.__talkataPreview
      setPlaying(false); return
    }
    const audio = new Audio(url)
    audioRef.current = audio;previewWindow.__talkataPreview = audio
    audio.play(); setPlaying(true)
    audio.onended = () => { setPlaying(false); audioRef.current = null; delete previewWindow.__talkataPreview }
  }

  useEffect(() => () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null } }, [])

  if (!url) return null
  return (
    <button
      aria-label={playing ? `Stop ${voiceId} preview` : `Play ${voiceId} preview`}
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
function VoicePicker({ voices, selected, onSelect, onClose }: {
  voices: Voice[]; selected: Voice | null; onSelect: (voice: Voice) => void; onClose: () => void
}) {
  const [category, setCategory] = useState<"standard" | "character" | "clones">(selected?.is_clone ? "clones" : selected && CHARACTER_VOICE_IDS.has(selected.id) ? "character" : "standard")
  const [previewId, setPreviewId] = useState<string | null>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const cloneVoices = voices.filter(voice => voice.is_clone)
  const voiceMap = Object.fromEntries(voices.map(voice => [voice.id, voice]))
  const groups = category === "clones" ? [{ label: "Your saved and shared voices", ids: cloneVoices.map(voice => voice.id) }] : category === "standard" ? STANDARD_GROUPS : CHARACTER_GROUPS
  const tabs = [
    { id: "standard" as const, label: "Standard", description: "Everyday narration" },
    { id: "character" as const, label: "Character", description: "Film and expressive voices" },
    { id: "clones" as const, label: "My voices", description: `${cloneVoices.length} saved or shared` },
  ]
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    dialog.current?.focus()
    return () => { document.body.style.overflow = overflow; before?.focus() }
  }, [])
  function keyboard(event: React.KeyboardEvent) {
    if (event.key === "Escape") { onClose(); return }
    if (event.key !== "Tab") return
    const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, audio, [tabindex="0"]')
    if (!controls?.length) return
    const first = controls[0], last = controls[controls.length - 1]
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus() }
  }
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="voice-picker-title" tabIndex={-1} onKeyDown={keyboard} onClick={event => event.stopPropagation()} className="flex max-h-[90dvh] w-full min-w-0 flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#13131f] shadow-2xl outline-none sm:max-w-2xl sm:rounded-3xl">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-5 sm:px-6">
        <div><h2 id="voice-picker-title" className="text-lg font-semibold text-white">Choose a voice</h2><p className="mt-1 text-xs text-white/45">Browse a category, listen, then select your voice.</p></div>
        <button type="button" aria-label="Close voice picker" onClick={onClose} className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white"><X className="h-5 w-5" /></button>
      </header>
      <div className="grid shrink-0 grid-cols-3 gap-2 border-b border-white/10 p-4 sm:gap-3 sm:px-6">
        {tabs.map(tab => <button type="button" key={tab.id} aria-pressed={category === tab.id} onClick={() => { setCategory(tab.id); setPreviewId(null) }} className={`min-w-0 rounded-xl border px-2 py-3 text-left transition sm:px-4 ${category === tab.id ? "border-violet-400/60 bg-violet-500/15" : "border-white/10 bg-white/[.025] hover:bg-white/5"}`}>
          <span className="block text-sm font-semibold text-white">{tab.label}</span><span className="mt-1 hidden text-xs leading-5 text-white/45 sm:block">{tab.description}</span>
        </button>)}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
        {category === "clones" && !cloneVoices.length && <div className="rounded-2xl border border-dashed border-white/15 px-5 py-8 text-center"><p className="text-sm text-white/60">Your saved voices will appear here.</p><a href="/voice-cloning" className="mt-3 inline-block text-sm text-violet-300 underline">Create your first voice</a></div>}
        <div className="space-y-6">{groups.map(group => {
          const entries = group.ids.map(id => voiceMap[id]).filter(Boolean)
          if (!entries.length) return null
          return <section key={group.label}>
            <h3 className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-violet-200/70"><span>{group.label}</span><span className="h-px flex-1 bg-white/10" /></h3>
            <div className="space-y-2">{entries.map(voice => <div key={voice.id} className={`overflow-hidden rounded-xl border ${selected?.id === voice.id ? "border-violet-400/50 bg-violet-500/10" : "border-white/10 bg-white/[.025]"}`}>
              <div className="flex items-center gap-2 px-3 sm:px-4">
                <button type="button" aria-pressed={selected?.id === voice.id} onClick={() => { onSelect(voice); onClose() }} className="flex min-w-0 flex-1 items-center gap-3 py-4 text-left">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-xs font-semibold text-violet-200">{voice.name.replace("⚡ ", "").slice(0, 2).toUpperCase()}</span>
                  <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold text-white">{voice.name.replace("⚡ ", "")}</span><span className="mt-1 block text-xs leading-5 text-white/45">{voice.accent}{voice.description ? ` · ${voice.description}` : ""}</span></span>
                  {selected?.id === voice.id && <Check className="h-4 w-4 shrink-0 text-violet-300" />}
                </button>
                {voice.clone_id ? <button type="button" aria-expanded={previewId === voice.id} onClick={() => setPreviewId(previewId === voice.id ? null : voice.id)} className="shrink-0 rounded-lg border border-white/10 px-2 py-2 text-xs text-violet-200">Preview</button> : <PreviewButton url={voice.preview_url} voiceId={voice.id} />}
              </div>
              {previewId === voice.id && voice.clone_id && <div className="px-3 pb-3"><ClonePreview key={voice.clone_id} cloneId={voice.clone_id} name={voice.name.replace("⚡ ", "")} /></div>}
            </div>)}</div>
          </section>
        })}</div>
      </div>
    </div>
  </div>
}

export default function GeneratePage() {
  const { user } = useAuthStore()
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

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) queueMicrotask(() => setText(cached))
        voicesAPI.list().then(async (res) => {
      const v = res.data.voices
      try {
        const [clonesRes, sharedRes] = await Promise.all([
          api.get("/cloning/"),
          api.get("/cloning/shared-with-me"),
        ])
        const cloneVoices = [
          ...(clonesRes.data.clones || []).map((c: { id: string; name: string }) => ({
            id:          `clone_${c.id}`,
            name:        `⚡ ${c.name}`,
            gender:      "",
            accent:      "Your Clone",
            description: "Your cloned voice",
            preview_url: undefined,
            is_clone:    true,
            clone_id:    c.id,
          })),
          ...(sharedRes.data.voices || []).map((c: { clone_id: string; name: string; owner_name: string }) => ({
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
  }, [])

  useEffect(() => { localStorage.setItem(CACHE_KEY, text) }, [text])
  useEffect(() => {
    if (selectedVoice) localStorage.setItem(VOICE_CACHE_KEY, selectedVoice.id)
  }, [selectedVoice])

  const creditRate = selectedVoice?.is_clone ? 1150 : selectedVoice && CHARACTER_VOICE_IDS.has(selectedVoice.id) ? 1100 : CREDITS_PER_MIN
  const creditCost = Math.max(MIN_CREDITS, Math.round((text.trim().length / CHARS_PER_MINUTE) * creditRate))

  const activeModelLabel = selectedVoice?.is_clone ? "Voice clone" : selectedVoice && CHARACTER_VOICE_IDS.has(selectedVoice.id)
    ? "Character"
    : "Standard"

  const handleGenerate = async () => {
    if (!text.trim() || !selectedVoice) return
    setIsGenerating(true); setError(null); setStatusMsg("Submitting job...")
    try {
      await generateAPI.create({ text: text.trim(), voice_id: selectedVoice.id, speed })
      router.push("/history?processing=true")
    } catch (err: unknown) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : null
      setError(typeof detail === "string" ? detail : "Generation failed. Please try again.")
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
                maxLength={100000}
                placeholder={selectedVoice?.is_clone ? "Enter English text for your cloned voice (up to 100,000 characters)." : "Enter your script (up to 100,000 characters)."}
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