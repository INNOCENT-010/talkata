"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { generateAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { History, Play, Pause, Download, Info, Clock } from "lucide-react"

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

function formatDuration(seconds: number): string {
  if (!seconds || seconds === 0) return null as any
  const mins = Math.round(seconds / 60)
  if (mins < 1) return `${seconds}s`
  return `${mins} min${mins !== 1 ? "s" : ""}`
}

export default function HistoryPage() {
  const searchParams = useSearchParams()
  const isProcessing = searchParams.get("processing") === "true"

  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const fetchJobs = async () => {
    const res = await generateAPI.history()
    setJobs(res.data.jobs)
    return res.data.jobs
  }

  useEffect(() => {
    fetchJobs().finally(() => setIsLoading(false))

    // If came from generate page, start polling for active jobs
    if (isProcessing) {
      pollRef.current = setInterval(async () => {
        const latest = await fetchJobs()
        const hasActive = latest.some((j: Job) =>
          j.status === "queued" || j.status === "processing"
        )
        if (!hasActive) {
          clearInterval(pollRef.current!)
        }
      }, 3000)
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // Keep polling if there are active jobs
  useEffect(() => {
    const hasActive = jobs.some(j => j.status === "queued" || j.status === "processing")
    if (hasActive && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        const latest = await fetchJobs()
        const stillActive = latest.some((j: Job) =>
          j.status === "queued" || j.status === "processing"
        )
        if (!stillActive) {
          clearInterval(pollRef.current!)
          pollRef.current = null
        }
      }, 3000)
    }
  }, [jobs])

  const isExpiringSoon = (dateStr: string) => {
    const created = new Date(dateStr)
    const expires = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000)
    const daysLeft = Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysLeft <= 5 ? daysLeft : null
  }

  const handlePlay = (job: Job) => {
    if (!job.audio_url) return
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
    }
    if (playingId === job.id) {
      setPlayingId(null)
      audioRef.current = null
      return
    }
    const audio = new Audio(job.audio_url)
    audioRef.current = audio
    audio.play()
    setPlayingId(job.id)
    audio.onended = () => {
      setPlayingId(null)
      audioRef.current = null
    }
  }

  const hasActiveJobs = jobs.some(j => j.status === "queued" || j.status === "processing")

  const AudioControls = ({ job }: { job: Job }) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handlePlay(job)}
        className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors"
      >
        {playingId === job.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <a href={job.audio_url} download className="text-violet-400 hover:text-violet-300">
        <Download className="w-4 h-4" />
      </a>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">History</h1>
        <p className="text-white/50 mt-1">All your previous generations</p>
      </div>

      {/* Active job banner */}
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
            {/* Desktop table */}
            <table className="w-full hidden md:table">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3">TEXT</th>
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3">STATUS</th>
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3">LENGTH</th>
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3">DATE</th>
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3">AUDIO</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const expiring = isExpiringSoon(job.created_at)
                  const duration = formatDuration(job.duration_seconds ?? 0)
                  return (
                    <tr key={job.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-white text-sm truncate max-w-xs">{job.text}</p>
                        {expiring !== null && (
                          <p className="text-orange-400 text-xs mt-0.5">Expires in {expiring} day{expiring !== 1 ? "s" : ""}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            job.status === "complete" ? "bg-green-500/10 text-green-400"
                            : job.status === "failed" ? "bg-red-500/10 text-red-400"
                            : "bg-violet-500/10 text-violet-400"
                          }`}>{job.status}</span>
                          {(job.status === "queued" || job.status === "processing") && (
                            <div className="w-3 h-3 border border-violet-400/50 border-t-violet-400 rounded-full animate-spin" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {duration ? (
                          <div className="flex items-center gap-1.5 text-white/60 text-sm">
                            <Clock className="w-3.5 h-3.5 text-white/30" />
                            {duration}
                          </div>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white/60 text-sm">{formatDate(job.created_at)}</span>
                      </td>
                      <td className="px-6 py-4">
                        {job.audio_url
                          ? <AudioControls job={job} />
                          : <span className="text-white/20">—</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col divide-y divide-white/5">
              {jobs.map((job) => {
                const expiring = isExpiringSoon(job.created_at)
                const duration = formatDuration(job.duration_seconds ?? 0)
                return (
                  <div key={job.id} className="p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-white text-sm line-clamp-2 flex-1">{job.text}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          job.status === "complete" ? "bg-green-500/10 text-green-400"
                          : job.status === "failed" ? "bg-red-500/10 text-red-400"
                          : "bg-violet-500/10 text-violet-400"
                        }`}>{job.status}</span>
                        {(job.status === "queued" || job.status === "processing") && (
                          <div className="w-3 h-3 border border-violet-400/50 border-t-violet-400 rounded-full animate-spin" />
                        )}
                      </div>
                    </div>
                    {expiring !== null && (
                      <p className="text-orange-400 text-xs">Expires in {expiring} day{expiring !== 1 ? "s" : ""}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-white/40">
                        {duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {duration}
                          </span>
                        )}
                        <span>{formatDate(job.created_at)}</span>
                      </div>
                      {job.audio_url && <AudioControls job={job} />}
                    </div>
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