"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import axios from "axios"
import { authAPI } from "@/lib/api"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"

function ResetPasswordContent() {
  const token = useSearchParams().get("token") ?? ""
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [complete, setComplete] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!token) return setError("This reset link is invalid.")
    if (password !== confirmPassword) return setError("Passwords do not match.")
    setLoading(true); setError("")
    try { await authAPI.resetPassword(token, password); setComplete(true) }
    catch (err: unknown) { setError(axios.isAxiosError(err) && typeof err.response?.data?.detail === "string" ? err.response.data.detail : "Could not reset password.") }
    finally { setLoading(false) }
  }

  if (complete) return <div className="flex flex-col gap-4"><h2 className="text-3xl font-bold text-white">Password updated</h2><p className="text-sm text-white/50">You can now sign in with your new password.</p><Link href="/login" className="rounded-lg bg-violet-600 px-4 py-3 text-center font-medium text-white">Sign in</Link></div>
  return <form onSubmit={submit} className="flex flex-col gap-4"><div className="mb-5"><h2 className="text-3xl font-bold text-white">Choose a new password</h2><p className="mt-2 text-sm text-white/50">Use at least 8 characters.</p></div>{error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}<Input label="New password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required autoComplete="new-password" /><Input label="Confirm new password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required autoComplete="new-password" /><Button type="submit" isLoading={loading} size="lg">Update password</Button></form>
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<p className="text-sm text-white/50">Loading reset link…</p>}><ResetPasswordContent /></Suspense>
}
