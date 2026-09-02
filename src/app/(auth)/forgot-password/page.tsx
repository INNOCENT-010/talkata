"use client"

import { useState } from "react"
import Link from "next/link"
import { authAPI } from "@/lib/api"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    try { await authAPI.forgotPassword(email) } finally { setLoading(false); setSent(true) }
  }

  return <form onSubmit={submit} className="flex flex-col gap-4">
    <div className="mb-5"><h2 className="text-3xl font-bold text-white">Reset password</h2><p className="mt-2 text-sm text-white/50">We’ll send a secure reset link to your email.</p></div>
    {sent ? <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">If an account exists for that address, a reset link is on its way.</div> : <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />}
    {!sent && <Button type="submit" isLoading={loading} size="lg">Send reset link</Button>}
    <Link href="/login" className="text-center text-sm text-violet-400 hover:text-violet-300">Back to sign in</Link>
  </form>
}
