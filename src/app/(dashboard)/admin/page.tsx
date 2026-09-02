"use client"

import { useEffect, useState } from "react"
import AdminGuard from "@/components/dashboard/AdminGuard"
import { AlertCircle, ArrowRight, CheckCircle2, CircleDollarSign, Clock3, CreditCard, Mic2, ShieldCheck, Users, Wallet } from "lucide-react"
import Link from "next/link"
import axios from "axios"

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
interface Stats { total_users: number; total_jobs: number; completed_jobs: number; failed_jobs: number; total_credits_used: number; jobs_today: number; total_revenue_usd: number; today_revenue_usd: number; total_transactions: number }
interface CryptoData { available: boolean; summary: { pending?: number; paid?: number; expired?: number; last_7_days?: number }; daily: { date: string; created: number; paid: number }[]; invoices: { id: string; user_email: string; chain: string; expected_amount_usdt: string; status: string; created_at: string }[] }

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [crypto, setCrypto] = useState<CryptoData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    const config = { headers: { Authorization: `Bearer ${token}` } }
    Promise.all([axios.get(`${API}/admin/stats`, config), axios.get(`${API}/admin/crypto-checks`, config)])
      .then(([statsResponse, cryptoResponse]) => { setStats(statsResponse.data); setCrypto(cryptoResponse.data) })
      .finally(() => setIsLoading(false))
  }, [])

  const cards = stats ? [
    { label: "Members", value: stats.total_users, icon: Users, tone: "text-blue-300 bg-blue-500/10" },
    { label: "Generations", value: stats.total_jobs, icon: Mic2, tone: "text-violet-300 bg-violet-500/10" },
    { label: "Completion", value: `${stats.total_jobs ? Math.round((stats.completed_jobs / stats.total_jobs) * 100) : 0}%`, icon: CheckCircle2, tone: "text-emerald-300 bg-emerald-500/10" },
    { label: "Revenue", value: `$${stats.total_revenue_usd.toFixed(2)}`, icon: CircleDollarSign, tone: "text-amber-300 bg-amber-500/10" },
  ] : []

  return <AdminGuard><div className="mx-auto max-w-7xl space-y-5 pb-10">
    <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[.16em] text-violet-300"><ShieldCheck className="h-3.5 w-3.5" /> Admin workspace</span><h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Platform pulse</h1><p className="mt-1 text-sm text-white/45">Generation health, revenue, and crypto operations at a glance.</p></div><span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live data</span></header>
    {isLoading ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/[.04]" />)}</div> : <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map(({ label, value, icon: Icon, tone }) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><div className="flex items-center justify-between"><span className="text-xs text-white/45">{label}</span><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}><Icon className="h-4 w-4" /></span></div><p className="mt-4 text-2xl font-semibold text-white">{value}</p></div>)}</section>
      <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 md:p-6"><div className="flex items-start justify-between"><div><h2 className="font-semibold text-white">Crypto payment flow</h2><p className="mt-1 text-xs text-white/40">Created and settled invoices over the last seven days.</p></div><Wallet className="h-5 w-5 text-violet-300" /></div>{crypto?.available ? <CryptoChart data={crypto.daily} /> : <div className="mt-8 rounded-xl border border-dashed border-white/10 p-5 text-sm text-white/45">Crypto metrics will appear once the crypto invoice table is available.</div>}</div>
        <div className="rounded-2xl border border-white/10 bg-[#11111a] p-5 md:p-6"><h2 className="font-semibold text-white">Payment health</h2><p className="mt-1 text-xs text-white/40">Invoices requiring attention remain visible here.</p><div className="mt-5 grid grid-cols-2 gap-3"><SmallMetric label="Pending" value={crypto?.summary.pending ?? 0} tone="amber" /><SmallMetric label="Paid" value={crypto?.summary.paid ?? 0} tone="emerald" /><SmallMetric label="Expired" value={crypto?.summary.expired ?? 0} tone="rose" /><SmallMetric label="Last 7 days" value={crypto?.summary.last_7_days ?? 0} tone="violet" /></div><p className="mt-5 flex gap-2 text-xs leading-5 text-white/40"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" /> A pending invoice only credits after its customer submits a valid, confirmed transaction hash.</p></div>
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.035]"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><h2 className="font-semibold text-white">Crypto check queue</h2><p className="mt-1 text-xs text-white/40">Latest invoice activity — no private wallet data shown.</p></div><Clock3 className="h-4 w-4 text-white/30" /></div>{crypto?.invoices.length ? <div className="divide-y divide-white/5">{crypto.invoices.map(invoice => <div key={invoice.id} className="flex items-center gap-3 px-5 py-3.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-[10px] font-bold uppercase text-violet-300">{invoice.chain === "bep20" ? "BNB" : "TRX"}</span><div className="min-w-0 flex-1"><p className="truncate text-sm text-white/80">{invoice.user_email}</p><p className="mt-0.5 text-xs text-white/35">{invoice.expected_amount_usdt} USDT · {new Date(invoice.created_at).toLocaleDateString()}</p></div><Status status={invoice.status} /></div>)}</div> : <div className="p-8 text-center text-sm text-white/40">No crypto invoices yet.</div>}</div><QuickLinks /></section>
    </>}
  </div></AdminGuard>
}

