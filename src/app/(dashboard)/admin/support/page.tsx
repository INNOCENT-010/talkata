"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import AdminGuard from "@/components/dashboard/AdminGuard"
import { ChevronLeft, MessageCircle, Send, Loader2, CheckCircle, Circle } from "lucide-react"
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
}

const POLL_INTERVAL = 3000

export default function AdminSupportPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [active, setActive]               = useState<Conversation | null>(null)
  const [messages, setMessages]           = useState<Message[]>([])
  const [reply, setReply]                 = useState("")
  const [sending, setSending]             = useState(false)
  const [loading, setLoading]             = useState(true)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
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
    if (!text || !active || sending) return
    setSending(true)
    // optimistic
    const optimistic: Message = {
      id:         `opt-${Date.now()}`,
      sender:     "admin",
      body:       text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    setReply("")
    try {
      await api.post(`/support/admin/conversations/${active.id}/reply`, { body: text })
      inputRef.current?.focus()
    } catch {
      setReply(text)
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
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

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count ?? 0), 0)

  return (
    <AdminGuard>
      <div className="min-w-0 w-full max-w-6xl mx-auto h-[calc(100vh-6rem)] flex flex-col">
        {/* header */}
        <div className="flex items-center gap-4 mb-6 shrink-0">
          <Link href="/admin" className="text-white/40 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">Support</h1>
              <p className="text-white/50 mt-0.5">{conversations.length} conversations</p>
            </div>
            {totalUnread > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-fuchsia-500 px-1.5 text-xs font-bold text-white">
                {totalUnread}
              </span>
            )}
          </div>
        </div>

        {/* split layout */}
        <div className="flex flex-1 min-h-0 gap-4">
          {/* ── conversation list ── */}
          <div className="w-72 shrink-0 flex flex-col gap-1 overflow-y-auto rounded-xl border border-white/10 bg-white/[.03] p-2">
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

          {/* ── message thread ── */}
          <div className="flex flex-1 min-w-0 flex-col rounded-xl border border-white/10 bg-white/[.03]">
            {!active ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="mx-auto h-8 w-8 text-white/15" />
                  <p className="mt-3 text-sm text-white/30">Select a conversation</p>
                </div>
              </div>
            ) : (
              <>
                {/* thread header */}
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3 shrink-0">
                  <div>
                    <p className="text-sm font-semibold text-white">{active.user_name}</p>
                    <p className="text-xs text-white/40">{active.user_email}</p>
                  </div>
                  <button
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
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4 min-h-0">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}>
                      <div className="flex flex-col gap-1 max-w-[70%]">
                        <p className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          msg.sender === "admin"
                            ? "bg-violet-600 text-white rounded-br-sm"
                            : "bg-white/10 text-white/85 rounded-bl-sm"
                        }`}>
                          {msg.body}
                        </p>
                        <p className={`text-[10px] text-white/25 ${msg.sender === "admin" ? "text-right" : "text-left"}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* reply box */}
                {active.status === "open" ? (
                  <div className="border-t border-white/10 p-4 shrink-0">
                    <div className="flex items-end gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                      <textarea
                        ref={inputRef}
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="Reply to this conversation…"
                        rows={2}
                        className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none max-h-36"
                      />
                      <button
                        onClick={sendReply}
                        disabled={!reply.trim() || sending}
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
                  <div className="border-t border-white/10 px-5 py-3 shrink-0">
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