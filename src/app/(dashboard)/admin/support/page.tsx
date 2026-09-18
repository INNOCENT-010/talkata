"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import AdminGuard from "@/components/dashboard/AdminGuard"
import { ChevronLeft, MessageCircle, Send, Loader2, CheckCircle, Circle, Paperclip, FileText, X } from "lucide-react"
import Link from "next/link"
import api from "@/lib/api"

interface Conversation {
  id: string
  user_name: string
  user_email: string
  status: "open" | "resolved"
  updated_at: string
  last_message?: string
  unread_count?: number
}

interface Message {
  id: string
  sender: "user" | "admin"
  body: string
  created_at: string
  attachment_url?: string | null
  attachment_name?: string | null
  attachment_type?: string | null
}

const POLL_INTERVAL = 3000

export default function AdminSupportPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [active, setActive]               = useState<Conversation | null>(null)
  const [messages, setMessages]           = useState<Message[]>([])
  const [reply, setReply]                 = useState("")
  const [file, setFile]                   = useState<File | null>(null)
  const [sending, setSending]             = useState(false)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const fileRef    = useRef<HTMLInputElement>(null)
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeRef  = useRef<Conversation | null>(null)  // stable ref for poll closure

  // keep activeRef in sync
  useEffect(() => { activeRef.current = active }, [active])

  // ── load conversations ─────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get("/support/admin/conversations")
      setConversations(res.data.conversations || [])
    } catch {}
  }, [])

  useEffect(() => {
    fetchConversations().finally(() => setLoading(false))
  }, [fetchConversations])

  // ── polling: conv list + active thread ────────────────────────────────
  const poll = useCallback(async () => {
    await fetchConversations()
    if (activeRef.current) {
      try {
        const res = await api.get(`/support/admin/conversations/${activeRef.current.id}/messages`)
        const sorted = [...(res.data.messages || [])].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        setMessages(sorted)
      } catch {}
    }
  }, [fetchConversations])

  useEffect(() => {
    pollRef.current = setInterval(poll, POLL_INTERVAL)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [poll])

  // ── open conversation ──────────────────────────────────────────────────
  async function openConversation(conv: Conversation) {
    setActive(conv)
    setMessages([])
    try {
      const res = await api.get(`/support/admin/conversations/${conv.id}/messages`)
      const sorted = [...(res.data.messages || [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      setMessages(sorted)
      // clear unread locally
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
      )
    } catch {}
  }

  // ── scroll bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── send reply ─────────────────────────────────────────────────────────
  async function sendReply() {
    const text = reply.trim()
    if ((!text && !file) || !active || sending) return
    setSending(true)
    setError(null)
    const pendingFile = file
    // optimistic
    const optimistic: Message = {
      id:         `opt-${Date.now()}`,
      sender:     "admin",
      body:       text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    setReply("")
    setFile(null)
    try {
      const form = new FormData()
      form.append("body", text)
      if (pendingFile) form.append("file", pendingFile)
      await api.post(`/support/admin/conversations/${active.id}/reply`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      inputRef.current?.focus()
    } catch (err: any) {
      setReply(text)
      setFile(pendingFile)
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setError(err?.response?.data?.detail || "Failed to send reply.")
    } finally {
      setSending(false)
    }
  }

  async function toggleStatus(conv: Conversation) {
    const next = conv.status === "open" ? "resolved" : "open"
    await api.patch(`/support/admin/conversations/${conv.id}/status`, { status: next })
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, status: next } : c))
    )
    if (active?.id === conv.id) setActive({ ...conv, status: next })
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendReply()
    }
  }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (picked) setFile(picked)
    e.target.value = ""
  }

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count ?? 0), 0)

    // mobile: show thread when active, list otherwise
  const showList   = !active || typeof window === "undefined" || window.innerWidth >= 768
  const showThread = !!active

  return (
    <AdminGuard>
      <div className="min-w-0 w-full max-w-6xl mx-auto h-[calc(100dvh-6rem)] flex flex-col">

        {/* ── header ── */}
        <div className="flex items-center gap-4 mb-4 shrink-0">
          {/* on mobile inside a thread, show back-to-list button */}
          {active ? (
            <button
              type="button"
              onClick={() => setActive(null)}
              className="md:hidden text-white/40 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : null}
          <Link href="/admin" className="hidden md:block text-white/40 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          {!active && (
            <Link href="/admin" className="md:hidden text-white/40 hover:text-white transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          )}
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">
                {active ? (
                  <span className="md:hidden">{active.user_name}</span>
                ) : null}
                <span className={active ? "hidden md:inline" : ""}> Support</span>
              </h1>
              <p className="text-white/50 mt-0.5 text-xs md:text-sm">
                {active
                  ? <span className="md:hidden">{active.user_email}</span>
                  : null}
                <span className={active ? "hidden md:inline" : ""}>{conversations.length} conversations</span>
              </p>
            </div>
            {totalUnread > 0 && !active && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-fuchsia-500 px-1.5 text-xs font-bold text-white">
                {totalUnread}
              </span>
            )}
            {active && (
              <button
                type="button"
                onClick={() => toggleStatus(active)}
                className="md:hidden flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:border-white/20 hover:text-white ml-auto"
              >
                {active.status === "open"
                  ? <><CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> Resolve</>
                  : <><Circle className="h-3.5 w-3.5 text-white/30" /> Reopen</>
                }
              </button>
            )}
          </div>
        </div>

        {/* ── split layout ── */}
        <div className="flex flex-1 min-h-0 gap-4">

          {/* ── conversation list: full width on mobile when no active, sidebar on desktop ── */}
          <div className={`
            flex flex-col gap-1 overflow-y-auto rounded-xl border border-white/10 bg-white/[.03] p-2
            ${active ? "hidden md:flex md:w-72 md:shrink-0" : "flex w-full md:w-72 md:shrink-0"}
          `}>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-white/30" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-12 text-center">
                <MessageCircle className="mx-auto h-6 w-6 text-white/20" />
                <p className="mt-3 text-sm text-white/30">No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  type="button"
                  key={conv.id}
                  onClick={() => openConversation(conv)}
                  className={`flex w-full flex-col gap-1 rounded-lg px-3 py-3 text-left transition ${
                    active?.id === conv.id
                      ? "bg-violet-600/25 border border-violet-500/30"
                      : "hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white truncate">{conv.user_name}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(conv.unread_count ?? 0) > 0 && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-fuchsia-500 text-[9px] font-bold text-white">
                          {conv.unread_count}
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        conv.status === "open"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-white/5 text-white/30"
                      }`}>
                        {conv.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-white/35 truncate">{conv.user_email}</p>
                  {conv.last_message && (
                    <p className="text-xs text-white/25 truncate">{conv.last_message}</p>
                  )}
                </button>
              ))
            )}
          </div>

          {/* ── message thread: full screen on mobile when active, panel on desktop ── */}
          <div className={`
            flex-col rounded-xl border border-white/10 bg-white/[.03] min-w-0
            ${active ? "flex flex-1" : "hidden md:flex md:flex-1"}
          `}>
            {!active ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="mx-auto h-8 w-8 text-white/15" />
                  <p className="mt-3 text-sm text-white/30">Select a conversation</p>
                </div>
              </div>
            ) : (
              <>
                {/* thread header — hidden on mobile (info moved to page header) */}
                <div className="hidden md:flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3 shrink-0">
                  <div>
                    <p className="text-sm font-semibold text-white">{active.user_name}</p>
                    <p className="text-xs text-white/40">{active.user_email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleStatus(active)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition hover:border-white/20 hover:text-white"
                  >
                    {active.status === "open"
                      ? <><CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> Resolve</>
                      : <><Circle className="h-3.5 w-3.5 text-white/30" /> Reopen</>
                    }
                  </button>
                </div>

                {/* messages */}
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 md:px-5 py-4 min-h-0">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}>
                      <div className="flex flex-col gap-1 max-w-[80%] md:max-w-[70%]">
                        <div className={`rounded-2xl px-3 md:px-4 py-2.5 text-sm leading-relaxed ${
                          msg.sender === "admin"
                            ? "bg-violet-600 text-white rounded-br-sm"
                            : "bg-white/10 text-white/85 rounded-bl-sm"
                        }`}>
                          {msg.body && msg.body.trim() && <p>{msg.body}</p>}
                          {msg.attachment_url && (
                            <a
                              href={msg.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 flex items-center gap-1.5 rounded-lg bg-black/20 px-2 py-1.5 text-xs underline underline-offset-2"
                            >
                              {msg.attachment_type?.startsWith("image/") ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={msg.attachment_url}
                                  alt={msg.attachment_name || "attachment"}
                                  className="max-h-40 rounded-md"
                                />
                              ) : (
                                <>
                                  <FileText className="h-3.5 w-3.5 shrink-0" />
                                  {msg.attachment_name || "Attachment"}
                                </>
                              )}
                            </a>
                          )}
                        </div>
                        <p className={`text-[10px] text-white/25 ${msg.sender === "admin" ? "text-right" : "text-left"}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {error && (
                  <p className="px-4 md:px-5 pb-1 text-[11px] text-rose-400">{error}</p>
                )}

                {/* reply box */}
                {active.status === "open" ? (
                  <div className="border-t border-white/10 p-3 md:p-4 shrink-0">
                    {file && (
                      <div className="mb-2 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/70">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-violet-300" />
                        <span className="flex-1 truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          className="text-white/30 hover:text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-end gap-2 md:gap-3 rounded-xl border border-white/10 bg-white/5 px-3 md:px-4 py-2 md:py-3">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/40 transition hover:text-violet-300"
                        aria-label="Attach file"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,application/pdf,.doc,.docx,.txt,.zip"
                        className="hidden"
                        onChange={handleFilePick}
                      />
                      <textarea
                        ref={inputRef}
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="Reply to this conversation…"
                        rows={2}
                        style={{ fontSize: "16px" }}
                        className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none max-h-36"
                      />
                      <button
                        type="button"
                        onClick={sendReply}
                        disabled={(!reply.trim() && !file) || sending}
                        className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition hover:bg-violet-500 disabled:opacity-30"
                      >
                        {sending
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Send className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-1.5 text-[10px] text-white/20">Enter to send · Shift+Enter for new line</p>
                  </div>
                ) : (
                  <div className="border-t border-white/10 px-4 md:px-5 py-3 shrink-0">
                    <p className="text-xs text-white/25 text-center">Resolved — reopen to reply.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminGuard>
  )
}