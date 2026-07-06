'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  MapPin,
  Bike,
  BarChart3,
  DollarSign,
  LogOut,
  Menu,
  ChevronRight,
  Megaphone,
  Phone,
  Clock,
  Droplet,
  Warehouse,
  Settings,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

// Regroupé par thème pour un usage quotidien plus simple (au lieu d'une
// liste plate de 14 entrées) : Opérations du jour → Catalogue → Réglages → Chiffres.
// "Paramètres" et "Avis clients" étaient absents du menu — ils existent, mais
// n'étaient joignables qu'en tapant l'URL directement. Ajoutés ici.
const NAV_GROUPS = [
  {
    title: 'Opérations du jour',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/pos', label: 'POS / Caisse', icon: ShoppingCart },
      { href: '/admin/livreurs', label: 'Livreurs', icon: Bike },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { href: '/admin/products', label: 'Produits', icon: Package },
      { href: '/admin/sauces', label: 'Sauces', icon: Droplet },
      { href: '/admin/promo', label: 'Promos', icon: Megaphone },
      { href: '/admin/inventory', label: 'Inventaire', icon: Warehouse },
    ],
  },
  {
    title: 'Réglages du commerce',
    items: [
      { href: '/admin/zones', label: 'Zones', icon: MapPin },
      { href: '/admin/hours', label: 'Horaires', icon: Clock },
      { href: '/admin/contacts', label: 'Contacts', icon: Phone },
      { href: '/admin/settings', label: 'Paramètres', icon: Settings },
      { href: '/admin/reviews', label: 'Avis clients', icon: Star },
    ],
  },
  {
    title: 'Chiffres',
    items: [
      { href: '/admin/statistics', label: 'Statistiques', icon: BarChart3 },
      { href: '/admin/stats', label: 'Stats Simple', icon: BarChart3 },
      { href: '/admin/finance', label: 'Finance', icon: DollarSign },
    ],
  },
]

// Liste à plat, conservée pour les endroits du code qui cherchent
// "l'item de nav actif" sans se soucier des groupes (ex: titre de l'en-tête).
const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items)

interface AdminUser {
  id: string
  name: string
  phone: string | null
  role: string
}

function SidebarContent({
  user,
  pathname,
  onNavigate,
  onLogout,
}: {
  user: AdminUser
  pathname: string
  onNavigate: (href: string) => void
  onLogout: () => void
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="flex-shrink-0 px-4 py-4 border-b border-bm-primary-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-bm-primary rounded-xl flex items-center justify-center shadow-md">
            <span className="text-stone-900 font-extrabold text-sm">BM</span>
          </div>
          <div>
            <h1 className="font-bold text-stone-900 text-sm leading-tight">Burger Minute</h1>
            <p className="text-xs text-stone-500">Admin & Cuisine</p>
          </div>
        </div>
      </div>

      {/* Nav Links — scroll natif iOS/Android */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 -webkit-overflow-scrolling-touch">
        <nav className="space-y-3 pb-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  const Icon = item.icon
                  return (
                    <button
                      key={item.href}
                      onClick={() => onNavigate(item.href)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] active:scale-[0.98] ${
                        isActive
                          ? 'bg-bm-primary text-stone-900 shadow-sm'
                          : 'text-stone-600 hover:bg-stone-100 active:bg-stone-100'
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {isActive && <ChevronRight className="h-3 w-3 ml-auto flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* User & Logout — toujours visible */}
      <div className="flex-shrink-0 px-3 py-3 border-t border-stone-200 bg-white">
        <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-bm-primary text-stone-900 text-xs font-bold">
              {user.name?.charAt(0)?.toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-900 truncate">{user.name}</p>
            <p className="text-xs text-stone-500">Administrateur</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 min-h-[44px] rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 active:bg-red-100 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const user = useMemo<AdminUser | null>(() => {
    if (typeof window === 'undefined') return null
    const userStr = localStorage.getItem('bm_user')
    if (!userStr) return null
    try {
      const parsed = JSON.parse(userStr)
      if (parsed.role !== 'ADMIN') return null
      return parsed
    } catch {
      return null
    }
  }, [pathname])

  const token = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('bm_token')
  }, [pathname])

  // Handle redirect
  const isAuthed = !!user && !!token
  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    if (!isLoginPage && !isAuthed) {
      window.location.href = '/login'
    }
    if (isLoginPage && isAuthed) {
      window.location.href = '/admin/dashboard'
    }
  }, [isLoginPage, isAuthed])

  // Prevent back navigation after logout
  useEffect(() => {
    const preventBack = () => {
      window.history.pushState(null, '', window.location.href)
    }
    
    // Push initial state
    preventBack()
    
    // Listen for back button
    window.addEventListener('popstate', preventBack)
    
    return () => {
      window.removeEventListener('popstate', preventBack)
    }
  }, [])

  const handleNavigate = useCallback((href: string) => {
    router.push(href)
    setSidebarOpen(false)
  }, [router])

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    localStorage.removeItem('bm_token')
    localStorage.removeItem('bm_user')
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax'
    
    // Prevent browser back button from showing cached page
    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', () => {
      window.history.pushState(null, '', window.location.href)
    })
    
    window.location.replace('/login')
  }, [])

  // Login page doesn't need the layout
  if (isLoginPage) {
    return <>{children}</>
  }

  if (!user) return null

  return (
    <div className="flex h-screen bg-bm-primary-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 flex-shrink-0 bg-white border-r border-stone-200 shadow-sm h-full">
        <SidebarContent
          user={user}
          pathname={pathname}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[280px] p-0 bg-white">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent
            user={user}
            pathname={pathname}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-stone-50 h-full overflow-hidden">
        {/* Top Bar (mobile) */}
        <header className="lg:hidden flex-shrink-0 sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-stone-200/50 shadow-sm">
          <div className="flex items-center justify-between px-4 h-14 safe-area-top">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-stone-100 active:bg-stone-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-6 w-6 text-stone-700" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-bm-primary rounded-lg flex items-center justify-center">
                <span className="text-stone-900 font-extrabold text-xs">BM</span>
              </div>
              <span className="font-bold text-stone-900 text-sm">
                {NAV_ITEMS.find((i) => pathname === i.href || pathname.startsWith(i.href + '/'))?.label || 'Admin'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-red-50 active:bg-red-100 text-red-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Déconnexion"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Top Bar (desktop) */}
        <header className="hidden lg:flex flex-shrink-0 items-center justify-between px-6 h-16 bg-white/80 backdrop-blur-xl border-b border-stone-200/50 shadow-sm">
          <div>
            <h2 className="text-xl font-black text-stone-900 tracking-tight">
              {NAV_ITEMS.find((i) => pathname === i.href || pathname.startsWith(i.href + '/'))?.label || 'Administration'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-bm-primary text-stone-900 text-xs font-bold">
                {user.name?.charAt(0)?.toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-stone-700">{user.name}</span>
          </div>
        </header>

        {/* Page Content — scroll natif iOS/Android */}
        <main className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </main>
      </div>
    </div>
  )
}
