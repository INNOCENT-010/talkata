"use client"

import { useCallback, useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { generateAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { History, Play, Pause, Download, Info, Mic2, Zap } from "lucide-react"
import { useAudioStore } from "@/store/audioStore"

interface Job {
  id: string
  text: string
  status: string
  audio_url?: string
  credits_used: number
  duration_seconds?: number
  created_at: string
  voice_display_name?: string
  voice_name?: string
}

function formatDuration(seconds?: number | null): string {
  if (!seconds || !Number.isFinite(seconds)) return "0:00"
  const rounded = Math.max(0, Math.floor(seconds))
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`
}

function formatVoiceName(raw?: string): string {
  if (!raw) return "Unknown voice"
  return raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Inline audio player with progress bar and duration ───────────────────────
function AudioPlayer({ job, isPlaying, onToggle }: {
  job: Job
  isPlaying: boolean
  onToggle: () => void
}) {
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState<number | null>(null)
  const audio = useAudioStore((state) => state.audio)
  const audioId = useAudioStore((state) => state.audioId)
  const seekAudio = useAudioStore((state) => state.seek)
  const ownsAudio = audioId === job.id && audio !== null

  useEffect(() => {
    if (!audio || !ownsAudio) return

    const onTime = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100)
        setCurrentTime(audio.currentTime)
        setAudioDuration(audio.duration)
      }
    }
    const onLoaded = () => {
      if (Number.isFinite(audio.duration)) setAudioDuration(audio.duration)
    }
    const onEnded = () => { setProgress(100); setCurrentTime(audio.duration) }

    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("loadedmetadata", onLoaded)
    audio.addEventListener("durationchange", onLoaded)
    audio.addEventListener("ended", onEnded)
    return () => {
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("loadedmetadata", onLoaded)
      audio.removeEventListener("durationchange", onLoaded)
      audio.removeEventListener("ended", onEnded)
    }
  }, [audio, ownsAudio])

  const displayDuration = audioDuration || job.duration_seconds || 0
  const displayCurrent = ownsAudio ? currentTime : 0
  const displayProgress = ownsAudio ? progress : 0

  const seek = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!audio || !ownsAudio || !Number.isFinite(audio.duration) || audio.duration <= 0) return
    const nextProgress = Number(event.target.value)
    const nextTime = (nextProgress / 100) * audio.duration
    seekAudio(job.id, nextTime)
    setProgress(nextProgress)
    setCurrentTime(nextTime)
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      {/* Play/Pause */}
      <button
        onClick={onToggle}
        className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-600/20 hover:bg-violet-600/40 flex items-center justify-center transition-colors"
      >
        {isPlaying
          ? <Pause className="w-3.5 h-3.5 text-violet-300" />
          : <Play className="w-3.5 h-3.5 text-violet-400 ml-0.5" />
        }
      </button>

      {/* Draggable progress bar + elapsed / total duration */}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={displayProgress}
          onChange={seek}
          disabled={!ownsAudio || !displayDuration}
          aria-label={`Seek audio: ${formatDuration(displayCurrent)} of ${formatDuration(displayDuration)}`}
          className="talkata-audio-range h-4 w-full cursor-pointer disabled:cursor-not-allowed"
          style={{ background: `linear-gradient(to right, #8b5cf6 ${displayProgress}%, rgba(255,255,255,.12) ${displayProgress}%)` }}
        />
        <div className="flex items-center justify-between">
          <span className="text-white/40 text-[11px] tabular-nums">{formatDuration(displayCurrent)}</span>
          <span className="text-white/40 text-[11px] tabular-nums">{formatDuration(displayDuration)}</span>
        </div>
      </div>

      {/* Download */}
      <a
        href={job.audio_url}
        download
        className="flex-shrink-0 text-white/30 hover:text-violet-400 transition-colors"
        title="Download"
      >
        <Download className="w-3.5 h-3.5" />
      </a>
    </div>
  )
}

export default function HistoryPage() {
  const searchParams = useSearchParams()
  const isProcessing = searchParams.get("processing") === "true"

  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const { playingId, toggle } = useAudioStore()
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const [now] = useState(() => Date.now())

  const fetchJobs = useCallback(async () => {
    const res = await generateAPI.history()
    setJobs(res.data.jobs)
    return res.data.jobs
  }, [])

  useEffect(() => {
    const load = async () => {
      try { await fetchJobs() }
      finally { setIsLoading(false) }
    }
    void load()
    if (isProcessing) {
      pollRef.current = setInterval(async () => {
        const latest = await fetchJobs()
        const hasActive = latest.some((j: Job) =>
          j.status === "queued" || j.status === "processing"
        )
        if (!hasActive) clearInterval(pollRef.current!)
      }, 3000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchJobs, isProcessing])

  useEffect(() => {
    const hasActive = jobs.some(j => j.status === "queued" || j.status === "processing")
    if (hasActive && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        const latest = await fetchJobs()
        const stillActive = latest.some((j: Job) =>
          j.status === "queued" || j.status === "processing"
        )
        if (!stillActive) { clearInterval(pollRef.current!); pollRef.current = null }
      }, 3000)
    }
  }, [fetchJobs, jobs])

  const isExpiringSoon = (dateStr: string) => {
    const created = new Date(dateStr)
    const expires = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000)
    const daysLeft = Math.ceil((expires.getTime() - now) / (1000 * 60 * 60 * 24))
    return daysLeft <= 5 ? daysLeft : null
  }

  const handleToggle = (job: Job) => {
    if (!job.audio_url) return
    toggle(job.id, job.audio_url)
  }

  const handleCancel = async (job: Job) => {
    if (cancellingId === job.id) return
    setCancellingId(job.id)
    try {
      await generateAPI.cancel(job.id)
      // Also notify ML worker to skip if still queued
      setJobs(prev => prev.map(j =>
        j.id === job.id ? { ...j, status: "cancelled" } : j
      ))
    } catch (err: unknown) {
      const detail = typeof err === "object" && err !== null && "response" in err
        && typeof (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail === "string"
        ? (err as { response: { data: { detail: string } } }).response.data.detail
        : "Could not cancel job"
      alert(detail)
    } finally {
      setCancellingId(null)
    }
  }

  const hasActiveJobs = jobs.some(j => j.status === "queued" || j.status === "processing")

  // ── Status badge ────────────────────────────────────────────────────────────
  const StatusBadge = ({ job }: { job: Job }) => (
    <div className="flex items-center gap-1.5">
      <span className={`text-xs px-2 py-1 rounded-full ${
        job.status === "complete"   ? "bg-green-500/10 text-green-400"
        : job.status === "failed"  ? "bg-red-500/10 text-red-400"
        : job.status === "cancelled" ? "bg-white/5 text-white/30"
        : "bg-violet-500/10 text-violet-400"
      }`}>{job.status}</span>
      {(job.status === "queued" || job.status === "processing") && (
        <div className="w-3 h-3 border border-violet-400/50 border-t-violet-400 rounded-full animate-spin" />
      )}
      {job.status === "queued" && (
        <button
          onClick={() => handleCancel(job)}
          disabled={cancellingId === job.id}
          className="text-white/20 hover:text-red-400 transition-colors text-xs ml-1"
          title="Cancel job"
        >
          {cancellingId === job.id ? "..." : "✕"}
        </button>
      )}
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">History</h1>
        <p className="text-white/50 mt-1">All your previous generations</p>
      </div>

      {hasActiveJobs && (
        <div className="flex items-center gap-3 bg-violet-600/10 border border-violet-500/30 rounded-xl px-5 py-4 mb-6">
          <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse shrink-0" />
          <p className="text-violet-300 text-sm font-medium">
            Generation in progress — this page updates automatically.
          </p>
        </div>
      )}

      <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-4 mb-6">
        <Info className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
        <p className="text-white/40 text-sm">
          History and audio files are cleared after{" "}
          <span className="text-white/60 font-medium">30 days</span>.
          Download anything you want to keep.
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16">
            <History className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">No generations yet</p>
          </div>
        ) : (
          <>
            {/* ── Desktop table ─────────────────────────────────────────────── */}
            <table className="w-full hidden md:table">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3 w-[30%]">TEXT</th>
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3">VOICE</th>
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3">STATUS</th>
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3">COST</th>
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3">DATE</th>
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3 w-[22%]">AUDIO</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const expiring = isExpiringSoon(job.created_at)
                  return (
                    <tr key={job.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">

                      {/* Text */}
                      <td className="px-6 py-4">
                        <p className="text-white text-sm truncate max-w-xs">{job.text}</p>
                        {expiring !== null && (
                          <p className="text-orange-400 text-xs mt-0.5">
                            Expires in {expiring} day{expiring !== 1 ? "s" : ""}
                          </p>
                        )}
                      </td>

                      {/* Voice */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Mic2 className="w-3 h-3 text-violet-400/60 shrink-0" />
                          <span className="text-white/70 text-sm truncate max-w-[120px]">
                            {formatVoiceName(job.voice_display_name)}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <StatusBadge job={job} />
                      </td>

                      {/* Credits */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-yellow-400/60" />
                          <span className="text-white/60 text-sm">
                            {job.credits_used?.toLocaleString() ?? "—"}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4">
                        <span className="text-white/60 text-sm">{formatDate(job.created_at)}</span>
                      </td>

                      {/* Audio player */}
                      <td className="px-6 py-4">
                        {job.audio_url ? (
                          <AudioPlayer
                            job={job}
                            isPlaying={playingId === job.id}
                            onToggle={() => handleToggle(job)}
                          />
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* ── Mobile cards ──────────────────────────────────────────────── */}
            <div className="md:hidden flex flex-col divide-y divide-white/5">
              {jobs.map((job) => {
                const expiring = isExpiringSoon(job.created_at)
                return (
                  <div key={job.id} className="p-4 flex flex-col gap-3">
                    {/* Text + status */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-white text-sm line-clamp-2 flex-1">{job.text}</p>
                      <StatusBadge job={job} />
                    </div>

                    {expiring !== null && (
                      <p className="text-orange-400 text-xs">
                        Expires in {expiring} day{expiring !== 1 ? "s" : ""}
                      </p>
                    )}

                    {/* Voice + credits + date */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1 text-xs text-white/50">
                        <Mic2 className="w-3 h-3 text-violet-400/60" />
                        {formatVoiceName(job.voice_display_name)}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-white/50">
                        <Zap className="w-3 h-3 text-yellow-400/60" />
                        {job.credits_used?.toLocaleString() ?? "—"} credits
                      </div>
                      <span className="text-xs text-white/40">{formatDate(job.created_at)}</span>
                    </div>

                    {/* Audio player */}
                    {job.audio_url && (
                      <AudioPlayer
                        job={job}
                        isPlaying={playingId === job.id}
                        onToggle={() => handleToggle(job)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
