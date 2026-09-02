"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authAPI } from "@/lib/api"
import { useAuthStore } from "@/store/authStore"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"

export default function RegisterPage() {
  const router = useRouter()
  const { setToken, fetchUser } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      const res = await authAPI.register(form)
      if (res.data.access_token) {
        setToken(res.data.access_token)
        await fetchUser()
        router.push("/dashboard")
        return
      }
      setConfirmationSent(true)
    } catch {
      setError("Registration failed. Email may already be in use.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Create account</h2>
        <p className="text-white/50 text-sm">Early users start with 300,000 credits — no card needed</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {confirmationSent && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          Confirmation email sent. Check your inbox, confirm your account, then sign in.
        </div>
      )}

      <Input
        label="Full Name"
        type="text"
        placeholder="John Doe"
        value={form.full_name}
        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
        required
      />

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
        minLength={8}
      />

      <Button type="submit" isLoading={isLoading} size="lg" className="mt-2 w-full" disabled={confirmationSent}>
        {confirmationSent ? "Check your email" : "Create Account"}
      </Button>

      <p className="text-center text-white/50 text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-violet-400 hover:text-violet-300">
          Sign in
        </Link>
      </p>
    </form>
  )
}
