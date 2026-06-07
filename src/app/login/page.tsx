'use client'

// ========================================
// AWID / BURGER MINUTE - Unified Login Page
// Identifiant + Password → Role-based redirection
// admin/admin → Admin/Cuisine dashboard
// livreur/livreur → Livreur dashboard
// ========================================

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function UnifiedLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // If already logged in, redirect based on role
    const token = localStorage.getItem('bm_token')
    const userStr = localStorage.getItem('bm_user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        if (user.role === 'ADMIN') {
          router.replace('/admin/dashboard')
        } else if (user.role === 'LIVREUR') {
          router.replace('/livreur/dashboard')
        }
      } catch {
        // Invalid data, clear and show login
        localStorage.removeItem('bm_token')
        localStorage.removeItem('bm_user')
      }
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username.trim()) {
      setError('Identifiant requis')
      return
    }

    if (!password) {
      setError('Mot de passe requis')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Identifiants invalides')
        setLoading(false)
        return
      }

      // Store auth data
      localStorage.setItem('bm_token', data.token)
      localStorage.setItem('bm_user', JSON.stringify(data.user))

      // Role-based redirection
      if (data.user.role === 'ADMIN') {
        router.push('/admin/dashboard')
      } else if (data.user.role === 'LIVREUR') {
        router.push('/livreur/dashboard')
      } else {
        setError('Rôle non reconnu')
        setLoading(false)
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bm-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-bm-primary shadow-lg mb-4">
            <span className="text-3xl">🍔</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Burger Minute</h1>
          <p className="text-stone-500 mt-1">Espace Livreur / Admin</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Username input */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-stone-700 mb-1.5">
                Identifiant
              </label>
              <input
                id="username"
                type="text"
                placeholder="Votre identifiant"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-bm"
                autoComplete="username"
                disabled={loading}
                autoFocus
              />
            </div>

            {/* Password input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-bm pr-11"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-bm-lg btn-bm-primary w-full text-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
                  Connexion...
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>


        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-3">
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 text-sm font-medium text-bm-primary hover:text-bm-primary-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Retour au menu
          </Link>
          <p className="text-xs text-stone-400">
            AWID &copy; {new Date().getFullYear()} — Burger Minute
          </p>
        </div>
      </div>
    </div>
  )
}
