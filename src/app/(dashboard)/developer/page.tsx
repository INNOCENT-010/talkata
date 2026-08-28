"use client"

import { useEffect, useState, useRef } from "react"
import { useAuthStore } from "@/store/authStore"
import {
  Code2, Key, BarChart2, Copy, Trash2, Plus, Check,
  Zap, Terminal, ChevronDown, ChevronUp, Eye, EyeOff,
} from "lucide-react"
import api from "@/lib/api"

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  is_active: boolean
  last_used_at?: string
  total_requests: number
  total_characters: number
  created_at: string
}

interface DailyUsage {
  date: string
  characters: number
}

interface UsageStats {
  total_characters: number
  total_requests: number
  credits_remaining: number
  daily_chart: DailyUsage[]
}

type Tab = "keys" | "usage" | "docs"

const CODE_EXAMPLES = {
  curl: `curl -X POST https://api.talkata.ink/developer/v1/audio/speech \\
  -H "Authorization: Bearer sk-tal-your-key-here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "input": "Hello, this is Talkata speaking.",
    "voice": "nova",
    "speed": 1.0
  }' \\
  --output speech.wav`,

  python: `import requests

response = requests.post(
    "https://api.talkata.ink/developer/v1/audio/speech",
    headers={"Authorization": "Bearer sk-tal-your-key-here"},
    json={
        "input": "Hello, this is Talkata speaking.",
        "voice": "nova",
        "speed": 1.0,
    },
)

with open("speech.wav", "wb") as f:
    f.write(response.content)

print("Credits used:", response.headers.get("X-Credits-Used"))`,

  node: `const fs = require("fs")

const response = await fetch(
  "https://api.talkata.ink/developer/v1/audio/speech",
  {
    method: "POST",
    headers: {
      Authorization: "Bearer sk-tal-your-key-here",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: "Hello, this is Talkata speaking.",
      voice: "nova",
      speed: 1.0,
    }),
  }
)

const buffer = await response.arrayBuffer()
fs.writeFileSync("speech.wav", Buffer.from(buffer))
console.log("Credits used:", response.headers.get("x-credits-used"))`,
}

const VOICES = [
  { id: "nova",    label: "Nova",    type: "Standard" },
  { id: "aria",    label: "Aria",    type: "Standard" },
  { id: "luna",    label: "Luna",    type: "Standard" },
  { id: "sage",    label: "Sage",    type: "Standard" },
  { id: "ivy",     label: "Ivy",     type: "Standard" },
  { id: "atlas",   label: "Atlas",   type: "Standard" },
  { id: "echo",    label: "Echo",    type: "Standard" },
  { id: "orion",   label: "Orion",   type: "Standard" },
  { id: "jasper",  label: "Jasper",  type: "Standard" },
  { id: "horror_male",         label: "Horror Male",         type: "Character" },
  { id: "dramatic_male",       label: "Dramatic Male",       type: "Character" },
  { id: "classic_narrator",    label: "Classic Narrator",    type: "Character" },
  { id: "enthusiastic_female", label: "Enthusiastic Female", type: "Character" },
  { id: "detective_female",    label: "Detective Female",    type: "Character" },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="text-white/30 hover:text-violet-400 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  return (
    <div className="relative bg-black/40 border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <span className="text-white/30 text-xs font-mono">{lang}</span>
        <CopyButton text={code} />
      </div>
      <pre className="px-4 py-4 text-xs text-white/70 font-mono overflow-x-auto leading-relaxed">
        {code}
      </pre>
    </div>
  )
}

function UsageBar({ chart }: { chart: DailyUsage[] }) {
  const max = Math.max(...chart.map(d => d.characters), 1)
  const last7 = chart.slice(-7)
  return (
    <div className="flex items-end gap-1 h-16">
      {last7.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
          <div className="w-full bg-violet-500/20 rounded-sm relative" style={{ height: `${Math.max(4, (d.characters / max) * 56)}px` }}>
            <div className="absolute inset-0 bg-violet-500 rounded-sm opacity-80" />
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#1a1a2e] border border-white/10 text-white/60 text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity pointer-events-none">
              {d.characters.toLocaleString()} chars
            </div>
          </div>
          <span className="text-white/20 text-xs">{d.date.slice(5)}</span>
        </div>
      ))}
    </div>
  )
}

