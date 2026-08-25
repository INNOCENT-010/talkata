"use client"

import { useEffect, useState } from "react"
import AdminGuard from "@/components/dashboard/AdminGuard"
import { Search, Play, Download, ChevronLeft } from "lucide-react"
import Link from "next/link"
import axios from "axios"

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

interface Job {
  id: string
  user_email?: string
  text: string
  voice_name: string
  status: string
  credits_used: number
  audio_url?: string
  error?: string
  created_at: string
}

export default function AdminGenerationsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [filtered, setFiltered] = useState<Job[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : ""
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    axios.get(`${API}/admin/generations`, { headers })
      .then((res) => {
        setJobs(res.data.jobs)
        setFiltered(res.data.jobs)
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    let result = jobs
    if (statusFilter !== "all") {
      result = result.filter(j => j.status === statusFilter)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(j =>
        j.text.toLowerCase().includes(q) ||
        j.voice_name?.toLowerCase().includes(q) ||
        j.user_email?.toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [search, statusFilter, jobs])

  const statusColors: Record<string, string> = {
    complete: "bg-green-500/10 text-green-400",
    failed: "bg-red-500/10 text-red-400",
    processing: "bg-yellow-500/10 text-yellow-400",
    queued: "bg-blue-500/10 text-blue-400",
  }

  return (
    <AdminGuard>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-white/40 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Generations</h1>
            <p className="text-white/50 mt-0.5">{jobs.length} total jobs</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search text, voice, email..."
              className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500 text-sm"
            />
          </div>
          <div className="flex gap-2">
            {["all", "complete", "failed", "processing", "queued"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-lg text-sm transition-all capitalize ${
                  statusFilter === s
                    ? "bg-violet-600 text-white"
                    : "bg-white/5 text-white/50 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-white/40">No generations found</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3">TEXT</th>
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3">VOICE</th>
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3">STATUS</th>
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3">CREDITS</th>
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3">DATE</th>
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3">AUDIO</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((job) => (
                  <tr key={job.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-white text-sm truncate">{job.text}</p>
                      {job.user_email && (
                        <p className="text-white/30 text-xs mt-0.5">{job.user_email}</p>
                      )}
                      {job.error && (
                        <p className="text-red-400 text-xs mt-0.5 truncate">{job.error}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white/60 text-sm capitalize">
                        {job.voice_name?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColors[job.status] || "bg-white/5 text-white/40"}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white/60 text-sm">{job.credits_used}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white/50 text-sm">
                        {new Date(job.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {job.audio_url ? (
                        <div className="flex items-center gap-2">
                          <a href={job.audio_url} target="_blank" className="text-violet-400 hover:text-violet-300">
                            <Play className="w-4 h-4" />
                          </a>
                          <a href={job.audio_url} download className="text-violet-400 hover:text-violet-300">
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminGuard>
  )
}