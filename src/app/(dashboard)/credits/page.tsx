"use client"

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

const PLAN_META: Record<string, { chars: string; hours: string }> = {
  starter: { chars: "1,000,000", hours: "6.2" },
  pro:     { chars: "3,000,000", hours: "18.5" },
  studio:  { chars: "8,000,000", hours: "49" },
}

export default function CreditsPage() {
  const { user } = useAuthStore()
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState<string | null>(null)

  useEffect(() => {
    creditsAPI.plans().then((res) => setPlans(res.data.plans))
  }, [])

  const handlePurchase = async (planId: string) => {
    setIsLoading(planId)
    try {
      const res = await creditsAPI.initialize(planId)
      window.location.href = res.data.authorization_url
    } catch {
      alert("Payment initialization failed. Please try again.")
    } finally {
      setIsLoading(null)
    }
  }

  const features = [
    "No character limit per generation",
    "All 10 voices included",
    "High quality WAV downloads",
    "Credits valid for 3 months",
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Credits</h1>
        <p className="text-white/50 mt-1">Top up your credits to keep generating</p>
      </div>

      {/* Current Balance */}
      <div className="bg-violet-600/10 border border-violet-500/20 rounded-xl p-6 mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-violet-400" />
            <span className="text-violet-400 text-sm">Current Balance</span>
          </div>
          <p className="text-white text-3xl font-bold">
            {(user?.credits ?? 0).toLocaleString()}
            <span className="text-white/40 text-lg font-normal ml-2">credits</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-white/40 text-sm">1 credit = 100 characters</p>
          <p className="text-white/40 text-sm mt-1">Credits valid for 3 months</p>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {plans.map((plan, i) => {
          const meta = PLAN_META[plan.id] ?? PLAN_META[plan.label?.toLowerCase()] ?? { chars: "—", hours: "—" }
          return (
            <div
              key={plan.id}
              className={`relative border rounded-xl p-6 flex flex-col gap-4 ${
                i === 1
                  ? "bg-violet-600/20 border-violet-500/50"
                  : "bg-white/5 border-white/10"
              }`}
            >
              {i === 1 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  BEST VALUE
                </div>
              )}

              <div>
                <h3 className="text-white font-bold text-lg">{plan.label}</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-white text-3xl font-bold">${plan.amount_usd}</span>
                </div>
              </div>

              {/* Characters */}
              <div className="flex flex-col gap-1 bg-white/5 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-violet-400 shrink-0" />
                  <span className="text-white font-bold">{meta.chars} characters</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mic2 className="w-4 h-4 text-violet-400/60 shrink-0" />
                  <span className="text-white/50 text-sm">~{meta.hours} hours of audio</span>
                </div>
              </div>

              <Button
                onClick={() => handlePurchase(plan.id)}
                isLoading={isLoading === plan.id}
                variant={i === 1 ? "primary" : "secondary"}
                className="w-full"
              >
                Get Started
              </Button>
            </div>
          )
        })}
      </div>

      {/* Features */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">All plans include</h3>
        <div className="grid grid-cols-2 gap-3">
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