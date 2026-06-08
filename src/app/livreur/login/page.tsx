'use client'

// ========================================
// AWID / BURGER MINUTE - Livreur Login Redirect
// Redirects to unified /login page
// ========================================

import { useEffect } from 'react'

export default function LivreurLoginPage() {
  useEffect(() => {
    // Si on arrive ici, c'est que le middleware a bloqué l'accès (pas de cookie)
    // On nettoie le localStorage pour casser la boucle infinie de redirection
    localStorage.removeItem('bm_token')
    localStorage.removeItem('bm_user')
    window.location.href = '/login'
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-bm-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-bm-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-stone-500 text-sm">Redirection...</p>
      </div>
    </div>
  )
}
