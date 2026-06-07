'use client'

// ========================================
// AWID / BURGER MINUTE - Livreur Index
// Redirects to /livreur/login or /livreur/dashboard
// ========================================

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredToken } from '@/bm/lib/livreur-api'

export default function LivreurIndexPage() {
  const router = useRouter()

  useEffect(() => {
    const token = getStoredToken()
    if (token) {
      router.replace('/livreur/dashboard')
    } else {
      router.replace('/login')
    }
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
