"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import Sidebar from "@/components/dashboard/Sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { token, fetchUser, user } = useAuthStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!token) {
      router.push("/login")
      return
    }
    fetchUser().then(() => {
      setReady(true)
    }).catch(() => {
      router.push("/login")
    })
  }, [])

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid rgba(139,92,246,0.3)', borderTopColor: 'rgb(139,92,246)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading...</p>
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
    </div>
  )
}