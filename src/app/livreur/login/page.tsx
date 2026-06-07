'use client'

// ========================================
// AWID / BURGER MINUTE - Livreur Login Redirect
// Redirects to unified /login page
// ========================================

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LivreurLoginPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/login')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-bm-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-bm-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-stone-500 text-sm">Redirection...</p>
      </div>
    </div>
  )
}
