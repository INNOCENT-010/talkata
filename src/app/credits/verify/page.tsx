"use client"

import { Suspense } from "react"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { creditsAPI } from "@/lib/api"
import { useAuthStore } from "@/store/authStore"
import { CheckCircle, XCircle } from "lucide-react"
import Button from "@/components/ui/Button"

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { fetchUser } = useAuthStore()
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading")
  const [credits, setCredits] = useState(0)

  useEffect(() => {
    const reference = searchParams.get("reference")
    if (!reference) { setStatus("failed"); return }

    creditsAPI.verify(reference)
      .then(async (res) => {
        setCredits(res.data.credits_added)
        await fetchUser()
        setStatus("success")
      })
      .catch(() => setStatus("failed"))
  }, [])

  if (status === "loading") return (
    <div className="max-w-md mx-auto mt-24 text-center">
      <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-white/60">Confirming your payment...</p>
    </div>
  )

  if (status === "success") return (
    <div className="max-w-md mx-auto mt-24 text-center">
      <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-10">
        <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-4" />
        <h1 className="text-white text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-white/50 mb-6">
          {(credits ).toLocaleString()} characters added to your account.
        </p>
        <Button onClick={() => router.push("/generate")} className="w-full">
          Start Generating
        </Button>
      </div>
    </div>
  )

  return (
    <div className="max-w-md mx-auto mt-24 text-center">
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-10">
        <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
        <h1 className="text-white text-2xl font-bold mb-2">Verification Failed</h1>
        <p className="text-white/50 mb-6">
          If you were charged, contact support.
        </p>
        <Button onClick={() => router.push("/credits")} variant="secondary" className="w-full">
          Back to Credits
        </Button>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="max-w-md mx-auto mt-24 text-center">
        <div className="w-10 h-10 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}