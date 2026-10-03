"use client"

import { useEffect, useRef, useState } from "react"
import { isAxiosError } from "axios"
import api from "@/lib/api"
import { useAuthStore } from "@/store/authStore"

type Job = { id: string; status: string; audio_url?: string; error?: string }
function message(error: unknown) {
  const detail = isAxiosError(error) && error.response?.data?.detail
  return typeof detail === "string" ? detail : "Couldn’t connect. Check the preview status before trying again."
}

export default function ClonePreview({ cloneId, name }: { cloneId: string; name: string }) {
  const [job, setJob] = useState<Job | null>(null)
  const [text, setText] = useState("")
  const [credits, setCredits] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [check, setCheck] = useState(0)
  const lock = useRef(false)
  const mounted = useRef(true)
  const audio = useRef<HTMLAudioElement>(null)
  const fetchUser = useAuthStore(s => s.fetchUser)

  useEffect(() => {
    mounted.current = true
    const controller = new AbortController()
    api.get(`/cloning/${cloneId}/preview`, { signal: controller.signal, timeout: 15000 })
      .then(r => { setJob(r.data.job); setText(r.data.text); setCredits(r.data.credits); setError("") })
      .catch(e => { if (!controller.signal.aborted) setError(message(e)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => {
      mounted.current = false; controller.abort()
      // The audio element is created after this request, so stop the latest node.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      audio.current?.pause()
    }
  }, [cloneId, check])

  const jobId = job?.id
  const jobStatus = job?.status
  useEffect(() => {
    if (!jobId || !jobStatus || !["queued", "processing"].includes(jobStatus)) return
    let disposed = false
    let timer: ReturnType<typeof setTimeout>
    const deadline = Date.now() + 10 * 60 * 1000
    const poll = async () => {
      try {
        const result = await api.get(`/generate/job/${jobId}`, { timeout: 15000 })
        if (disposed) return
        setJob(result.data)
        if (!["queued", "processing"].includes(result.data.status)) { fetchUser().catch(() => {}); return }
        if (Date.now() >= deadline) { setError("Your preview is taking longer than expected. Check its status; no new preview will be charged."); return }
        timer = setTimeout(poll, 3000)
      } catch (e) { if (!disposed) setError(message(e)) }
    }
    timer = setTimeout(poll, 1000)
    return () => { disposed = true; clearTimeout(timer) }
  }, [jobId, jobStatus, check, fetchUser])

  async function generate() {
    if (lock.current) return
    lock.current = true; setSubmitting(true); setError("")
    try {
      const response = await api.post(`/cloning/${cloneId}/preview`, {}, { timeout: 30000 })
      if (!mounted.current) return
      setJob({ id: response.data.job_id, status: response.data.status, audio_url: response.data.audio_url })
      fetchUser().catch(() => {})
    } catch (e) { if (mounted.current) { setError(message(e)); setCheck(c => c + 1) } }
    finally { lock.current = false; if (mounted.current) setSubmitting(false) }
  }

  const pending = job && ["queued", "processing"].includes(job.status)
  return <section className="mt-3 rounded-xl border border-violet-400/20 bg-violet-500/[.06] p-4" aria-label={`Generated preview of ${name}`}>
    <h3 className="text-sm font-semibold text-white">Hear {name} generate speech</h3>
    <p className="mt-1 text-xs leading-5 text-white/50">This creates a new spoken sample using your saved voice. Your original recording is the reference.</p>
    {text && <blockquote className="my-3 text-sm leading-6 text-violet-100/80">“{text}”</blockquote>}
    {loading ? <p className="mt-3 text-sm text-white/50">Checking your preview…</p> : job?.status === "complete" && job.audio_url ? <audio ref={audio} controls preload="none" src={job.audio_url} className="mt-3 w-full" /> : pending ? <p role="status" className="mt-3 text-sm text-violet-200">{job.status === "queued" ? "Preview queued…" : "Creating your voice preview…"} You can leave and return to this voice.</p> : <>
      {job?.status === "failed" && <p className="mt-3 text-sm text-red-300">{job.error || "Preview generation failed. You can try again."}</p>}
      <button type="button" onClick={generate} disabled={submitting || credits === null || !!error} className="mt-3 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">{submitting ? "Starting preview…" : `Generate preview · ${credits?.toLocaleString() ?? "…"} credits`}</button>
    </>}
    {job?.status === "complete" && <p className="mt-2 text-xs text-white/40">Replay this preview at no extra cost.</p>}
    {error && <div role="alert" className="mt-3 text-sm text-red-300"><p>{error}</p><button type="button" onClick={() => { setError(""); setLoading(true); setCheck(c => c + 1) }} className="mt-2 underline">Check preview status</button></div>}
  </section>
}
