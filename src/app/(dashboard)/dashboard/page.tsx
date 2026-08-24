"use client"

import { useEffect, useState } from "react"
import { useAuthStore } from "@/store/authStore"
import { generateAPI } from "@/lib/api"
import { formatCredits, formatDate } from "@/lib/utils"
import { Mic2, Zap, History, TrendingUp } from "lucide-react"
import Link from "next/link"
import Button from "@/components/ui/Button"

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [recentJobs, setRecentJobs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    generateAPI.history().then((res) => {
      setRecentJobs(res.data.jobs.slice(0, 5))
    }).finally(() => setIsLoading(false))
  }, [])

  const stats = [
    {
      label: "Credits Remaining",
      value: formatCredits(user?.credits ?? 0),
      icon: Zap,
      color: "text-violet-400",
      bg: "bg-violet-600/10 border-violet-500/20"
    },
    {
      label: "Generations Today",
      value: recentJobs.filter(j => 
        new Date(j.created_at).toDateString() === new Date().toDateString()
      ).length,
      icon: Mic2,
      color: "text-blue-400",
      bg: "bg-blue-600/10 border-blue-500/20"
    },
    {
      label: "Total Generations",
      value: recentJobs.length,
      icon: TrendingUp,
      color: "text-green-400",
      bg: "bg-green-600/10 border-green-500/20"
    },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {user?.full_name?.split(" ")[0]} 👋
        </h1>
        <p className="text-white/50 mt-1">Here's what's happening with your account</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`border rounded-xl p-5 ${bg}`}>
            <div className="flex items-center gap-3 mb-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="text-white/60 text-sm">{label}</span>
            </div>
            <p className="text-white text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-2">Generate Voice</h3>
          <p className="text-white/50 text-sm mb-4">
            Turn your text into natural sounding speech instantly
          </p>
          <Link href="/generate">
            <Button size="sm">Start Generating</Button>
          </Link>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-2">Buy Credits</h3>
          <p className="text-white/50 text-sm mb-4">
            Top up your credits to keep generating without limits
          </p>
          <Link href="/credits">
            <Button size="sm" variant="secondary">View Plans</Button>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Recent Generations</h3>
          <Link href="/history" className="text-violet-400 text-sm hover:text-violet-300">
            View all
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : recentJobs.length === 0 ? (
          <div className="text-center py-8">
            <History className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-white/40 text-sm">No generations yet</p>
            <Link href="/generate">
              <Button size="sm" className="mt-3">Generate your first voice</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{job.text}</p>
                  <p className="text-white/40 text-xs mt-0.5">{formatDate(job.created_at)}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    job.status === "complete"
                      ? "bg-green-500/10 text-green-400"
                      : job.status === "failed"
                      ? "bg-red-500/10 text-red-400"
                      : "bg-yellow-500/10 text-yellow-400"
                  }`}>
                    {job.status}
                  </span>
                  {job.audio_url && (
                    <a
                      href={job.audio_url}
                      target="_blank"
                      className="text-violet-400 text-xs hover:text-violet-300"
                    >
                      Play
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}