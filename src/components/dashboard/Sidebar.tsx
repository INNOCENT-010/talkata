"use client"

import { useState } from "react"
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
  Zap,
  Menu,
  X
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
  const [open, setOpen] = useState(false)

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
            <Mic2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg">Talkata</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="md:hidden text-white/50 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Credits Badge */}
      <div className="mx-4 mt-4 p-3 bg-violet-600/20 border border-violet-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs text-violet-400 font-medium">Credits</span>
        </div>
        <p className="text-white font-bold text-lg">
          {formatCredits(user?.credits ?? 0)}
        </p>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-4 flex flex-col gap-1 mt-2">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
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
    </>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center text-white shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "md:hidden fixed top-0 left-0 h-full w-64 bg-[#0a0a0f] border-r border-white/10 flex flex-col z-50 transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-64 h-screen bg-black/40 border-r border-white/10 flex-col fixed left-0 top-0 z-50"
      >
        <SidebarContent />
      </aside>
    </>
  )
}