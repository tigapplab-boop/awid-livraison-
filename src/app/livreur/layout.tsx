'use client'

// ========================================
// AWID / BURGER MINUTE - Livreur Layout
// Auth guard + role-based access for livreur pages
// Only LIVREUR role can access livreur pages
// ========================================

import { useEffect, useRef, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getStoredToken, getStoredUser } from '@/bm/lib/livreur-api'

export default function LivreurLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const redirected = useRef(false)

  useEffect(() => {
    if (redirected.current) return
    const token = getStoredToken()
    const user = getStoredUser()
    const isLoginPage = pathname === '/livreur/login'

    if (!token || !user) {
      // Not authenticated → go to unified login
      redirected.current = true
      router.replace('/login')
      return
    }

    // Role check: only LIVREUR can access livreur pages
    if (user.role === 'ADMIN') {
      redirected.current = true
      router.replace('/admin/dashboard')
      return
    }

    if (user.role !== 'LIVREUR') {
      redirected.current = true
      router.replace('/login')
      return
    }

    if (isLoginPage) {
      redirected.current = true
      router.replace('/livreur/dashboard')
    }
  }, [pathname, router])

  const token = getStoredToken()
  const user = getStoredUser()
  const isLoginPage = pathname === '/livreur/login'
  const isAuthOk = token && user && user.role === 'LIVREUR' && !isLoginPage

  if (!isAuthOk) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bm-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-bm-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-stone-500 text-sm">Redirection...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
