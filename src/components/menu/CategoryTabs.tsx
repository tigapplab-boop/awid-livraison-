import { useRef, useEffect } from 'react'
import type { Locale } from '@/lib/locale'

interface CategoryTabsProps {
  categories: Array<{
    id: string
    name: string
    nameAr: string | null
    icon?: string
  }>
  activeCategory: string
  onSelect: (categoryId: string) => void
  locale: Locale
}

// Fallback icons if not provided by DB
const DEFAULT_ICONS: Record<string, string> = {
  'Burgers': '🍔',
  'Menus': '🍔',
  'Boissons': '🥤',
  'Frites': '🍟',
  'Desserts': '🍦',
  'Suppléments': '🧀',
  'Salades': '🥗',
  'Pizzas': '🍕',
  'Tacos': '🌮',
}

export function CategoryTabs({ categories, activeCategory, onSelect, locale }: CategoryTabsProps) {
  const isRTL = locale === 'ar'
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll auto vers la catégorie active
  useEffect(() => {
    if (!scrollRef.current) return
    const activeEl = scrollRef.current.querySelector(`[data-category="${activeCategory}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [activeCategory])

  return (
    <div 
      ref={scrollRef}
      className={`
        flex gap-2 overflow-x-auto px-4 py-3
        bg-white border-b border-stone-100
        sticky top-[60px] z-30
        categories-scroll
        ${isRTL ? 'flex-row-reverse' : ''}
      `}
    >
      {categories.map((category) => {
        const isActive = category.id === activeCategory
        // Guess icon based on name
        const icon = category.icon || DEFAULT_ICONS[category.name] || '🍽️'
        
        return (
          <button
            key={category.id}
            data-category={category.id}
            onClick={() => onSelect(category.id)}
            className={`
              flex items-center gap-1.5 px-4 py-2 rounded-full
              whitespace-nowrap text-[13px] font-semibold
              transition-all duration-200 active:scale-95
              ${isActive 
                ? 'bg-bm-primary text-stone-900 shadow-sm' 
                : 'bg-[#F8F5F0] text-[#6B6B6B] hover:bg-[#EAE4DB]'
              }
            `}
          >
            <span className="text-base">{icon}</span>
            <span>{isRTL ? category.nameAr || category.name : category.name}</span>
          </button>
        )
      })}
    </div>
  )
}
