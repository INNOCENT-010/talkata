"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authAPI } from "@/lib/api"
import { useAuthStore } from "@/store/authStore"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"

export default function LoginPage() {
  const router = useRouter()
  const { setToken, fetchUser } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({ email: "", password: "" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      const res = await authAPI.login(form)
      setToken(res.data.access_token)
      await fetchUser()
      router.push("/dashboard")
    } catch {
      setError("Invalid email or password")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="mb-2">
        <h2 className="text-xl font-bold text-white">Welcome back</h2>
        <p className="text-white/50 text-sm mt-1">Sign in to your account</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        required
      />

      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        required
      />

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