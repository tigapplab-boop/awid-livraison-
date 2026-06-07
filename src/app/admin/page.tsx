'use client'

// ========================================
// AWID / BURGER MINUTE - Admin Index
// Redirects to /admin/login or /admin/dashboard
// ========================================

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminIndexPage() {
  const router = useRouter()

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('bm_token') : null
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('bm_user') : null

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        if (user.role === 'ADMIN') {
          router.replace('/admin/dashboard')
          return
        }
      } catch {
        // Invalid user data, redirect to login
      }
    }

    router.replace('/login')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-bm-primary-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-bm-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-stone-500 text-sm">Redirection...</p>
      </div>
    </div>
  )
}
