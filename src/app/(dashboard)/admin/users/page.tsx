"use client"

import { useEffect, useState } from "react"
import AdminGuard from "@/components/dashboard/AdminGuard"
import { Search, Zap, Shield, ChevronLeft } from "lucide-react"
import Link from "next/link"
import axios from "axios"

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

interface User {
  id: string
  email: string
  full_name: string
  credits: number
  is_admin: boolean
  created_at: string
  job_count?: number
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filtered, setFiltered] = useState<User[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [editingCredits, setEditingCredits] = useState<string | null>(null)
  const [newCredits, setNewCredits] = useState("")

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : ""
  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    axios.get(`${API}/admin/users`, { headers })
      .then((res) => {
        setUsers(res.data.users)
        setFiltered(res.data.users)
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(users.filter(u =>
      u.email.toLowerCase().includes(q) ||
      u.full_name.toLowerCase().includes(q)
    ))
  }, [search, users])

  const updateCredits = async (userId: string) => {
    await axios.post(`${API}/admin/users/${userId}/credits`,
      { credits: parseInt(newCredits) },
      { headers }
    )
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, credits: parseInt(newCredits) } : u))
    setEditingCredits(null)
    setNewCredits("")
  }

  const toggleAdmin = async (userId: string, current: boolean) => {
    await axios.post(`${API}/admin/users/${userId}/toggle-admin`,
      { is_admin: !current },
      { headers }
    )
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !current } : u))
  }

  return (
    <AdminGuard>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-white/40 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Users</h1>
            <p className="text-white/50 mt-0.5">{users.length} total users</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500 text-sm"
          />
        </div>

        {/* Table */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3">USER</th>
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3">CREDITS</th>
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3">JOINED</th>
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3">ROLE</th>
                  <th className="text-left text-white/40 text-xs font-medium px-6 py-3">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-violet-600/30 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-violet-400 text-xs font-bold">
                            {user.full_name?.[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{user.full_name}</p>
                          <p className="text-white/40 text-xs">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingCredits === user.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={newCredits}
                            onChange={(e) => setNewCredits(e.target.value)}
                            className="w-24 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none"
                            placeholder={String(user.credits)}
                            autoFocus
                          />
                          <button
                            onClick={() => updateCredits(user.id)}
                            className="text-green-400 text-xs hover:text-green-300"
                          >Save</button>
                          <button
                            onClick={() => setEditingCredits(null)}
                            className="text-white/40 text-xs hover:text-white"
                          >Cancel</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingCredits(user.id); setNewCredits(String(user.credits)) }}
                          className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors group"
                        >
                          <Zap className="w-3.5 h-3.5 text-violet-400" />
                          <span className="text-sm">{user.credits.toLocaleString()}</span>
                          <span className="text-white/20 text-xs group-hover:text-violet-400 transition-colors">edit</span>
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white/50 text-sm">
                        {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${user.is_admin ? "bg-violet-500/20 text-violet-300" : "bg-white/5 text-white/40"}`}>
                        {user.is_admin ? "Admin" : "User"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleAdmin(user.id, user.is_admin)}
                        className="flex items-center gap-1.5 text-white/40 hover:text-white text-xs transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        {user.is_admin ? "Remove admin" : "Make admin"}
                      </button>
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