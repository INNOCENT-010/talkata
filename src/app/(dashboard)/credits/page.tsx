"use client"

import axios from "axios"
import { useEffect, useState } from "react"
import { creditsAPI } from "@/lib/api"
import { useAuthStore } from "@/store/authStore"
import Button from "@/components/ui/Button"
import { Zap, Check, Mic2 } from "lucide-react"

interface Plan {
  id: string
  label: string
  amount_usd: number
  credits: number
}

type CryptoChain = "bep20" | "trc20"

interface CryptoInvoice {
  id: string
  plan_id: string
  credits: number
  chain: CryptoChain
  receiving_address: string
  expected_amount_usdt: string
  expires_at: string
  status: "pending" | "paid" | "expired" | "failed"
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback
  const detail = error.response?.data?.detail
  return typeof detail === "string" ? detail : fallback
}

const PLAN_META: Record<string, { chars: string; hours: string }> = {
  starter: { chars: "1,000,000", hours: "~13" },
  pro:     { chars: "3,000,000", hours: "~40" },
  studio:  { chars: "8,000,000", hours: "~106" },
}

export default function CreditsPage() {
  const { user } = useAuthStore()
  const [plans, setPlans] = useState<Plan[]>([])
  const [cryptoPlanId, setCryptoPlanId] = useState("starter")
  const [cryptoChain, setCryptoChain] = useState<CryptoChain>("bep20")
  const [cryptoInvoice, setCryptoInvoice] = useState<CryptoInvoice | null>(null)
  const [cryptoLoading, setCryptoLoading] = useState(false)
  const [transactionHash, setTransactionHash] = useState("")
  const [cryptoError, setCryptoError] = useState<string | null>(null)

  useEffect(() => {
    creditsAPI.plans().then((res) => setPlans(res.data.plans))
  }, [])

  const createCryptoInvoice = async () => {
    setCryptoLoading(true)
    setCryptoError(null)
    try {
      const res = await creditsAPI.createCryptoInvoice(cryptoPlanId, cryptoChain)
      setCryptoInvoice(res.data)
      setTransactionHash("")
    } catch (error: unknown) {
      setCryptoError(getErrorMessage(error, "Could not create crypto invoice. Please try again."))
    } finally {
      setCryptoLoading(false)
    }
  }

  const verifyCryptoPayment = async () => {
    if (!cryptoInvoice || !transactionHash.trim()) return
    setCryptoLoading(true)
    setCryptoError(null)
    try {
      const res = await creditsAPI.verifyCryptoInvoice(cryptoInvoice.id, transactionHash.trim())
      setCryptoInvoice((current) => current ? { ...current, status: res.data.status } : current)
    } catch (error: unknown) {
      setCryptoError(getErrorMessage(error, "Payment has not been confirmed yet."))
    } finally {
      setCryptoLoading(false)
    }
  }

  const copyAddress = async () => {
    if (cryptoInvoice) await navigator.clipboard.writeText(cryptoInvoice.receiving_address)
  }

  const features = [
    "No character limit per generation",
    "All 10 voices included",
    "High quality WAV downloads",
    "Credits valid for 3 months",
  ]

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Credits</h1>
        <p className="text-white/50 mt-1">Top up your credits to keep generating</p>
      </div>

      {/* Current Balance */}
      <div className="bg-violet-600/10 border border-violet-500/20 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-violet-400" />
          <span className="text-violet-400 text-sm">Current Balance</span>
        </div>
        <div className="flex items-end justify-between">
          <p className="text-white text-3xl font-bold">
            {((user?.credits ?? 0) ).toLocaleString()}
            <span className="text-white/40 text-base font-normal ml-2">characters</span>
          </p>
          <div className="text-right">
            <p className="text-white/40 text-xs">Valid for 3 months</p>
          </div>
        </div>
      </div>

      {/* Plans — stacked on mobile, grid on desktop */}
      <div className="flex flex-col gap-4 mb-6 sm:grid sm:grid-cols-3">
        {plans.map((plan, i) => {
          const meta = PLAN_META[plan.id] ?? PLAN_META[plan.label?.toLowerCase()] ?? { chars: "—", hours: "—" }
          const isPopular = i === 1
          return (
            <div
              key={plan.id}
              className={`relative border rounded-xl p-5 flex flex-col gap-3 ${
                isPopular
                  ? "bg-violet-600/20 border-violet-500/50"
                  : "bg-white/5 border-white/10"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                  BEST VALUE
                </div>
              )}

              {/* Plan header — horizontal on mobile */}
              <div className="flex items-center justify-between sm:block">
                <h3 className="text-white font-bold text-lg">{plan.label}</h3>
                <span className="text-white text-2xl font-bold sm:mt-1 sm:block">
                  ${plan.amount_usd}
                </span>
              </div>

              {/* Characters + hours */}
              <div className="flex flex-col gap-1 bg-white/5 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-violet-400 shrink-0" />
                  <span className="text-white font-semibold text-sm">{meta.chars} chars</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mic2 className="w-4 h-4 text-violet-400/60 shrink-0" />
                  <span className="text-white/50 text-xs">~{meta.hours} hours of audio</span>
                </div>
              </div>

              <Button
                onClick={() => {}}
                disabled
                variant={isPopular ? "primary" : "secondary"}
                className="w-full opacity-40"
                title="Card payments are awaiting approval"
              >
                Card payments coming soon
              </Button>
            </div>
          )
        })}
      </div>

      <div className="mb-6 rounded-xl border border-violet-500/30 bg-violet-600/10 p-5">
        <div className="mb-4">
          <p className="text-sm font-semibold text-white">Pay with USDT</p>
          <p className="mt-1 text-xs text-white/50">Choose BEP-20 or TRC-20. Send the plan amount, then paste its transaction hash to verify.</p>
        </div>

        {!cryptoInvoice || cryptoInvoice.status !== "pending" ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <select value={cryptoPlanId} onChange={(event) => setCryptoPlanId(event.target.value)} className="rounded-lg border border-white/10 bg-[#17172a] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500">
              {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.label} — ${plan.amount_usd}</option>)}
            </select>
            <select value={cryptoChain} onChange={(event) => setCryptoChain(event.target.value as CryptoChain)} className="rounded-lg border border-white/10 bg-[#17172a] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500">
              <option value="bep20">USDT · BEP-20 (BNB Smart Chain)</option>
              <option value="trc20">USDT · TRC-20 (TRON)</option>
            </select>
            <Button onClick={createCryptoInvoice} isLoading={cryptoLoading} disabled={plans.length === 0}>Create invoice</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-black/25 p-4">
              <p className="text-xs text-white/40">Send exactly</p>
              <p className="mt-1 text-2xl font-bold text-white">{cryptoInvoice.expected_amount_usdt} USDT</p>
              <p className="mt-3 text-xs text-white/40">Network</p>
              <p className="text-sm text-violet-300">{cryptoInvoice.chain === "bep20" ? "BEP-20 (BNB Smart Chain)" : "TRC-20 (TRON)"}</p>
              <p className="mt-3 text-xs text-white/40">Receiving address</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all text-xs text-white/80">{cryptoInvoice.receiving_address}</code>
                <Button onClick={copyAddress} variant="secondary" size="sm">Copy</Button>
              </div>
              <p className="mt-3 text-xs text-yellow-300/80">Expires {new Date(cryptoInvoice.expires_at).toLocaleString()}</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={transactionHash} onChange={(event) => setTransactionHash(event.target.value)} placeholder="Paste the transaction hash after sending" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#17172a] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-violet-500" />
              <Button onClick={verifyCryptoPayment} isLoading={cryptoLoading} disabled={!transactionHash.trim()}>Verify payment</Button>
            </div>
          </div>
        )}

        {cryptoInvoice?.status === "paid" && <p className="mt-4 text-sm text-green-400">Payment confirmed. Credits have been added to your balance.</p>}
        {cryptoError && <p className="mt-3 text-sm text-red-400">{cryptoError}</p>}
      </div>

      {/* Features */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">All plans include</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-violet-400 shrink-0" />
              <span className="text-white/70 text-sm">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
