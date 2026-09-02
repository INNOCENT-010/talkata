import { ArrowRight, AudioLines, BellRing, Sparkles, Wand2 } from "lucide-react"
import Link from "next/link"

export default function VoiceCloningPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center px-4 py-10">
      <div className="relative w-full overflow-hidden rounded-3xl border border-violet-400/20 bg-[#11111e] p-7 shadow-2xl shadow-violet-950/30 md:p-12">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl motion-float" />
        <div className="absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl motion-float-delayed" />
        <div className="relative grid items-center gap-10 md:grid-cols-[1.1fr_.9fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-200">
              <Sparkles className="h-3.5 w-3.5" />
              In the studio
            </div>
            <h1 className="max-w-xl text-3xl font-bold tracking-tight text-white md:text-5xl">Your voice, made unmistakable.</h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-white/55 md:text-base">
              Voice Cloning is being carefully tuned for natural delivery, clear consent, and better creative control. It will open here soon.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/generate" className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500">
                Create with text to speech <ArrowRight className="h-4 w-4" />
              </Link>
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/55"><BellRing className="h-4 w-4 text-violet-300" /> Updates coming here</span>
            </div>
          </div>
          <div className="relative mx-auto flex aspect-square w-full max-w-[300px] items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-violet-300/15 motion-spin-slow" />
            <div className="absolute inset-7 rounded-full border border-dashed border-fuchsia-300/25 motion-spin-reverse" />
            <div className="relative flex h-32 w-32 items-center justify-center rounded-[2rem] border border-violet-300/30 bg-violet-500/15 shadow-xl shadow-violet-950/50">
              <Wand2 className="h-12 w-12 text-violet-200" />
            </div>
            <div className="absolute right-0 top-8 flex items-center gap-2 rounded-xl border border-white/10 bg-[#171725]/90 px-3 py-2 text-xs text-white/70 backdrop-blur"><AudioLines className="h-4 w-4 text-fuchsia-300" /> Voiceprint</div>
            <div className="absolute bottom-8 left-0 rounded-xl border border-white/10 bg-[#171725]/90 px-3 py-2 text-xs text-white/70 backdrop-blur">Quality first</div>
          </div>
        </div>
      </div>
    </div>
  )
}
