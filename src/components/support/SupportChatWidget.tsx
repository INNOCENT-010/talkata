"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { MessageCircle, X, Send, Loader2, Paperclip, FileText } from "lucide-react"
import api from "@/lib/api"
import { useAuthStore } from "@/store/authStore"

interface Message {
  id: string
  sender: "user" | "admin"
  body: string
  created_at: string
  attachment_url?: string | null
  attachment_name?: string | null
  attachment_type?: string | null
}

interface Conversation {
  id: string
  status: string
}

const POLL_INTERVAL = 3000 // ms
const MAX_TEXTAREA_PX = 96 // ~4 lines

export default function SupportChatWidget() {
  const { user } = useAuthStore()

  const [open, setOpen]                 = useState(false)
  const [messages, setMessages]         = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [body, setBody]                 = useState("")
  const [file, setFile]                 = useState<File | null>(null)
  const [sending, setSending]           = useState(false)
  const [booting, setBooting]           = useState(false)
  const [unread, setUnread]             = useState(0)
  const [error, setError]               = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)
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

  // ── auto-grow textarea up to ~4 lines ──────────────────────────────────
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, MAX_TEXTAREA_PX) + "px"
  }, [body])

  // ── send first message (creates conversation) ──────────────────────────
  async function sendFirst(text: string, attachment: File | null) {
    const form = new FormData()
    form.append("message", text)
    if (attachment) form.append("file", attachment)
    await api.post("/support/conversations", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    const full = await api.get("/support/conversations/mine")
    setConversation(full.data.conversation)
    const sorted = [...(full.data.messages || [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    setMessages(sorted)
    if (sorted.length) lastMsgId.current = sorted[sorted.length - 1].id
  }

  // ── send follow-up message ─────────────────────────────────────────────
  async function sendFollowUp(text: string, attachment: File | null) {
    const form = new FormData()
    form.append("message", text)
    if (attachment) form.append("file", attachment)

    // optimistic insert
    const optimistic: Message = {
      id:         `opt-${Date.now()}`,
      sender:     "user",
      body:       text,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])

    await api.post("/support/conversations/mine/messages", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  }

  async function send() {
    const text = body.trim()
    if ((!text && !file) || sending) return
    setSending(true)
    setError(null)
    const pendingFile = file
    setBody("")
    setFile(null)
    try {
      if (!conversation) {
        await sendFirst(text, pendingFile)
      } else {
        await sendFollowUp(text, pendingFile)
      }
      inputRef.current?.focus()
    } catch (err: any) {
      setBody(text)
      setFile(pendingFile)
      const raw = err?.response?.data?.detail
      const msg = typeof raw === "string"
        ? raw
        : Array.isArray(raw)
          ? raw.map((e: any) => e?.msg ?? JSON.stringify(e)).join(", ")
          : "Failed to send. Try again."
      setError(msg)
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

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (picked) setFile(picked)
    e.target.value = ""
  }

  // scroll input into view when mobile keyboard opens
  function handleFocus() {
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 250)
  }

  if (!user) return null

  return (
    <>
      {/* ── floating button ──────────────────────────────────────────── */}
      <button
        type="button"
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
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto flex w-[350px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-white/10 bg-[#12111c] shadow-2xl shadow-black/60 sm:right-6 sm:left-auto sm:inset-x-auto">
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
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                      msg.sender === "user"
                        ? "bg-violet-600 text-white rounded-br-sm"
                        : "bg-white/10 text-white/85 rounded-bl-sm"
                    }`}
                  >
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
                            className="max-h-32 rounded-md"
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
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {error && (
            <p className="px-4 pb-1 text-[11px] text-rose-400">{error}</p>
          )}

          {/* input */}
          <div className="border-t border-white/10 p-3">
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
            <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/40 transition hover:text-violet-300"
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
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={handleKey}
                onFocus={handleFocus}
                placeholder="Type a message…"
                rows={1}
                inputMode="text"
                enterKeyHint="send"
                style={{ fontSize: "16px" }} // prevents iOS auto-zoom on focus
                className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none leading-6"
              />
              <button
                type="button"
                onClick={send}
                disabled={(!body.trim() && !file) || sending}
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