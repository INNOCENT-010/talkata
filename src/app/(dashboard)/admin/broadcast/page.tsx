"use client"

import { useEffect, useRef, useState } from "react"
import AdminGuard from "@/components/dashboard/AdminGuard"
import { ChevronLeft, Upload, Plus, X, Send, Loader2, CheckCircle, Users, Mail, AlertTriangle } from "lucide-react"
import Link from "next/link"
import api from "@/lib/api"

interface BroadcastLog {
  id: string
  subject: string
  recipient_count: number
  sent_at: string
}

export default function AdminBroadcastPage() {
  const [subject, setSubject] = useState("")
  const [body, setBody]       = useState("")
  const [emails, setEmails]   = useState<string[]>([])
  const [emailInput, setEmailInput] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [logs, setLogs]       = useState<BroadcastLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.get("/support/admin/broadcast/logs")
      .then((res) => setLogs(res.data.logs || []))
      .finally(() => setLogsLoading(false))
  }, [])

  // ── add email manually ─────────────────────────────────────────────────
  function addEmail() {
    const val = emailInput.trim().toLowerCase()
    if (!val || !val.includes("@") || emails.includes(val)) return
    setEmails((prev) => [...prev, val])
    setEmailInput("")
  }

  function removeEmail(email: string) {
    setEmails((prev) => prev.filter((e) => e !== email))
  }

  function handleEmailKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addEmail()
    }
  }

  // ── import all users from backend ──────────────────────────────────────
  async function importUsers() {
    try {
      const res = await api.get("/support/admin/broadcast/users")
      const imported: string[] = res.data.emails || []
      setEmails((prev) => Array.from(new Set([...prev, ...imported])))
    } catch {}
  }

  // ── import CSV ─────────────────────────────────────────────────────────
  function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const extracted = text
        .split(/[\n,;\r]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.includes("@"))
      setEmails((prev) => Array.from(new Set([...prev, ...extracted])))
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  // ── send broadcast ─────────────────────────────────────────────────────
  async function sendBroadcast() {
    if (!subject.trim() || !body.trim() || emails.length === 0 || sending) return
    setSending(true)
    setError(null)
    try {
      const res = await api.post("/support/admin/broadcast", { subject, body, emails })
      if (!res.data.ok) {
        setError(
          `Sent ${res.data.sent || 0}/${emails.length}. Errors: ${
            (res.data.errors || []).join(", ") || "unknown error"
          }`
        )
        return
      }
      setSent(true)
      setSubject("")
      setBody("")
      setEmails([])
      // refresh logs
      const logRes = await api.get("/support/admin/broadcast/logs")
      setLogs(logRes.data.logs || [])
      setTimeout(() => setSent(false), 4000)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Failed to send broadcast")
    } finally {
      setSending(false)
    }
  }

  return (
    <AdminGuard>
      <div className="min-w-0 w-full max-w-5xl mx-auto pb-16">
        {/* header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="text-white/40 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Broadcast</h1>
            <p className="text-white/50 mt-0.5">Compose and send emails to your users</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* ── compose ── */}
          <div className="space-y-4">
            {/* audience */}
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-400" />
                  <h2 className="text-sm font-semibold text-white">Audience</h2>
                </div>
                {emails.length > 0 && (
                  <span className="text-xs text-white/40">
                    {emails.length} recipient{emails.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={importUsers}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:border-violet-400/30 hover:text-white"
                >
                  <Users className="h-3.5 w-3.5 text-violet-400" />
                  Import all users
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:border-violet-400/30 hover:text-white"
                >
                  <Upload className="h-3.5 w-3.5 text-violet-400" />
                  Import CSV
                </button>
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCSV} />
              </div>

              <div className="flex gap-2 mb-3">
                <input
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleEmailKey}
                  placeholder="Add email address…"
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500"
                />
                <button
                  onClick={addEmail}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 transition hover:border-violet-400/30 hover:text-violet-300"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {emails.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {emails.map((email) => (
                    <span
                      key={email}
                      className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70"
                    >
                      {email}
                      <button
                        onClick={() => removeEmail(email)}
                        className="text-white/30 hover:text-white transition-colors ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* subject + body */}
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="h-4 w-4 text-violet-400" />
                <h2 className="text-sm font-semibold text-white">Message</h2>
              </div>

              <div>
                <label className="text-xs text-white/40 mb-1 block">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. New feature — voice cloning is here"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="text-xs text-white/40 mb-1 block">Body</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message here. Plain text or HTML."
                  rows={10}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500 resize-y"
                />
              </div>

              <button
                onClick={sendBroadcast}
                disabled={!subject.trim() || !body.trim() || emails.length === 0 || sending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-30"
              >
                {sent ? (
                  <><CheckCircle className="h-4 w-4 text-emerald-300" /> Sent!</>
                ) : sending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                ) : (
                  <><Send className="h-4 w-4" /> Send to {emails.length || 0} recipient{emails.length !== 1 ? "s" : ""}</>
                )}
              </button>
            </div>
          </div>

          {/* ── history ── */}
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
            <h2 className="text-sm font-semibold text-white mb-4">History</h2>
            {logsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-white/25" />
              </div>
            ) : logs.length === 0 ? (
              <div className="py-10 text-center">
                <Mail className="mx-auto h-6 w-6 text-white/15" />
                <p className="mt-3 text-xs text-white/25">No broadcasts yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-white/5 bg-white/[.025] px-4 py-3">
                    <p className="text-sm font-medium text-white truncate">{log.subject}</p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-xs text-white/35">
                        {new Date(log.sent_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </span>
                      <span className="text-xs text-white/40">{log.recipient_count} sent</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}