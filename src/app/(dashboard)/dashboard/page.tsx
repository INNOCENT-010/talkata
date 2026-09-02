"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuthStore } from "@/store/authStore"
import { generateAPI } from "@/lib/api"
import { formatCredits, formatDate } from "@/lib/utils"
import { ArrowRight, AudioLines, History, Mic2, Pause, Play, Plus, Sparkles, Zap } from "lucide-react"
import { useAudioStore } from "@/store/audioStore"
import Link from "next/link"

interface Job {
  id: string
  text: string
  status: string
  created_at: string
  audio_url?: string
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [recentJobs, setRecentJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { playingId, toggle } = useAudioStore()

  useEffect(() => {
    generateAPI.history().then((res) => setRecentJobs((res.data.jobs || []).slice(0, 5))).finally(() => setIsLoading(false))
  }, [])

  const todayJobs = useMemo(() => recentJobs.filter((job) => new Date(job.created_at).toDateString() === new Date().toDateString()).length, [recentJobs])
  const firstName = user?.full_name?.split(" ")[0] || "Creative"

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      <section className="relative overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-700/35 via-[#191729] to-[#11111b] p-6 md:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-fuchsia-400/15 blur-3xl motion-float" />
        <div className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl motion-float-delayed" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-violet-100"><Sparkles className="h-3.5 w-3.5" /> Voice studio</div>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Good to see you, {firstName}.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">Turn your next idea into a voice that feels ready to publish.</p>
          </div>
          <Link href="/generate" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-violet-800 transition hover:bg-violet-50"><Plus className="h-4 w-4" /> New generation</Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Available credits" value={formatCredits(user?.credits ?? 0)} icon={Zap} tone="violet" />
        <Metric label="Made today" value={todayJobs} icon={Mic2} tone="blue" />
        <Metric label="Recent projects" value={recentJobs.length} icon={AudioLines} tone="fuchsia" />
      </section>

      <section className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,.8fr)]">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold text-white">Recent generations</h2><p className="mt-1 text-xs text-white/40">Your latest voice work, all in one place.</p></div><Link href="/history" className="inline-flex items-center gap-1 text-sm font-medium text-violet-300 transition hover:text-violet-200">All activity <ArrowRight className="h-3.5 w-3.5" /></Link></div>
          {isLoading ? <LoadingRows /> : recentJobs.length === 0 ? <EmptyActivity /> : <div className="space-y-1">{recentJobs.map((job, index) => <JobRow key={job.id} job={job} index={index} playing={playingId === job.id} onPlay={() => job.audio_url && toggle(job.id, job.audio_url)} />)}</div>}
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#11111a] p-5 md:p-6">
          <span className="text-xs font-medium uppercase tracking-[.16em] text-violet-300/75">Your workspace</span><h2 className="mt-2 text-xl font-semibold text-white">Keep the momentum.</h2><p className="mt-2 text-sm leading-6 text-white/45">Explore your history, add credit when you need it, or start with a fresh script.</p>
          <div className="mt-6 space-y-2"><ActionLink href="/generate" icon={Mic2} label="Generate speech" /><ActionLink href="/credits" icon={Zap} label="Add credits" /><ActionLink href="/voice-cloning" icon={Sparkles} label="Voice cloning — soon" muted /></div>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: typeof Zap; tone: "violet" | "blue" | "fuchsia" }) {
  const colors = { violet: "bg-violet-500/10 text-violet-300", blue: "bg-blue-500/10 text-blue-300", fuchsia: "bg-fuchsia-500/10 text-fuchsia-300" }
  return <div className="motion-rise-in rounded-2xl border border-white/10 bg-white/[.035] p-4"><div className="flex items-center justify-between"><span className="text-xs text-white/45">{label}</span><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${colors[tone]}`}><Icon className="h-4 w-4" /></span></div><p className="mt-4 text-2xl font-semibold tracking-tight text-white">{value}</p></div>
}

function JobRow({ job, index, playing, onPlay }: { job: Job; index: number; playing: boolean; onPlay: () => void }) {
  const completed = job.status === "complete"
  return <div className="motion-rise-in flex w-full min-w-0 max-w-full items-center gap-3 overflow-hidden rounded-xl px-2 py-3 transition hover:bg-white/[.035]" style={{ animationDelay: `${index * 60}ms` }}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300"><AudioLines className="h-4 w-4" /></span><div className="min-w-0 flex-1 overflow-hidden"><p className="truncate text-sm text-white/85">{job.text}</p><p className="mt-0.5 text-xs text-white/35">{formatDate(job.created_at)}</p></div><span className={`hidden shrink-0 rounded-full px-2 py-1 text-[11px] sm:inline ${completed ? "bg-emerald-500/10 text-emerald-300" : job.status === "failed" ? "bg-red-500/10 text-red-300" : "bg-amber-500/10 text-amber-300"}`}>{job.status}</span>{job.audio_url && <button onClick={onPlay} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-violet-300 transition hover:bg-violet-500 hover:text-white" aria-label={playing ? "Pause audio" : "Play audio"}>{playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}</button>}</div>
}

function ActionLink({ href, icon: Icon, label, muted }: { href: string; icon: typeof Zap; label: string; muted?: boolean }) { return <Link href={href} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[.025] p-3 text-sm text-white/70 transition hover:border-violet-400/20 hover:bg-violet-500/[.07] hover:text-white"><Icon className={`h-4 w-4 ${muted ? "text-white/35" : "text-violet-300"}`} /><span className="flex-1">{label}</span><ArrowRight className="h-3.5 w-3.5 text-white/30" /></Link> }
function LoadingRows() { return <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-white/[.035]" />)}</div> }
function EmptyActivity() { return <div className="rounded-xl border border-dashed border-white/10 py-12 text-center"><History className="mx-auto h-6 w-6 text-white/25" /><p className="mt-3 text-sm text-white/45">Your first voice will appear here.</p><Link href="/generate" className="mt-4 inline-flex text-sm font-medium text-violet-300 hover:text-violet-200">Start generating <ArrowRight className="ml-1 h-4 w-4" /></Link></div> }
