"use client"
import { useEffect, useState } from "react"
import { Power, RefreshCw, ExternalLink } from "lucide-react"
import axios from "axios"
import api from "@/lib/api"

type Worker = { setup_error?: string; online: boolean; configured: boolean; worker_url_configured: boolean; busy: boolean; retry_after: number; message: string; notebook_url: string }

function statusError(cause: unknown) {
  if (axios.isAxiosError(cause) && cause.response?.status === 404) return "Railway is running an older backend: /admin/worker is missing. Deploy the latest talkata-backend code. Changing the Kaggle token will not fix this 404."
  return "Cannot check the worker. Check the backend connection and try Refresh status."
}

export default function WorkerControl() {
  const [worker, setWorker] = useState<Worker | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout>
    async function poll() {
      try {
        const response = await api.get<Worker>("/admin/worker")
        if (active) { setWorker(response.data); setError("") }
      } catch (cause) {
        if (active) setError(statusError(cause))
        if (axios.isAxiosError(cause) && cause.response?.status === 404) return
      }
      if (active) timer = setTimeout(poll, 15000)
    }
    void poll()
    return () => { active = false; clearTimeout(timer) }
  }, [])
  async function refresh() {
    setBusy(true)
    try { setWorker((await api.get<Worker>("/admin/worker")).data); setError("") }
    catch (cause) { setError(statusError(cause)) }
    finally { setBusy(false) }
  }
  async function wake() {
    setBusy(true); setError(""); setNotice("")
    try {
      const response = await api.post<{ message: string }>("/admin/worker/wake")
      setNotice(response.data.message)
      setWorker(current => current ? { ...current, message: response.data.message, retry_after: 300 } : current)
    } catch (cause) {
      setError(axios.isAxiosError(cause) && typeof cause.response?.data?.detail === "string" ? cause.response.data.detail : "The wake-up result is unavailable. Refresh status before retrying.")
    } finally { setBusy(false) }
  }
  return <section className="rounded-2xl border border-white/10 bg-[#11111a] p-4 sm:p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-semibold text-white">Voice worker · Kaggle</h2><p className="mt-1 text-xs text-white/45">Wake your saved notebook using the existing worker address.</p></div>
      <span className={`rounded-full px-3 py-1 text-xs ${error ? "bg-amber-500/10 text-amber-300" : worker?.online ? "bg-emerald-500/10 text-emerald-300" : "bg-white/5 text-white/60"}`}>{error ? "Status unavailable" : !worker ? "Checking…" : worker.online ? "Online" : worker.busy ? "Requesting start…" : "Offline"}</span>
    </div>
    {worker && !worker.configured && <p className="text-sm text-amber-200">{worker.setup_error || "Add KAGGLE_API_TOKEN to the Railway backend, then redeploy."}</p>}
    {worker && !worker.worker_url_configured && <p className="text-sm text-amber-200">The backend needs ML_WORKER_URL to check the worker.</p>}
    {(worker?.message || notice) && <p role="status" className="text-sm text-white/65">{worker?.message || notice}</p>}
    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={wake} disabled={busy || !worker?.configured || !worker.worker_url_configured || worker.online || worker.busy || worker.retry_after > 0} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"><Power size={16} />{worker?.online ? "Worker online" : worker?.busy ? "Starting…" : "Wake up worker"}</button>
      <button type="button" onClick={refresh} disabled={busy} className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/70 disabled:opacity-40"><RefreshCw size={15} />Refresh status</button>
      {worker && <a href={worker.notebook_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-violet-300">Open Kaggle <ExternalLink size={14} /></a>}
    </div>
    {!!worker?.retry_after && !worker.online && <p className="text-xs text-white/40">Another wake-up can be requested in about {Math.ceil(worker.retry_after / 60)} minute(s). Status updates every 15 seconds.</p>}
  </section>
}
