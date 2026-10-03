"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import Sidebar from "@/components/dashboard/Sidebar"
import SupportChatWidget from "@/components/support/SupportChatWidget"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { token, fetchUser, user, initialize, checkTokenExpiry, isLoading } = useAuthStore()
  const [error, setError] = useState(false)

  useEffect(() => {
    initialize()
    if (!checkTokenExpiry()) {
      router.replace("/login")
      return
    }
    fetchUser(false).catch(() => setError(true))
  }, [token, initialize, checkTokenExpiry, fetchUser, router])

  if (!user || !token) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid rgba(139,92,246,0.3)', borderTopColor: 'rgb(139,92,246)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{error ? "We couldn’t load your account. Please try again." : "Opening your workspace…"}</p>
          {error && <button disabled={isLoading} className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-white disabled:opacity-50" onClick={() => { setError(false); fetchUser().catch(() => setError(true)) }}>Try again</button>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f', color: 'white', display: 'flex' }}>
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto pt-16 lg:pt-8">
        {children}
      </main>
      {!user?.is_admin && <SupportChatWidget />}
    </div>
  )
}