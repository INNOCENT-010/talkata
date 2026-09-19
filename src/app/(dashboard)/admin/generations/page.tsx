"use client"

import { useEffect, useState } from "react"
import AdminGuard from "@/components/dashboard/AdminGuard"
import { Search, Play, Download, ChevronLeft, RefreshCw, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"
import api from "@/lib/api"

interface Job {
  id: string
  user_id: string
  user_email?: string
  text: string
  voice_name: string
  status: string
  credits_used: number
  audio_url?: string
  error?: string
  created_at: string
  voice_display_name?: string
}

const STATUS_COLORS: Record<string, string> = {
  complete:   "bg-green-500/10 text-green-400",
  failed:     "bg-red-500/10 text-red-400",
  processing: "bg-yellow-500/10 text-yellow-400",
  queued:     "bg-blue-500/10 text-blue-400",
  cancelled:  "bg-white/5 text-white/30",
}

const CHARACTER_VOICES = new Set([
  "horror_male", "dramatic_male", "classic_narrator",
  "enthusiastic_female", "detective_female",
])

export default function AdminGenerationsPage() {
  const [jobs, setJobs]               = useState<Job[]>([])
  const [filtered, setFiltered]       = useState<Job[]>([])
  const [search, setSearch]           = useState("")
  const [statusFilter, setFilter]     = useState("all")
  const [isLoading, setIsLoading]     = useState(true)
  const [retrying, setRetrying]       = useState<string | null>(null)
  const [retryMsg, setRetryMsg]       = useState<{ id: string; ok: boolean; text: string } | null>(null)
  const [expanded, setExpanded]       = useState<string | null>(null)
  const [notifyMap, setNotifyMap]     = useState<Record<string, boolean>>({})

  const fetchJobs = () => {
    setIsLoading(true)
    api.get("/admin/generations")
      .then((res) => {
        setJobs(res.data.jobs)
        setFiltered(res.data.jobs)
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { fetchJobs() }, [])

  useEffect(() => {
    let result = jobs
    if (statusFilter !== "all") result = result.filter(j => j.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(j =>
        j.text?.toLowerCase().includes(q) ||
        j.voice_name?.toLowerCase().includes(q) ||
        j.user_email?.toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [search, statusFilter, jobs])

  async function retryJob(job: Job) {
    setRetrying(job.id)
    setRetryMsg(null)
    try {
      await api.post("/generate/admin/retry-job", {
        job_id: job.id,
        notify: notifyMap[job.id] ?? false,
      })
      setRetryMsg({
        id: job.id,
        ok: true,
        text: notifyMap[job.id]
          ? "Re-queued at no charge. User will be emailed when done."
          : "Job re-queued at no charge.",
      })
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: "queued" } : j))
    } catch (err: any) {
      setRetryMsg({
        id: job.id,
        ok: false,
        text: err?.response?.data?.detail || "Retry failed.",
      })
    } finally {
      setRetrying(null)
    }
  }

  const voiceBadge = (voice_name: string) => {
    if (voice_name?.startsWith("clone_"))
      return <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400">clone</span>
    if (CHARACTER_VOICES.has(voice_name))
      return <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-fuchsia-500/15 text-fuchsia-400">char</span>
    return null
  }

  const counts = {
    all:        jobs.length,
    complete:   jobs.filter(j => j.status === "complete").length,
    failed:     jobs.filter(j => j.status === "failed").length,
    processing: jobs.filter(j => j.status === "processing").length,
    queued:     jobs.filter(j => j.status === "queued").length,
  }

  return (
    <AdminGuard>
      <div className="min-w-0 w-full max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin" className="text-white/40 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Generations</h1>
            <p className="text-white/50 mt-0.5 text-sm">{jobs.length} total jobs</p>
          </div>
          <button
            onClick={fetchJobs}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-white/50 hover:text-white text-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search voice, email…"
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500 text-sm"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(["all","complete","failed","processing","queued"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-2 rounded-lg text-xs transition-all capitalize flex items-center gap-1.5 ${
                  statusFilter === s
                    ? "bg-violet-600 text-white"
                    : "bg-white/5 text-white/50 hover:text-white"
                }`}
              >
                {s}
                <span className={`text-[10px] px-1 py-0.5 rounded-md ${
                  statusFilter === s ? "bg-white/20" : "bg-white/5"
                }`}>
                  {counts[s]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white/[.03] border border-white/10 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-sm">No generations found</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/30 text-xs font-medium px-4 py-3 w-[30%]">USER</th>
                  <th className="text-left text-white/30 text-xs font-medium px-4 py-3">VOICE</th>
                  <th className="text-left text-white/30 text-xs font-medium px-4 py-3">STATUS</th>
                  <th className="text-left text-white/30 text-xs font-medium px-4 py-3">CREDITS</th>
                  <th className="text-left text-white/30 text-xs font-medium px-4 py-3">DATE</th>
                  <th className="text-left text-white/30 text-xs font-medium px-4 py-3">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((job) => (
                  <>
                    <tr
                      key={job.id}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[.02] transition-colors"
                    >
                      {/* User + text preview */}
                      <td className="px-4 py-3">
                        {job.user_email && (
                          <p className="text-white/40 text-xs mb-0.5 truncate max-w-[200px]">{job.user_email}</p>
                        )}
                        <button
                          onClick={() => setExpanded(expanded === job.id ? null : job.id)}
                          className="flex items-center gap-1 text-white/50 text-xs hover:text-white/80 transition-colors"
                        >
                          {expanded === job.id
                            ? <ChevronUp className="w-3 h-3 shrink-0" />
                            : <ChevronDown className="w-3 h-3 shrink-0" />
                          }
                          <span className="truncate max-w-[180px]">
                            {job.text?.slice(0, 40)}{job.text?.length > 40 ? "…" : ""}
                          </span>
                        </button>
                        {job.error && (
                          <p className="text-red-400 text-[10px] mt-0.5 truncate max-w-[200px]">{job.error}</p>
                        )}
                      </td>

                      {/* Voice */}
                      <td className="px-4 py-3">
                        <div className="flex items-center flex-wrap gap-y-0.5">
                          <span className="text-white/70 text-xs capitalize">
                            {(job.voice_display_name || job.voice_name)?.replace(/_/g, " ")}
                          </span>
                          {voiceBadge(job.voice_name)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status] || "bg-white/5 text-white/30"}`}>
                          {job.status}
                        </span>
                      </td>

                      {/* Credits */}
                      <td className="px-4 py-3">
                        <span className="text-white/50 text-xs">{job.credits_used?.toLocaleString()}</span>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3">
                        <span className="text-white/40 text-xs whitespace-nowrap">
                          {new Date(job.created_at).toLocaleDateString("en-US", {
                            month: "short", day: "numeric",
                          })}
                          {" "}
                          <span className="text-white/25">
                            {new Date(job.created_at).toLocaleTimeString("en-US", {
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {job.audio_url && (
                            <>
                              <a
                                href={job.audio_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-violet-400 hover:text-violet-300 transition-colors"
                                title="Play"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </a>
                              <a
                                href={job.audio_url}
                                download
                                className="text-violet-400 hover:text-violet-300 transition-colors"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}
                          {job.status === "failed" && (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => retryJob(job)}
                                  disabled={retrying === job.id}
                                  title="Retry at no charge"
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors text-[10px] disabled:opacity-40"
                                >
                                  <RefreshCw className={`w-3 h-3 ${retrying === job.id ? "animate-spin" : ""}`} />
                                  Retry
                                </button>
                              </div>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={notifyMap[job.id] ?? false}
                                  onChange={e => setNotifyMap(prev => ({ ...prev, [job.id]: e.target.checked }))}
                                  className="w-2.5 h-2.5 accent-violet-500"
                                />
                                <span className="text-[9px] text-white/30">Notify user</span>
                              </label>
                            </div>
                          )}
                        </div>
                        {retryMsg?.id === job.id && (
                          <p className={`text-[10px] mt-1 ${retryMsg.ok ? "text-green-400" : "text-red-400"}`}>
                            {retryMsg.text}
                          </p>
                        )}
                      </td>
                    </tr>

                    {/* Expanded text row */}
                    {expanded === job.id && (
                      <tr key={`${job.id}-expanded`} className="border-b border-white/5 bg-white/[.015]">
                        <td colSpan={6} className="px-4 py-3">
                          <p className="text-white/50 text-xs leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {job.text}
                          </p>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminGuard>
  )
}