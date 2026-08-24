"use client"

import { useEffect, useState } from "react"
import { generateAPI } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { History, Play, Download, Info } from "lucide-react"

interface Job {
  id: string
  text: string
  status: string
  audio_url?: string
  credits_used: number
  created_at: string
  voice_id: string
}

export default function HistoryPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    generateAPI.history()
      .then((res) => setJobs(res.data.jobs))
      .finally(() => setIsLoading(false))
  }, [])

  const isExpiringSoon = (dateStr: string) => {
    const created = new Date(dateStr)
    const expires = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000)
    const daysLeft = Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysLeft <= 5 ? daysLeft : null
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">History</h1>
        <p className="text-white/50 mt-1">All your previous generations</p>
      </div>

      {/* 30-day notice */}
      <div className="flex items-start gap-3 bg-violet-600/10 border border-violet-500/20 rounded-xl px-5 py-4 mb-6">
        <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
        <p className="text-white/60 text-sm">
          Generation history and audio files are automatically cleared after{" "}
          <span className="text-white font-medium">30 days</span> to keep the service fast and free.
          Download any audio you want to keep.
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
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/40 text-xs font-medium px-6 py-3">TEXT</th>
                <th className="text-left text-white/40 text-xs font-medium px-6 py-3">STATUS</th>
                <th className="text-left text-white/40 text-xs font-medium px-6 py-3">CHARACTERS</th>
                <th className="text-left text-white/40 text-xs font-medium px-6 py-3">DATE</th>
                <th className="text-left text-white/40 text-xs font-medium px-6 py-3">AUDIO</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const expiring = isExpiringSoon(job.created_at)
                return (
                  <tr
                    key={job.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="text-white text-sm truncate max-w-xs">{job.text}</p>
                      {expiring !== null && (
                        <p className="text-orange-400 text-xs mt-0.5">
                          Expires in {expiring} day{expiring !== 1 ? "s" : ""}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        job.status === "complete"
                          ? "bg-green-500/10 text-green-400"
                          : job.status === "failed"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white/60 text-sm">
                        {(job.credits_used * 100).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white/60 text-sm">{formatDate(job.created_at)}</span>
                    </td>
                    <td className="px-6 py-4">
                      {job.audio_url ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={job.audio_url}
                            target="_blank"
                            className="text-violet-400 hover:text-violet-300 transition-colors"
                          >
                            <Play className="w-4 h-4" />
                          </a>
                          <a
                            href={job.audio_url}
                            download
                            className="text-violet-400 hover:text-violet-300 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-white/20 text-sm">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}