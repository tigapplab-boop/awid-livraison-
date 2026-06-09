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
  Settings,
  LogOut
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Commandes', icon: LayoutDashboard },
  { href: '/admin/pos', label: 'POS', icon: ShoppingCart },
  { href: '/admin/products', label: 'Produits', icon: Package },
  { href: '/admin/promo', label: 'Promos', icon: Megaphone },
  { href: '/admin/livreurs', label: 'Livreurs', icon: Users },
  { href: '/admin/zones', label: 'Zones', icon: MapPin },
  { href: '/admin/statistics', label: 'Stats', icon: BarChart3 },
  { href: '/admin/finance', label: 'Finance', icon: DollarSign },
]

export default function AdminNav() {
  const pathname = usePathname()

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bm_token')
      localStorage.removeItem('bm_user')
      window.location.href = '/admin/login'
    }
  }

  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-40 safe-area-top">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-bm-primary flex items-center justify-center">
              <span className="text-xl font-black text-stone-900">B</span>
            </div>
            <span className="text-lg font-black text-stone-900 hidden sm:block">
              BURGER MINUTE
            </span>
          </Link>

          <div className="flex items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-bm-primary text-stone-900'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              )
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors ml-2"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
