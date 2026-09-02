"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authAPI } from "@/lib/api"
import { useAuthStore } from "@/store/authStore"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"
import { CheckCircle2, Copy } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const { setToken, fetchUser } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [copied, setCopied] = useState(false)
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
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /><div><p className="font-semibold">Check your inbox to activate Talkata.</p><p className="mt-1 leading-5 text-emerald-100/70">We sent a confirmation link to <span className="font-medium text-emerald-100">{form.email}</span>. Open it in this browser, then return here to sign in and claim your 300,000 early-user credits.</p></div></div>
          <button type="button" onClick={async () => { await navigator.clipboard.writeText(form.email); setCopied(true) }} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-300/20 bg-black/10 px-3 py-2 text-xs font-medium text-emerald-100 transition hover:bg-black/20"><Copy className="h-3.5 w-3.5" />{copied ? "Email address copied" : "Copy email address"}</button>
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
