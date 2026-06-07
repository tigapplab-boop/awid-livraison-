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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/pos', label: 'POS / Caisse', icon: ShoppingCart },
  { href: '/admin/products', label: 'Produits', icon: Package },
  { href: '/admin/zones', label: 'Zones', icon: MapPin },
  { href: '/admin/livreurs', label: 'Livreurs', icon: Bike },
  { href: '/admin/stats', label: 'Statistiques', icon: BarChart3 },
  { href: '/admin/finance', label: 'Finance', icon: DollarSign },
]

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
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-bm-primary-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-bm-primary rounded-xl flex items-center justify-center shadow-md">
            <span className="text-stone-900 font-extrabold text-sm">BM</span>
          </div>
          <div>
            <h1 className="font-bold text-stone-900 text-base">Burger Minute</h1>
            <p className="text-xs text-stone-500">Admin & Cuisine</p>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <button
                key={item.href}
                onClick={() => onNavigate(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all min-h-[48px] ${
                  isActive
                    ? 'bg-bm-primary text-stone-900 shadow-md'
                    : 'text-stone-600 hover:bg-bm-primary-50 hover:text-bm-primary'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
              </button>
            )
          })}
        </nav>
      </ScrollArea>

      {/* User & Logout */}
      <div className="px-3 py-4 border-t border-stone-200">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <Avatar className="h-9 w-9 bg-bm-primary text-stone-900">
            <AvatarFallback className="bg-bm-primary text-stone-900 text-sm font-bold">
              {user.name?.charAt(0)?.toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-stone-900 truncate">{user.name}</p>
            <p className="text-xs text-stone-500 truncate">Administrateur</p>
          </div>
        </div>
        <Button
          onClick={onLogout}
          variant="outline"
          className="w-full min-h-[48px] text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>
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
      router.replace('/login')
    }
    if (isLoginPage && isAuthed) {
      router.replace('/admin/dashboard')
    }
  }, [isLoginPage, isAuthed, router])

  const handleNavigate = useCallback((href: string) => {
    router.push(href)
    setSidebarOpen(false)
  }, [router])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('bm_token')
    localStorage.removeItem('bm_user')
    router.replace('/login')
  }, [router])

  // Login page doesn't need the layout
  if (isLoginPage) {
    return <>{children}</>
  }

  if (!user) return null

  return (
    <div className="min-h-screen flex bg-bm-primary-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-stone-200 shadow-sm">
        <SidebarContent
          user={user}
          pathname={pathname}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-white">
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
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-stone-200 shadow-sm">
          <div className="flex items-center justify-between px-4 h-16">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-6 w-6 text-stone-700" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-bm-primary rounded-lg flex items-center justify-center">
                <span className="text-stone-900 font-extrabold text-xs">BM</span>
              </div>
              <span className="font-bold text-stone-900 text-sm">Admin</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
              aria-label="Déconnexion"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Top Bar (desktop) */}
        <header className="hidden lg:flex items-center justify-between px-6 h-16 bg-white border-b border-stone-200 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-stone-900">
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

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
