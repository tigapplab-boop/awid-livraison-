'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function UnifiedLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false)

  // Only run this once on mount, don't auto redirect if we just got kicked out
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('kicked') === '1') {
      // Clear storage if we were kicked
      localStorage.removeItem('bm_token')
      localStorage.removeItem('bm_user')
      // remove cookie manually just in case
      document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      return
    }

    const token = localStorage.getItem('bm_token')
    const userStr = localStorage.getItem('bm_user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        if (user.role === 'ADMIN') {
          window.location.href = '/admin/dashboard'
        } else if (user.role === 'LIVREUR') {
          window.location.href = '/livreur/dashboard'
        }
      } catch {
        localStorage.removeItem('bm_token')
        localStorage.removeItem('bm_user')
      }
    }
  }, [])

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

    if (needsPasswordChange && newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères')
      return
    }

    setLoading(true)
    try {
      const payload: any = { username: username.trim(), password }
      if (needsPasswordChange && newPassword) {
        payload.newPassword = newPassword
      }

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.mustChangePassword && !needsPasswordChange) {
          setNeedsPasswordChange(true)
          setError(null)
        } else {
          setError(data.error || 'Identifiants invalides')
        }
        setLoading(false)
        return
      }

      localStorage.setItem('bm_token', data.token)
      localStorage.setItem('bm_user', JSON.stringify(data.user))

      if (data.user.role === 'ADMIN') {
        window.location.href = '/admin/dashboard'
      } else if (data.user.role === 'LIVREUR') {
        window.location.href = '/livreur/dashboard'
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
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-[32px] bg-bm-primary shadow-2xl shadow-bm-primary/30 mb-6 relative overflow-hidden group">
            <span className="text-4xl relative z-10 transition-transform group-hover:scale-110">🍔</span>
            <div className="absolute inset-0 bg-white/20 blur-xl rounded-full scale-150 -top-1/2 translate-y-1/2"></div>
          </div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">Burger Minute</h1>
          <p className="text-stone-500 mt-2 font-medium">Espace Personnel</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[32px] shadow-xl shadow-stone-200/50 border border-stone-100/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {needsPasswordChange && !error && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-blue-700 text-sm font-medium">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>Veuillez configurer votre nouveau mot de passe sécurisé.</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-sm font-bold text-stone-700 mb-2">
                  Identifiant
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="Votre identifiant"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-bm w-full h-14 bg-stone-50 border-2 border-stone-100 rounded-2xl px-4 font-medium transition-all focus:border-bm-primary focus:bg-white focus:ring-4 focus:ring-bm-primary/10"
                  autoComplete="username"
                  disabled={loading || needsPasswordChange}
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-bold text-stone-700 mb-2">
                  {needsPasswordChange ? 'Mot de passe actuel' : 'Mot de passe'}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-bm w-full h-14 bg-stone-50 border-2 border-stone-100 rounded-2xl pl-4 pr-12 font-medium transition-all focus:border-bm-primary focus:bg-white focus:ring-4 focus:ring-bm-primary/10"
                    autoComplete="current-password"
                    disabled={loading || needsPasswordChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {needsPasswordChange && (
                <div className="animate-in slide-in-from-top-2">
                  <label htmlFor="newPassword" className="block text-sm font-bold text-bm-primary-800 mb-2">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 6 caractères"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input-bm w-full h-14 bg-bm-primary/5 border-2 border-bm-primary/30 rounded-2xl pl-4 pr-12 font-medium transition-all focus:border-bm-primary focus:bg-white focus:ring-4 focus:ring-bm-primary/20"
                      autoComplete="new-password"
                      disabled={loading}
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`flex items-center justify-center h-14 w-full rounded-2xl font-bold text-lg transition-all shadow-xl ${
                loading
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
                  : 'bg-stone-900 text-white hover:bg-stone-800 active:scale-[0.98] shadow-stone-900/20 hover:shadow-stone-900/30'
              }`}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-400 border-t-stone-600" />
                  Connexion...
                </span>
              ) : (
                needsPasswordChange ? 'Mettre à jour & Se connecter' : 'Se connecter'
              )}
            </button>
          </form>
        </div>
        
        <p className="text-center text-xs font-medium text-stone-400 mt-8">
          © {new Date().getFullYear()} Burger Minute. Tous droits réservés.
        </p>
      </div>
    </div>
  )
}
