"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import {
  LayoutDashboard, Mic2, History, CreditCard,
  Terminal, ChevronDown, Wand2, LogOut, ShieldCheck,
} from "lucide-react"

const GENERATE_CHILDREN = [
  { href: "/generate",      label: "Text to Speech", icon: Mic2  },
  { href: "/voice-cloning", label: "Voice Cloning",  icon: Wand2 },
]

const TOP_LINKS = [
  { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { href: "/history",    label: "History",    icon: History },
  { href: "/credits",    label: "Credits",    icon: CreditCard },
  { href: "/developer",  label: "Developer",  icon: Terminal },
]

export default function Sidebar() {
  const pathname   = usePathname()
  const router     = useRouter()
  const { user, logout } = useAuthStore()

  const isGenerateActive = GENERATE_CHILDREN.some(c => pathname === c.href)

  // Open by default on first load, or when a child is active
  const [generateOpen, setGenerateOpen] = useState(true)

  useEffect(() => {
    if (isGenerateActive) setGenerateOpen(true)
  }, [pathname])

  const handleSignOut = () => {
    logout()
    router.push("/login")
  }

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col bg-[#0d0d16] border-r border-white/5">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
            <Mic2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Talkata</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">

        {/* Dashboard — first */}
        <NavLink href="/dashboard" label="Dashboard" icon={LayoutDashboard} pathname={pathname} />

        {/* ── Generate group ─────────────────────────────────────────────── */}
        <div>
          <button
            onClick={() => setGenerateOpen(o => !o)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isGenerateActive
                ? "text-white bg-white/5"
                : "text-white/50 hover:text-white hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-3">
              <Mic2 className={`w-4 h-4 ${isGenerateActive ? "text-violet-400" : ""}`} />
              Generate
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform duration-200 ${generateOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Children */}
          {generateOpen && (
            <div className="mt-1 ml-4 pl-3 border-l border-white/10 flex flex-col gap-0.5">
              {GENERATE_CHILDREN.map(({ href, label, icon: Icon }) => {
                const active = pathname === href
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active
                        ? "bg-violet-600/20 text-white font-medium"
                        : "text-white/45 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? "text-violet-400" : ""}`} />
                    {label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Remaining top links */}
        {TOP_LINKS.slice(1).map(({ href, label, icon }) => (
          <NavLink key={href} href={href} label={label} icon={icon} pathname={pathname} />
        ))}

        {/* Admin link — only if user is admin */}
        {user?.is_admin && (
          <NavLink href="/admin" label="Admin" icon={ShieldCheck} pathname={pathname} />
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-white/5">
        {/* Credits pill */}
        <div className="flex items-center gap-2 px-3 py-2 bg-violet-600/10 border border-violet-500/20 rounded-xl mb-3">
          <div className="w-2 h-2 bg-violet-400 rounded-full" />
          <div className="min-w-0 flex-1">
            <p className="text-violet-400 text-xs">Credits</p>
            <p className="text-white font-bold text-sm leading-none">{(user?.credits ?? 0).toLocaleString()}</p>
          </div>
        </div>

        {/* User + sign out */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-medium truncate">{user?.full_name ?? "User"}</p>
            <p className="text-white/30 text-xs truncate">{user?.email ?? ""}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-white/20 hover:text-red-400 transition-colors ml-2"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

function NavLink({ href, label, icon: Icon, pathname }: {
  href: string; label: string; icon: any; pathname: string
}) {
  const active = pathname === href
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        active
          ? "bg-violet-600/20 text-white"
          : "text-white/50 hover:text-white hover:bg-white/5"
      }`}
    >
      <Icon className={`w-4 h-4 ${active ? "text-violet-400" : ""}`} />
      {label}
    </Link>
  )
}