export default function DeveloperPage() {
  const { user } = useAuthStore()
  const [tab, setTab]         = useState<Tab>("keys")
  const [keys, setKeys]       = useState<ApiKey[]>([])
  const [usage, setUsage]     = useState<UsageStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [showNewKey, setShowNewKey] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [codeTab, setCodeTab] = useState<"curl" | "python" | "node">("curl")
  const [docSection, setDocSection] = useState<string | null>("auth")

  const fetchKeys = async () => {
    const res = await api.get("/developer/keys")
    setKeys(res.data.keys)
  }

  const fetchUsage = async () => {
    const res = await api.get("/developer/usage")
    setUsage(res.data)
  }

  useEffect(() => {
    Promise.all([fetchKeys(), fetchUsage()]).finally(() => setIsLoading(false))
  }, [])

  const handleCreateKey = async () => {
    if (isCreating) return
    setIsCreating(true)
    try {
      const res = await api.post("/developer/keys", { name: newKeyName || "Default Key" })
      setNewKeyValue(res.data.key)
      setShowNewKey(true)
      setNewKeyName("")
      await fetchKeys()
    } catch (err: any) {
      alert(err?.response?.data?.detail ?? "Failed to create key")
    } finally {
      setIsCreating(false)
    }
  }

  const handleRevoke = async (keyId: string) => {
    if (!confirm("Revoke this key? Any apps using it will stop working immediately.")) return
    setRevoking(keyId)
    try {
      await api.delete(`/developer/keys/${keyId}`)
      await fetchKeys()
    } catch {
      alert("Failed to revoke key")
    } finally {
      setRevoking(null)
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "keys",  label: "API Keys", icon: <Key className="w-4 h-4" /> },
    { id: "usage", label: "Usage",    icon: <BarChart2 className="w-4 h-4" /> },
    { id: "docs",  label: "Docs",     icon: <Code2 className="w-4 h-4" /> },
  ]

  const DocSection = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setDocSection(docSection === id ? null : id)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-white font-medium text-sm">{title}</span>
        {docSection === id
          ? <ChevronUp className="w-4 h-4 text-white/40" />
          : <ChevronDown className="w-4 h-4 text-white/40" />
        }
      </button>
      {docSection === id && (
        <div className="px-5 pb-5 border-t border-white/5 pt-4 flex flex-col gap-4">
          {children}
        </div>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse">
        <div className="h-8 w-48 bg-white/10 rounded mb-2" />
        <div className="h-4 w-64 bg-white/5 rounded mb-8" />
        <div className="h-64 bg-white/5 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Terminal className="w-6 h-6 text-violet-400" />
          Developer
        </h1>
        <p className="text-white/50 mt-1">Build with Talkata — $4 per 1M characters via API</p>
      </div>

      {/* Stat strip */}
      {usage && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Credits",        value: usage.credits_remaining.toLocaleString(), icon: <Zap className="w-3.5 h-3.5 text-yellow-400" /> },
            { label: "API Requests",   value: usage.total_requests.toLocaleString(),    icon: <Code2 className="w-3.5 h-3.5 text-violet-400" /> },
            { label: "Characters (30d)", value: usage.total_characters.toLocaleString(), icon: <BarChart2 className="w-3.5 h-3.5 text-blue-400" /> },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5 mb-1">{s.icon}<span className="text-white/40 text-xs">{s.label}</span></div>
              <p className="text-white font-bold text-lg">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? "bg-violet-600 text-white" : "text-white/50 hover:text-white"
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Keys tab ─────────────────────────────────────────────────────────── */}
      {tab === "keys" && (
        <div className="flex flex-col gap-4">
          {/* New key revealed */}
          {newKeyValue && (
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5">
              <p className="text-green-400 text-sm font-medium mb-2">
                ✅ Key created — copy it now. You won't see it again.
              </p>
              <div className="flex items-center gap-3 bg-black/30 rounded-lg px-4 py-3">
                <code className="flex-1 text-green-300 text-xs font-mono break-all">
                  {showNewKey ? newKeyValue : newKeyValue.slice(0, 16) + "•".repeat(20)}
                </code>
                <button onClick={() => setShowNewKey(!showNewKey)} className="text-white/30 hover:text-white transition-colors">
                  {showNewKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <CopyButton text={newKeyValue} />
              </div>
              <button onClick={() => setNewKeyValue(null)} className="text-white/30 text-xs mt-3 hover:text-white transition-colors">
                Dismiss
              </button>
            </div>
          )}

          {/* Create key */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-white/60 text-sm mb-3">Create a new API key</p>
            <div className="flex gap-2">
              <input
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g. Production)"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm outline-none placeholder:text-white/20 focus:border-violet-500/50"
              />
              <button
                onClick={handleCreateKey}
                disabled={isCreating}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                {isCreating ? "Creating..." : "Generate"}
              </button>
            </div>
            <p className="text-white/25 text-xs mt-2">Free accounts: 1 active key. Keys are hashed — copy when created.</p>
          </div>

          {/* Key list */}
          {keys.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-sm">No API keys yet — create one above.</div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              {keys.map((k, i) => (
                <div key={k.id} className={`flex items-center gap-4 px-5 py-4 ${i < keys.length - 1 ? "border-b border-white/5" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-white text-sm font-medium">{k.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-md ${k.is_active ? "bg-green-500/10 text-green-400" : "bg-white/5 text-white/20"}`}>
                        {k.is_active ? "active" : "revoked"}
                      </span>
                    </div>
                    <code className="text-white/40 text-xs font-mono">{k.key_prefix}</code>
                    <div className="flex items-center gap-3 mt-1 text-white/25 text-xs">
                      <span>{k.total_requests.toLocaleString()} requests</span>
                      <span>{k.total_characters.toLocaleString()} chars</span>
                      {k.last_used_at && <span>Last used {new Date(k.last_used_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  {k.is_active && (
                    <button
                      onClick={() => handleRevoke(k.id)}
                      disabled={revoking === k.id}
                      className="text-white/20 hover:text-red-400 transition-colors"
                      title="Revoke key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Usage tab ────────────────────────────────────────────────────────── */}
      {tab === "usage" && usage && (
        <div className="flex flex-col gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-white/60 text-sm mb-4">Characters generated per day (last 7 days)</p>
            <UsageBar chart={usage.daily_chart} />
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <p className="text-white/60 text-sm mb-1">API Pricing</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-white text-3xl font-bold">$4</span>
              <span className="text-white/40 text-sm">per 1,000,000 characters</span>
            </div>
            <p className="text-white/30 text-xs mt-2">Billed from your credit balance. 1M chars = 800,000 credits.</p>
            <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-white/40 text-xs">Min charge per call</p><p className="text-white">80 credits</p></div>
              <div><p className="text-white/40 text-xs">Rate limit</p><p className="text-white">60 req / min</p></div>
              <div><p className="text-white/40 text-xs">Max text per call</p><p className="text-white">No hard limit</p></div>
              <div><p className="text-white/40 text-xs">Response format</p><p className="text-white">audio/wav</p></div>
            </div>
          </div>
        </div>
      )}

      {/* ── Docs tab ─────────────────────────────────────────────────────────── */}
      {tab === "docs" && (
        <div className="flex flex-col gap-3">

          <DocSection id="auth" title="Authentication">
            <p className="text-white/50 text-sm">Pass your API key as a Bearer token in the Authorization header.</p>
            <CodeBlock lang="http" code={`Authorization: Bearer sk-tal-your-key-here`} />
          </DocSection>

          <DocSection id="endpoint" title="POST /v1/audio/speech">
            <p className="text-white/50 text-sm">Generates audio and returns the wav file directly. Compatible with OpenAI TTS client shape.</p>
            <div className="bg-white/5 rounded-lg p-4 text-xs font-mono text-white/60 space-y-1">
              <p><span className="text-violet-400">input</span>     <span className="text-white/30">string  required</span>   — text to synthesize</p>
              <p><span className="text-violet-400">voice</span>     <span className="text-white/30">string  default: nova</span> — voice id</p>
              <p><span className="text-violet-400">speed</span>     <span className="text-white/30">float   default: 1.0</span>  — 0.5–2.0</p>
            </div>
            <p className="text-white/30 text-xs">Response headers include <code className="text-violet-400">X-Credits-Used</code> and <code className="text-violet-400">X-Credits-Remaining</code>.</p>
          </DocSection>

          <DocSection id="voices" title="Available Voices">
            <div className="grid grid-cols-2 gap-2">
              {["Standard", "Character"].map(type => (
                <div key={type}>
                  <p className="text-white/30 text-xs font-medium uppercase tracking-widest mb-2">{type}</p>
                  {VOICES.filter(v => v.type === type).map(v => (
                    <div key={v.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                      <span className="text-white/70 text-sm">{v.label}</span>
                      <code className="text-violet-400/70 text-xs font-mono">{v.id}</code>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </DocSection>

          <DocSection id="examples" title="Code Examples">
            <div className="flex gap-1 bg-white/5 rounded-lg p-1">
              {(["curl", "python", "node"] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setCodeTab(l)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${codeTab === l ? "bg-violet-600 text-white" : "text-white/40 hover:text-white"}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <CodeBlock lang={codeTab} code={CODE_EXAMPLES[codeTab]} />
          </DocSection>

          <DocSection id="errors" title="Error Codes">
            <div className="space-y-2 text-sm">
              {[
                ["401", "Invalid or revoked API key"],
                ["400", "Missing input or unknown voice"],
                ["402", "Insufficient credits"],
                ["429", "Rate limit exceeded (60/min)"],
                ["503", "ML worker offline"],
                ["500", "Generation failed"],
              ].map(([code, msg]) => (
                <div key={code} className="flex items-center gap-3">
                  <code className={`text-xs px-2 py-0.5 rounded font-mono ${
                    code === "401" || code === "402" ? "bg-red-500/10 text-red-400" :
                    code === "429" ? "bg-yellow-500/10 text-yellow-400" :
                    "bg-white/5 text-white/40"
                  }`}>{code}</code>
                  <span className="text-white/50">{msg}</span>
                </div>
              ))}
            </div>
          </DocSection>
        </div>
      )}
    </div>
  )
}