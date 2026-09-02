import Link from "next/link"
import { ArrowRight, Check, Mic2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"

type ServicePageProps = {
  eyebrow: string
  title: string
  intro: string
  steps: [string, string, string]
  sections: { title: string; body: string }[]
  icon: LucideIcon
}

export default function ServicePage({ eyebrow, title, intro, steps, sections, icon: Icon }: ServicePageProps) {
  return <main className="min-h-screen bg-[#090910] text-white">
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8"><Link href="/" className="flex items-center gap-2 font-semibold"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600"><Mic2 className="h-4 w-4" /></span>Talkata</Link><div className="flex items-center gap-5 text-sm"><Link href="/pricing" className="hidden text-white/55 hover:text-white sm:block">Pricing</Link><Link href="/login" className="text-white/70 hover:text-white">Sign in</Link><Link href="/register" className="rounded-lg bg-violet-600 px-4 py-2 font-semibold hover:bg-violet-500">Create account</Link></div></header>
    <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20"><div className="max-w-3xl"><div className="flex items-center gap-2 text-sm font-medium text-violet-300"><Icon className="h-4 w-4" />{eyebrow}</div><h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight md:text-6xl">{title}</h1><p className="mt-6 max-w-2xl text-base leading-7 text-white/60 md:text-lg">{intro}</p><Link href="/register" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold hover:bg-violet-500">Create an account <ArrowRight className="h-4 w-4" /></Link></div>
      <div className="mt-16 grid gap-3 md:grid-cols-3">{steps.map((step, index) => <div key={step} className="rounded-2xl border border-white/10 bg-white/[.035] p-5"><span className="text-xs font-semibold text-violet-300">0{index + 1}</span><p className="mt-4 text-sm leading-6 text-white/75">{step}</p></div>)}</div>
    </section>
    <section className="border-y border-white/10 bg-white/[.025]"><div className="mx-auto grid max-w-6xl gap-px px-5 py-5 md:grid-cols-3 md:px-8">{sections.map((section) => <article key={section.title} className="rounded-2xl p-5"><Check className="h-4 w-4 text-violet-300" /><h2 className="mt-4 text-lg font-semibold">{section.title}</h2><p className="mt-2 text-sm leading-6 text-white/55">{section.body}</p></article>)}</div></section>
    <section className="mx-auto max-w-6xl px-5 py-16 md:px-8"><h2 className="text-2xl font-bold tracking-tight">Start with the work in front of you.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/55">No setup call. No recording room. Put in the text, choose a voice, and review the result.</p><Link href="/register" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-violet-300 hover:text-violet-200">Open Talkata <ArrowRight className="h-4 w-4" /></Link></section>
  </main>
}
