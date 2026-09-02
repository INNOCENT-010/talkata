"use client"

import { CheckCircle2, LogIn, Sparkles } from "lucide-react"
import Link from "next/link"

export default function ConfirmationSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-5 py-12">
      <section className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-400/20 bg-[#12121d] p-8 text-center shadow-2xl shadow-emerald-950/20">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl motion-float" />
        <div className="relative"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-500/10"><CheckCircle2 className="h-8 w-8 text-emerald-300" /></span>
          <div className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[.16em] text-violet-300"><Sparkles className="h-3.5 w-3.5" /> You’re confirmed</div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Your email is verified.</h1>
          <p className="mt-3 text-sm leading-6 text-white/55">Welcome to Talkata. Your account is ready, including your 300,000 early-user credits. Sign in to enter your Voice studio.</p>
          <Link href="/login" className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"><LogIn className="h-4 w-4" /> Return to sign in</Link>
        </div>
      </section>
    </main>
  )
}
