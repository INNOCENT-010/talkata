"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authAPI } from "@/lib/api"
import { useAuthStore } from "@/store/authStore"
import Button from "@/components/ui/Button"

export default function LoginPage() {
  const router = useRouter()
  const { setToken, fetchUser, token } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ email: "", password: "" })

  // If already logged in skip straight to dashboard
  useEffect(() => {
    if (token) router.replace("/dashboard")
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      const res = await authAPI.login(form)
      setToken(res.data.access_token)
      // Prefetch user in background — don't block navigation
      fetchUser().catch(() => {})
      router.push("/dashboard")
    } catch {
      setError("Invalid email or password")
      setIsLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      autoComplete="on"
      className="flex flex-col gap-4"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
        <p className="text-white/50 text-sm">Sign in to continue to Talkata</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
          Email
        </label>
        <input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          className="w-full px-4 py-2.5 rounded-lg text-white focus:outline-none transition-all"
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
            Password
          </label>
        </div>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          className="w-full px-4 py-2.5 rounded-lg text-white focus:outline-none transition-all"
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        />
      </div>

      <Button type="submit" isLoading={isLoading} size="lg" className="mt-2 w-full">
        Sign In
      </Button>

      <p className="text-center text-white/50 text-sm">
        Don't have an account?{" "}
        <Link href="/register" className="text-violet-400 hover:text-violet-300">
          Sign up
        </Link>
      </p>
    </form>
  )
}