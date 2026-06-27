'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  MapPin, 
  DollarSign, 
  BarChart3,
  Megaphone,
  FileText,
  LogOut,
  Clock,
  Star,
  Settings,
  Warehouse
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Commandes', icon: LayoutDashboard },
  { href: '/admin/pos', label: 'POS', icon: ShoppingCart },
  { href: '/admin/products', label: 'Produits', icon: Package },
  { href: '/admin/sauces', label: 'Sauces', icon: Package },
  { href: '/admin/inventory', label: 'Inventaire', icon: Warehouse },
  { href: '/admin/promo', label: 'Promos', icon: Megaphone },
  { href: '/admin/hours', label: 'Horaires', icon: Clock },
  { href: '/admin/livreurs', label: 'Livreurs', icon: Users },
  { href: '/admin/zones', label: 'Zones', icon: MapPin },
  { href: '/admin/reviews', label: 'Avis', icon: Star },
  { href: '/admin/statistics', label: 'Stats', icon: BarChart3 },
  { href: '/admin/reports', label: 'Rapports', icon: FileText },
  { href: '/admin/finance', label: 'Finance', icon: DollarSign },
  { href: '/admin/settings', label: 'Paramètres', icon: Settings },
]

export default function AdminNav() {
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      // Call logout API to clear auth cookie
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('bm_token')
        localStorage.removeItem('bm_user')
        window.location.href = '/menu'
      }
    }
  }

  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-40 safe-area-top">
      <div className="w-full px-2 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <Link href="/admin/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-bm-primary flex items-center justify-center">
              <span className="text-lg sm:text-xl font-black text-stone-900">B</span>
            </div>
            <span className="text-sm sm:text-lg font-black text-stone-900 hidden xs:block">
              BURGER MINUTE
            </span>
          </Link>

          <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-none flex-1 justify-end">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-bm-primary text-stone-900'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              )
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors ml-1 shrink-0"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