function CryptoChart({ data }: { data: CryptoData["daily"] }) { const peak = Math.max(1, ...data.map(day => Math.max(day.created, day.paid))); return <div className="mt-7 flex h-40 items-end gap-2">{data.map(day => <div key={day.date} className="flex h-full flex-1 flex-col justify-end gap-1"><div className="flex h-28 items-end gap-1"><span title={`${day.created} created`} className="w-1/2 rounded-t bg-violet-500/50 transition-all" style={{ height: `${(day.created / peak) * 100}%`, minHeight: day.created ? "5px" : "0" }} /><span title={`${day.paid} paid`} className="w-1/2 rounded-t bg-emerald-400/70 transition-all" style={{ height: `${(day.paid / peak) * 100}%`, minHeight: day.paid ? "5px" : "0" }} /></div><span className="text-center text-[10px] text-white/30">{new Date(`${day.date}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "narrow" })}</span></div>)}</div> }
function SmallMetric({ label, value, tone }: { label: string; value: number; tone: "amber" | "emerald" | "rose" | "violet" }) { const colors = { amber: "text-amber-300", emerald: "text-emerald-300", rose: "text-rose-300", violet: "text-violet-300" }; return <div className="rounded-xl bg-white/[.035] p-3"><p className="text-xs text-white/40">{label}</p><p className={`mt-1 text-xl font-semibold ${colors[tone]}`}>{value}</p></div> }
function Status({ status }: { status: string }) { const styles: Record<string, string> = { paid: "bg-emerald-500/10 text-emerald-300", pending: "bg-amber-500/10 text-amber-300", expired: "bg-white/5 text-white/40" }; return <span className={`rounded-full px-2 py-1 text-[10px] font-medium capitalize ${styles[status] || styles.expired}`}>{status}</span> }
function QuickLinks() { const links = [{ href: "/admin/users", label: "Manage users", icon: Users }, { href: "/admin/generations", label: "Review generations", icon: Mic2 }, { href: "/admin/voices", label: "Manage voices", icon: CreditCard }]; return <div className="rounded-2xl border border-white/10 bg-[#11111a] p-5"><h2 className="font-semibold text-white">Manage</h2><div className="mt-4 space-y-2">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[.025] p-3 text-sm text-white/65 transition hover:bg-white/[.06] hover:text-white"><Icon className="h-4 w-4 text-violet-300" /><span className="flex-1">{label}</span><ArrowRight className="h-3.5 w-3.5 text-white/30" /></Link>)}</div></div> }
