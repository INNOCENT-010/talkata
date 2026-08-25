"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/authStore"
import { authAPI } from "@/lib/api"

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { token } = useAuthStore()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (!token) {
      router.push("/login")
      return
    }
    authAPI.me().then((res) => {
      if (res.data.is_admin) {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
        router.push("/dashboard")
      }
    }).catch(() => {
      router.push("/login")
    })
  }, [])

  if (isAdmin === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid rgba(139,92,246,0.3)', borderTopColor: 'rgb(139,92,246)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return <>{children}</>
}