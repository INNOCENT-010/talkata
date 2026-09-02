"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import {
  LayoutDashboard, Mic2, History, CreditCard,
  Terminal, ChevronDown, LogOut, ShieldCheck, Menu, X, Wand2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

const GENERATE_CHILDREN = [
  { href: "/generate",      label: "Text to Speech", icon: Mic2  },
  { href: "/voice-cloning", label: "Voice Cloning",  icon: Wand2, comingSoon: true },
]

const TOP_LINKS = [
  { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { href: "/history",    label: "History",    icon: History },
  { href: "/credits",    label: "Credits",    icon: CreditCard },
  { href: "/developer",  label: "Developer",  icon: Terminal },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router   = useRouter()
  const { user, logout } = useAuthStore()
  const isGenerateActive  = GENERATE_CHILDREN.some(c => pathname === c.href)
  const [generateOpen, setGenerateOpen] = useState(true)

  const handleSignOut = () => {
    logout()
    router.push("/login")
  }

  const nav = (href: string) => {
    onNavigate?.()
    router.push(href)
  }

  return (
    <div className="flex flex-col h-full bg-[#0d0d16]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5 shrink-0">
        <button onClick={() => nav("/dashboard")} className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
            <Mic2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Talkata</span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
        <NavLink href="/dashboard" label="Dashboard" icon={LayoutDashboard} pathname={pathname} onClick={onNavigate} />

        {/* Generate group */}
        <div>
          <button
            onClick={() => setGenerateOpen(o => !o)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isGenerateActive ? "text-white bg-white/5" : "text-white/50 hover:text-white hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-3">
              <Mic2 className={`w-4 h-4 ${isGenerateActive ? "text-violet-400" : ""}`} />
              Generate
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform duration-200 ${generateOpen ? "rotate-180" : ""}`} />
          </button>

          {generateOpen && (
            <div className="mt-1 ml-4 pl-3 border-l border-white/10 flex flex-col gap-0.5">
              {GENERATE_CHILDREN.map(({ href, label, icon: Icon, comingSoon }) => {
                const active = pathname === href
                return (
                  <button
                    key={href}
                    onClick={() => nav(href)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left ${
                      active ? "bg-violet-600/20 text-white font-medium" : "text-white/45 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? "text-violet-400" : ""}`} />
                    {label}
                    {comingSoon && <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-violet-300/70">Soon</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {TOP_LINKS.slice(1).map(({ href, label, icon }) => (
          <NavLink key={href} href={href} label={label} icon={icon} pathname={pathname} onClick={onNavigate} />
        ))}

        {user?.is_admin && (
          <NavLink href="/admin" label="Admin" icon={ShieldCheck} pathname={pathname} onClick={onNavigate} />
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/5 shrink-0">
        <div className="flex items-center gap-2 px-3 py-2 bg-violet-600/10 border border-violet-500/20 rounded-xl mb-3">
          <div className="w-2 h-2 bg-violet-400 rounded-full" />
          <div className="min-w-0 flex-1">
            <p className="text-violet-400 text-xs">Credits</p>
            <p className="text-white font-bold text-sm leading-none">{(user?.credits ?? 0).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-medium truncate">{user?.full_name ?? "User"}</p>
            <p className="text-white/30 text-xs truncate">{user?.email ?? ""}</p>
          </div>
          <button onClick={handleSignOut} className="text-white/20 hover:text-red-400 transition-colors ml-2" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function NavLink({ href, label, icon: Icon, pathname, onClick }: {
  href: string; label: string; icon: LucideIcon; pathname: string; onClick?: () => void
}) {
  const router = useRouter()
  const active = pathname === href
  return (
    <button
      onClick={() => { onClick?.(); router.push(href) }}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full text-left ${
        active ? "bg-violet-600/20 text-white" : "text-white/50 hover:text-white hover:bg-white/5"
      }`}
    >
      <Icon className={`w-4 h-4 ${active ? "text-violet-400" : ""}`} />
      {label}
    </button>
  )
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-60 shrink-0 h-screen sticky top-0 flex-col border-r border-white/5">
        <SidebarContent />
      </aside>

      {/* ── Mobile top bar ───────────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-[#0d0d16] border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
            <Mic2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-white font-bold text-base tracking-tight">Talkata</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="text-white/60 hover:text-white transition-colors p-1"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── Mobile drawer ────────────────────────────────────────────────── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 shadow-2xl">
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setMobileOpen(false)}
                className="text-white/40 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </>
      )}
    </>
  )
}
