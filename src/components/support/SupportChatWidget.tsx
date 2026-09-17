"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { MessageCircle, X, Send, Loader2 } from "lucide-react"
import api from "@/lib/api"
import { useAuthStore } from "@/store/authStore"

interface Message {
  id: string
  sender: "user" | "admin"
  body: string
  created_at: string
}

interface Conversation {
  id: string
  status: string
}

const POLL_INTERVAL = 3000 // ms

export default function SupportChatWidget() {
  const { user } = useAuthStore()

  const [open, setOpen]                 = useState(false)
  const [messages, setMessages]         = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [body, setBody]                 = useState("")
  const [sending, setSending]           = useState(false)
  const [booting, setBooting]           = useState(false)
  const [unread, setUnread]             = useState(0)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastMsgId = useRef<string | null>(null)

  // ── boot: load existing conversation ──────────────────────────────────
  useEffect(() => {
    if (!user) return
    setBooting(true)
    api.get("/support/conversations/mine")
      .then((res) => {
        const { conversation: conv, messages: msgs } = res.data
        if (conv) {
          setConversation(conv)
          const sorted = [...(msgs || [])].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
          setMessages(sorted)
          if (sorted.length) lastMsgId.current = sorted[sorted.length - 1].id
        }
      })
      .catch(() => {})
      .finally(() => setBooting(false))
  }, [user])

  // ── polling: new messages + unread badge ──────────────────────────────
  const poll = useCallback(async () => {
    if (!user) return
    try {
      const res = await api.get("/support/conversations/mine")
      const { conversation: conv, messages: msgs } = res.data

      if (conv) {
        setConversation(conv)
        const sorted = [...(msgs || [])].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        setMessages(sorted)
        if (sorted.length) {
          const newest = sorted[sorted.length - 1]
          if (!open && newest.sender === "admin" && newest.id !== lastMsgId.current) {
            setUnread((n) => n + 1)
          }
          lastMsgId.current = newest.id
        }
      }
    } catch {}
  }, [user, open])

  useEffect(() => {
    pollRef.current = setInterval(poll, POLL_INTERVAL)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [poll])

  // ── clear unread on open ───────────────────────────────────────────────
  useEffect(() => {
    if (open) setUnread(0)
  }, [open])

  // ── scroll to bottom ───────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ── send first message (creates conversation) ──────────────────────────
  async function sendFirst(text: string) {
    await api.post("/support/conversations", { message: text })
    const full = await api.get("/support/conversations/mine")
    setConversation(full.data.conversation)
    const sorted = [...(full.data.messages || [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    setMessages(sorted)
    if (sorted.length) lastMsgId.current = sorted[sorted.length - 1].id
  }

  // ── send follow-up message ─────────────────────────────────────────────
  async function sendFollowUp(text: string) {
    // optimistic insert
    const optimistic: Message = {
      id:         `opt-${Date.now()}`,
      sender:     "user",
      body:       text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    await api.post("/support/conversations/mine/messages", { body: text })
  }

  async function send() {
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    setBody("")
    try {
      if (!conversation) {
        await sendFirst(text)
      } else {
        await sendFollowUp(text)
      }
      inputRef.current?.focus()
    } catch {
      setBody(text)
    } finally {
      setSending(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  if (!user) return null

  return (
    <>
      {/* ── floating button ──────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Support chat"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 shadow-lg shadow-violet-900/40 transition hover:bg-violet-500 hover:scale-105 active:scale-95"
      >
        {open ? (
          <X className="h-5 w-5 text-white" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6 text-white" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-fuchsia-500 text-[10px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </>
        )}
      </button>

      {/* ── chat panel ───────────────────────────────────────────────── */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-[350px] max-w-[calc(100vw-3rem)] flex-col rounded-2xl border border-white/10 bg-[#12111c] shadow-2xl shadow-black/60">
          {/* header */}
          <div className="flex items-center gap-3 rounded-t-2xl border-b border-white/10 bg-violet-700/20 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600/40">
              <MessageCircle className="h-4 w-4 text-violet-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Talkata Support</p>
              <p className="text-[11px] text-white/40">We reply within the hour</p>
            </div>
          </div>

          {/* messages */}
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4 max-h-72 min-h-[160px]">
            {booting ? (
              <div className="m-auto">
                <Loader2 className="h-4 w-4 animate-spin text-white/30" />
              </div>
            ) : messages.length === 0 ? (
              <div className="m-auto text-center">
                <p className="text-sm text-white/40">
                  Hey {user.full_name?.split(" ")[0] || "there"} 👋
                </p>
                <p className="mt-1 text-xs text-white/25">Send a message — we&apos;re here.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <p
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                      msg.sender === "user"
                        ? "bg-violet-600 text-white rounded-br-sm"
                        : "bg-white/10 text-white/85 rounded-bl-sm"
                    }`}
                  >
                    {msg.body}
                  </p>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* input */}
          <div className="border-t border-white/10 p-3">
            <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <textarea
                ref={inputRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type a message…"
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none max-h-24"
              />
              <button
                onClick={send}
                disabled={!body.trim() || sending}
                className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition hover:bg-violet-500 disabled:opacity-30"
              >
                {sending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Send className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-white/20">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}
    </>
  )
}