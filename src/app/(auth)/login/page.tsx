"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authAPI } from "@/lib/api"
import { useAuthStore } from "@/store/authStore"
import Button from "@/components/ui/Button"
import { Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { setToken, fetchUser, token } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ email: "", password: "" })

  const signInWithGoogle = async () => {
    setError("")
    try {
      const response = await authAPI.googleLogin()
      window.location.assign(response.data.url)
    } catch {
      setError("Google sign-in is unavailable. Please try again shortly.")
    }
  }

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
          <Link href="/forgot-password" className="text-xs text-violet-400 hover:text-violet-300">
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            className="w-full rounded-lg px-4 py-2.5 pr-11 text-white focus:outline-none transition-all"
            style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 px-3 text-white/40 hover:text-white" aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" isLoading={isLoading} size="lg" className="mt-2 w-full">
        Sign In
      </Button>

      <div className="flex items-center gap-3 py-1 text-xs text-white/25"><div className="h-px flex-1 bg-white/10" />or<div className="h-px flex-1 bg-white/10" /></div>
      <button type="button" onClick={signInWithGoogle} className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.23a4.47 4.47 0 0 1-1.94 2.93v2.79h3.14c1.84-1.69 2.92-4.18 2.92-7.75Z" /><path fill="#34A853" d="M12 21.75c2.62 0 4.82-.87 6.43-2.36l-3.14-2.79c-.87.58-1.99.92-3.29.92-2.53 0-4.67-1.71-5.44-4v2.88H3.32a9.72 9.72 0 0 0 8.68 5.35Z" /><path fill="#FBBC05" d="M6.56 13.52a5.84 5.84 0 0 1 0-3.04V7.6H3.32a9.75 9.75 0 0 0 0 8.8l3.24-2.88Z" /><path fill="#EA4335" d="M12 6.48c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.81 3.52 14.62 2.25 12 2.25A9.72 9.72 0 0 0 3.32 7.6l3.24 2.88c.77-2.29 2.91-4 5.44-4Z" /></svg>
        Continue with Google
      </button>

      <p className="text-center text-white/50 text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-violet-400 hover:text-violet-300">
          Sign up
        </Link>
      </p>

      <p className="text-center text-white/30 text-xs mt-2">
        By signing in you agree to our{" "}
        <Link href="/terms" className="text-white/50 hover:text-white underline">Terms</Link>
        {" "}and{" "}
        <Link href="/privacy" className="text-white/50 hover:text-white underline">Privacy Policy</Link>
      </p>
    </form>
  )
}
