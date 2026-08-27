"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { generateAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { History, Play, Pause, Download, Info, Clock, Mic2, Zap } from "lucide-react"
import { useAudioStore } from "@/store/audioStore"

interface Job {
  id: string
  text: string
  status: string
  audio_url?: string
  credits_used: number
  duration_seconds?: number
  created_at: string
  voice_name?: string
}

function formatDuration(seconds: number): string | null {
  if (!seconds || seconds === 0) return null
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
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
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!isPlaying) {
      setProgress(0)
      setCurrentTime(0)
      return
    }
  }, [isPlaying])

  // Wire up to parent audio element via data attribute — simpler than lifting state
  useEffect(() => {
    const audio = (window as any).__talkataAudio as HTMLAudioElement | undefined
    if (!audio) return

    const onTime = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100)
        setCurrentTime(audio.currentTime)
        setAudioDuration(audio.duration)
      }
    }
    const onLoaded = () => setAudioDuration(audio.duration)
    const onEnded = () => { setProgress(0); setCurrentTime(0) }

    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("loadedmetadata", onLoaded)
    audio.addEventListener("ended", onEnded)
    return () => {
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("loadedmetadata", onLoaded)
      audio.removeEventListener("ended", onEnded)
    }
  }, [isPlaying])

  const displayDuration = audioDuration
    ? formatDuration(audioDuration)
    : formatDuration(job.duration_seconds ?? 0)

  const displayCurrent = isPlaying && currentTime > 0
    ? formatDuration(currentTime)
    : null

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

      {/* Progress bar + time */}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all duration-100"
            style={{ width: `${isPlaying ? progress : 0}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/30 text-xs">
            {displayCurrent ?? "0s"}
          </span>
          {displayDuration && (
            <span className="text-white/30 text-xs">{displayDuration}</span>
          )}
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
  const { playingId, toggle } = useAudioStore()
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const fetchJobs = async () => {
    const res = await generateAPI.history()
    setJobs(res.data.jobs)
    return res.data.jobs
  }

  useEffect(() => {
    fetchJobs().finally(() => setIsLoading(false))
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
  }, [])

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
  }, [jobs])

  const isExpiringSoon = (dateStr: string) => {
    const created = new Date(dateStr)
    const expires = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000)
    const daysLeft = Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysLeft <= 5 ? daysLeft : null
  }

  const handleToggle = (job: Job) => {
    if (!job.audio_url) return
    toggle(job.id, job.audio_url)
  }

  const hasActiveJobs = jobs.some(j => j.status === "queued" || j.status === "processing")

  // ── Status badge ────────────────────────────────────────────────────────────
  const StatusBadge = ({ status }: { status: string }) => (
    <div className="flex items-center gap-1.5">
      <span className={`text-xs px-2 py-1 rounded-full ${
        status === "complete"   ? "bg-green-500/10 text-green-400"
        : status === "failed"  ? "bg-red-500/10 text-red-400"
        : "bg-violet-500/10 text-violet-400"
      }`}>{status}</span>
      {(status === "queued" || status === "processing") && (
        <div className="w-3 h-3 border border-violet-400/50 border-t-violet-400 rounded-full animate-spin" />
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
                            {formatVoiceName(job.voice_name)}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <StatusBadge status={job.status} />
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
                      <StatusBadge status={job.status} />
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
                        {formatVoiceName(job.voice_name)}
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
