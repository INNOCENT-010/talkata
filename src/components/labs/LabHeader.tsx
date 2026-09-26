"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LabHeader({ title, description }: { title: string; description: string }) {
  const router = useRouter()
  const [error, setError] = useState("")
  return <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
    <div><p className="text-xs uppercase tracking-widest text-violet-300">Private lab / Coming soon</p><h1 className="mt-2 text-3xl font-semibold">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">{description}</p></div>
    <div><button className="rounded-xl border border-white/10 px-4 py-2 text-sm" onClick={async () => {
      try { const r = await fetch("/api/labs/access", { method: "DELETE" }); if (!r.ok) throw new Error(); router.refresh() }
      catch { setError("Could not lock the lab. Try again.") }
    }}>Lock labs</button>{error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}</div>
  </header>
}
