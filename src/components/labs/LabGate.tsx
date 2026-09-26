"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LockKeyhole } from "lucide-react"

export default function LabGate({ title, description }: { title: string; description: string }) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  return <section className="mx-auto flex min-h-[65vh] max-w-md flex-col justify-center text-center">
    <LockKeyhole className="mx-auto mb-5 h-10 w-10 text-violet-400" />
    <span className="text-xs font-semibold uppercase tracking-widest text-violet-300">Coming soon</span>
    <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
    <p className="mt-3 text-sm leading-6 text-white/50">{description}</p>
    <form className="mt-8 rounded-2xl border border-white/10 bg-white/[.025] p-5 text-left" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError("")
      try {
        const res = await fetch("/api/labs/access", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Could not unlock the lab.")
        setPassword(""); router.refresh()
      } catch (err) { setError(err instanceof Error ? err.message : "Connection failed. Please try again.") }
      finally { setBusy(false) }
    }}>
      <label htmlFor="lab-password" className="text-sm text-white/70">Private tester access</label>
      <input id="lab-password" type="password" autoComplete="current-password" required maxLength={256} value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 outline-none focus:border-violet-500" />
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      <button disabled={busy} className="mt-4 w-full rounded-xl bg-violet-600 p-3 font-medium disabled:opacity-50">{busy ? "Checking..." : "Enter lab"}</button>
    </form>
  </section>
}
