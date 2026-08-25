"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/authStore"
import { formatCredits } from "@/lib/utils"
import {
  Mic2,
  LayoutDashboard,
  History,
  CreditCard,
  LogOut,
  Zap
} from "lucide-react"

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/generate", label: "Generate", icon: Mic2 },
  { href: "/history", label: "History", icon: History },
  { href: "/credits", label: "Credits", icon: CreditCard },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  return (
    <aside style={{ width: 256, height: '100vh', backgroundColor: 'rgba(0,0,0,0.4)', borderRight: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', position: 'fixed', left: 0, top: 0, zIndex: 50 }}>
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
            <Mic2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg">Talkata</span>
        </div>
      </div>

      {/* Credits Badge */}
      <div className="mx-4 mt-4 p-3 bg-violet-600/20 border border-violet-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs text-violet-400 font-medium">Credits</span>
        </div>
        <p className="text-white font-bold text-lg">
          {((user?.credits ?? 0) * 100).toLocaleString()}
        </p>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-4 flex flex-col gap-1 mt-2">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
              pathname === href
                ? "bg-violet-600 text-white"
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-violet-600/30 rounded-full flex items-center justify-center">
            <span className="text-violet-400 text-sm font-bold">
              {user?.full_name?.[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
            <p className="text-white/40 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors w-full px-3 py-2 rounded-lg hover:bg-white/10"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}