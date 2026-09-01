"use client"

import { Suspense } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle } from "lucide-react"
import Button from "@/components/ui/Button"

function VerifyContent() {
  const router = useRouter()
  return (
    <div className="max-w-md mx-auto mt-24 text-center">
      <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-10">
        <CheckCircle className="w-14 h-14 text-violet-400 mx-auto mb-4" />
        <h1 className="text-white text-2xl font-bold mb-2">Payment Processing</h1>
        <p className="text-white/50 mb-6">Your credits are added after Lemon Squeezy confirms the payment.</p>
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
