"use client"

import { useEffect, useState } from "react"
import AdminGuard from "@/components/dashboard/AdminGuard"
import { Users, Mic2, Zap, TrendingUp, AlertCircle, CheckCircle, DollarSign } from "lucide-react"
import Link from "next/link"
import axios from "axios"

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

interface Stats {
  total_users: number
  total_jobs: number
  completed_jobs: number
  failed_jobs: number
  total_credits_used: number
  jobs_today: number
  total_revenue_usd: number
  today_revenue_usd: number
  total_transactions: number
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    axios.get(`${API}/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then((res) => setStats(res.data))
      .finally(() => setIsLoading(false))
  }, [])

  const cards = stats ? [
    { label: "Total Users", value: stats.total_users, icon: Users, color: "text-blue-400", bg: "bg-blue-600/10 border-blue-500/20" },
    { label: "Total Generations", value: stats.total_jobs, icon: Mic2, color: "text-violet-400", bg: "bg-violet-600/10 border-violet-500/20" },
    { label: "Completed", value: stats.completed_jobs, icon: CheckCircle, color: "text-green-400", bg: "bg-green-600/10 border-green-500/20" },
    { label: "Failed", value: stats.failed_jobs, icon: AlertCircle, color: "text-red-400", bg: "bg-red-600/10 border-red-500/20" },
    { label: "Jobs Today", value: stats.jobs_today, icon: TrendingUp, color: "text-yellow-400", bg: "bg-yellow-600/10 border-yellow-500/20" },
    { label: "Credits Used", value: stats.total_credits_used?.toLocaleString(), icon: Zap, color: "text-orange-400", bg: "bg-orange-600/10 border-orange-500/20" },
    { label: "Total Revenue", value: `$${stats.total_revenue_usd.toFixed(2)}`, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-600/10 border-emerald-500/20" },
    { label: "Revenue Today", value: `$${stats.today_revenue_usd.toFixed(2)}`, icon: DollarSign, color: "text-emerald-300", bg: "bg-emerald-600/5 border-emerald-500/10" },
    { label: "Transactions", value: stats.total_transactions, icon: TrendingUp, color: "text-cyan-400", bg: "bg-cyan-600/10 border-cyan-500/20" },
  ] : []

  const quickLinks = [
    { href: "/admin/users", label: "Manage Users", desc: "View all users, credits, activity", icon: Users },
    { href: "/admin/generations", label: "All Generations", desc: "Browse every job and audio file", icon: Mic2 },
    { href: "/admin/voices", label: "Manage Voices", desc: "Toggle voices on or off", icon: Zap },
  ]

  return (
    <AdminGuard>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-white/50 mt-1">Platform overview and management</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {cards.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={`border rounded-xl p-5 ${bg}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-white/50 text-sm">{label}</span>
                </div>
                <p className="text-white text-2xl font-bold truncate">{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickLinks.map(({ href, label, desc, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-white/20 transition-all group"
            >
              <Icon className="w-6 h-6 text-violet-400 mb-3" />
              <h3 className="text-white font-semibold mb-1 group-hover:text-violet-300 transition-colors">{label}</h3>
              <p className="text-white/40 text-sm">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </AdminGuard>
  )
}