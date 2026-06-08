'use client'

// ========================================
// AWID / BURGER MINUTE - Livreur Layout
// Auth guard + role-based access for livreur pages
// Only LIVREUR role can access livreur pages
// ========================================

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { getStoredToken, getStoredUser } from '@/bm/lib/livreur-api'

export default function LivreurLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [authChecked, setAuthChecked] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const token = getStoredToken()
    const user = getStoredUser()
    const isLoginPage = pathname === '/livreur/login'

    // Login page always redirects to /login via its own logic
    if (isLoginPage) {
      return
    }

    if (!token || !user) {
      // Not authenticated → hard redirect to login
      window.location.href = '/login'
      return
    }

    // Role check: only LIVREUR can access livreur pages
    if (user.role === 'ADMIN') {
      window.location.href = '/admin/dashboard'
      return
    }

    if (user.role !== 'LIVREUR') {
      window.location.href = '/login'
      return
    }

    // All checks passed
    setAuthorized(true)
    setAuthChecked(true)
  }, [pathname])

  // Login page renders its own content (redirect spinner)
  if (pathname === '/livreur/login') {
    return <>{children}</>
  }

  // Still checking auth or redirecting
  if (!authChecked || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bm-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-bm-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-stone-500 text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
