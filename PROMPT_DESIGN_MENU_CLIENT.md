# 🎨 PROMPT D'AMÉLIORATION DESIGN — PAGE MENU CLIENT
## AWID / BURGER MINUTE — UX/UI Premium & Bilingue

---

## 🎯 OBJECTIF

Transformer la page menu client en une expérience **ultra-rapide**, **visuellement addictive**, et **automatiquement bilingue** (Français + Arabe). Le client doit commander en moins de 15 secondes, sans friction, avec une interface qui donne envie d'acheter.

**Règles absolues :**
1. **Vitesse > Tout** — Pas de chargement, pas de latence, pas d'animation lourde
2. **Visuel > Texte** — Le produit doit parler plus que la description
3. **1 clic = 1 action** — Ajouter au panier en 1 tap, pas 2, pas 3
4. **Arabe auto-détecté** — Si le téléphone est en arabe, l'interface bascule automatiquement
5. **Pas de scroll infini** — Catégories visibles, produits accessibles en 2 taps max

---

## 🏗 ARCHITECTURE DE LA PAGE MENU

### Structure de la page (mobile-first, 375px base)

```
┌─────────────────────────────────────────┐
│  🔝 HEADER FIXE (60px)                  │
│  ┌─────────────────────────────────────┐│
│  │ 🍔 Logo Burger Minute  │  🔍  🛒  ││
│  │                          │  (1)    ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  📂 CATÉGORIES HORIZONTALES (50px)      │
│  ┌─────────────────────────────────────┐│
│  │ [🍔Burgers] [🥤Boissons] [🍟Frites]││
│  │    ↑ active                          ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  🖼 HERO BANNER (optionnel, 120px)      │
│  ┌─────────────────────────────────────┐│
│  │  🎉 PROMO DU JOUR                   ││
│  │  "Menu Double + Frites = 650 DA"     ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  📦 GRILLE PRODUITS (scroll vertical)   │
│  ┌─────────────────────────────────────┐│
│  │ ┌─────────────┐ ┌─────────────┐    ││
│  │ │ 🖼          │ │ 🖼          │    ││
│  │ │  [IMG]      │ │  [IMG]      │    ││
│  │ │             │ │             │    ││
│  │ │ Burger      │ │ Menu        │    ││
│  │ │ Classique   │ │ Enfant      │    ││
│  │ │ 450 DA      │ │ 350 DA      │    ││
│  │ │ [ + ]       │ │ [ + ]       │    ││
│  │ └─────────────┘ └─────────────┘    ││
│  │ ┌─────────────┐ ┌─────────────┐    ││
│  │ │ 🖼          │ │ 🖼          │    ││
│  │ │  Coca 33cl  │ │  Frites     │    ││
│  │ │  100 DA     │ │  150 DA     │    ││
│  │ │ [ + ]       │ │ [ + ]       │    ││
│  │ └─────────────┘ └─────────────┘    ││
│  └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│  🛒 PANIER FLOTTANT (70px, bottom)      │
│  ┌─────────────────────────────────────┐│
│  │  🛒 3 articles    950 DA    [Voir] ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

---

## 🎨 DESIGN SYSTEM — COULEURS & TYPOGRAPHIE

### Palette (chaleur, appétit, urgence)

| Token | Valeur | Usage |
|-------|--------|-------|
| `--color-primary` | `#FF6B00` | Boutons, accents, prix, badges promo |
| `--color-primary-dark` | `#E55A00` | Hover boutons, ombres |
| `--color-secondary` | `#1A1A1A` | Header, texte principal, fond cartes |
| `--color-background` | `#F8F5F0` | Fond page (chaud, crème) |
| `--color-card` | `#FFFFFF` | Fond cartes produits |
| `--color-success` | `#00C853` | Ajouté au panier, confirmation |
| `--color-danger` | `#FF1744` | Supprimer, annuler |
| `--color-text-primary` | `#1A1A1A` | Titres, prix |
| `--color-text-secondary` | `#6B6B6B` | Descriptions, infos |
| `--color-text-muted` | `#9E9E9E` | Labels, placeholders |

### Typographie

| Élément | Police | Taille | Poids | RTL (Arabe) |
|---------|--------|--------|-------|-------------|
| Logo | Poppins Bold | 20px | 700 | — |
| Catégorie active | Inter SemiBold | 14px | 600 | Cairo SemiBold |
| Nom produit | Inter SemiBold | 16px | 600 | Cairo SemiBold |
| Prix | Inter Bold | 18px | 700 | Cairo Bold |
| Description | Inter Regular | 12px | 400 | Cairo Regular |
| Bouton | Inter SemiBold | 14px | 600 | Cairo SemiBold |

**Fonts à charger :**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@700&family=Cairo:wght@400;600;700&display=swap');
```

---

## 🍔 COMPOSANT CARTE PRODUIT (ProductCard)

### Design final

```tsx
// src/components/menu/ProductCard.tsx

interface ProductCardProps {
  product: {
    id: string
    name: string
    nameAr: string | null
    description: string | null
    descriptionAr: string | null
    price: number // centimes
    image: string | null
    isAvailable: boolean
    categoryName: string
  }
  onAdd: (productId: string) => void
  quantityInCart: number
  locale: 'fr' | 'ar'
}

export function ProductCard({ product, onAdd, quantityInCart, locale }: ProductCardProps) {
  const isRTL = locale === 'ar'

  return (
    <div 
      className={`
        relative bg-white rounded-2xl overflow-hidden
        shadow-sm hover:shadow-md transition-shadow duration-200
        active:scale-[0.98] transition-transform
        ${isRTL ? 'rtl' : 'ltr'}
      `}
    >
      {/* Image Container */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {product.image ? (
          <img 
            src={product.image} 
            alt={isRTL ? product.nameAr || product.name : product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-4xl">🍔</span>
          </div>
        )}

        {/* Badge Promo (si applicable) */}
        {product.price < 50000 && (
          <div className={`
            absolute top-2 ${isRTL ? 'right-2' : 'left-2'}
            bg-[#FF6B00] text-white text-xs font-bold px-2 py-1 rounded-full
          `}>
            {isRTL ? 'عرض' : 'PROMO'}
          </div>
        )}

        {/* Quantity Badge (si dans panier) */}
        {quantityInCart > 0 && (
          <div className={`
            absolute top-2 ${isRTL ? 'left-2' : 'right-2'}
            bg-[#00C853] text-white text-sm font-bold w-6 h-6 
            rounded-full flex items-center justify-center
          `}>
            {quantityInCart}
          </div>
        )}
      </div>

      {/* Info Container */}
      <div className="p-3">
        <h3 className="text-[#1A1A1A] font-semibold text-base leading-tight mb-1">
          {isRTL ? product.nameAr || product.name : product.name}
        </h3>

        {product.description && (
          <p className="text-[#6B6B6B] text-xs leading-relaxed mb-2 line-clamp-2">
            {isRTL ? product.descriptionAr || product.description : product.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[#1A1A1A] font-bold text-lg">
            {(product.price / 100).toLocaleString()} <span className="text-sm font-normal">DA</span>
          </span>

          <button
            onClick={() => onAdd(product.id)}
            disabled={!product.isAvailable}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center
              ${product.isAvailable 
                ? 'bg-[#FF6B00] text-white hover:bg-[#E55A00] active:scale-90' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
              transition-all duration-150
            `}
            aria-label={isRTL ? 'أضف إلى السلة' : 'Ajouter au panier'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Spécifications CSS (Tailwind)

```css
/* Grille produits : 2 colonnes sur mobile, gap 12px */
.products-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 16px;
}

/* Sur tablette : 3 colonnes */
@media (min-width: 640px) {
  .products-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
}

/* Sur desktop : 4 colonnes */
@media (min-width: 1024px) {
  .products-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Animation d'ajout au panier */
@keyframes addToCart {
  0% { transform: scale(1); }
  50% { transform: scale(0.85); }
  100% { transform: scale(1); }
}

.add-to-cart-animate {
  animation: addToCart 0.2s ease-out;
}

/* Scrollbar catégories cachée mais fonctionnelle */
.categories-scroll::-webkit-scrollbar {
  display: none;
}
.categories-scroll {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

---

## 📂 COMPOSANT CATÉGORIES (CategoryTabs)

### Design final

```tsx
// src/components/menu/CategoryTabs.tsx

interface CategoryTabsProps {
  categories: Array<{
    id: string
    name: string
    nameAr: string | null
    icon: string // emoji ou svg
  }>
  activeCategory: string
  onSelect: (categoryId: string) => void
  locale: 'fr' | 'ar'
}

export function CategoryTabs({ categories, activeCategory, onSelect, locale }: CategoryTabsProps) {
  const isRTL = locale === 'ar'
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll auto vers la catégorie active
  useEffect(() => {
    const activeEl = scrollRef.current?.querySelector(`[data-category="${activeCategory}"]`)
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [activeCategory])

  return (
    <div 
      ref={scrollRef}
      className={`
        flex gap-2 overflow-x-auto px-4 py-3
        bg-white border-b border-gray-100
        sticky top-[60px] z-40
        categories-scroll
        ${isRTL ? 'flex-row-reverse' : ''}
      `}
    >
      {categories.map((category) => {
        const isActive = category.id === activeCategory
        return (
          <button
            key={category.id}
            data-category={category.id}
            onClick={() => onSelect(category.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full
              whitespace-nowrap text-sm font-semibold
              transition-all duration-200
              ${isActive 
                ? 'bg-[#FF6B00] text-white shadow-md' 
                : 'bg-gray-100 text-[#6B6B6B] hover:bg-gray-200'
              }
            `}
          >
            <span className="text-lg">{category.icon}</span>
            <span>{isRTL ? category.nameAr || category.name : category.name}</span>
          </button>
        )
      })}
    </div>
  )
}
```

---

## 🌍 SYSTÈME DE LANGUE AUTOMATIQUE (Français ↔ Arabe)

### Détection automatique

```tsx
// src/lib/locale.ts

export type Locale = 'fr' | 'ar'

export function detectLocale(): Locale {
  // 1. Vérifier localStorage (préférence utilisateur sauvegardée)
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('bm_locale') as Locale | null
    if (saved && (saved === 'fr' || saved === 'ar')) return saved

    // 2. Détecter la langue du navigateur
    const browserLang = navigator.language.toLowerCase()
    if (browserLang.startsWith('ar')) return 'ar'

    // 3. Détecter la langue du système Android/iOS
    // @ts-ignore
    const deviceLang = window.navigator.userLanguage || navigator.language
    if (deviceLang?.toLowerCase().startsWith('ar')) return 'ar'
  }

  return 'fr' // Default
}

export function setLocale(locale: Locale) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('bm_locale', locale)
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = locale
  }
}

// Hook React
export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>('fr')

  useEffect(() => {
    const detected = detectLocale()
    setLocaleState(detected)
    setLocale(detected)
  }, [])

  const changeLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    setLocale(newLocale)
    window.location.reload() // Reload pour appliquer RTL/LTR
  }

  return { locale, isRTL: locale === 'ar', changeLocale }
}
```

### Dictionnaire de traduction

```tsx
// src/lib/i18n.ts

export const translations = {
  fr: {
    menu: {
      title: 'Notre Menu',
      search: 'Rechercher...',
      addToCart: 'Ajouter',
      viewCart: 'Voir le panier',
      items: 'articles',
      promo: 'PROMO',
      unavailable: 'Indisponible',
    },
    cart: {
      title: 'Votre Panier',
      empty: 'Votre panier est vide',
      total: 'Total',
      checkout: 'Commander',
    },
    checkout: {
      title: 'Finaliser la commande',
      name: 'Nom',
      phone: 'Téléphone',
      address: 'Adresse',
      zone: 'Zone de livraison',
      city: 'Ville',
      outside: 'Hors ville',
      confirm: 'Confirmer la commande',
    },
  },
  ar: {
    menu: {
      title: 'قائمتنا',
      search: 'بحث...',
      addToCart: 'أضف',
      viewCart: 'عرض السلة',
      items: 'عناصر',
      promo: 'عرض',
      unavailable: 'غير متوفر',
    },
    cart: {
      title: 'سلتك',
      empty: 'سلتك فارغة',
      total: 'المجموع',
      checkout: 'اطلب',
    },
    checkout: {
      title: 'إتمام الطلب',
      name: 'الاسم',
      phone: 'الهاتف',
      address: 'العنوان',
      zone: 'منطقة التوصيل',
      city: 'داخل المدينة',
      outside: 'خارج المدينة',
      confirm: 'تأكيد الطلب',
    },
  },
} as const

export type TranslationKey = keyof typeof translations.fr

export function t(key: string, locale: Locale): string {
  const keys = key.split('.')
  let value: any = translations[locale]
  for (const k of keys) {
    value = value?.[k]
  }
  return value || key
}
```

### Layout RTL/LTR

```tsx
// src/app/menu/layout.tsx ou page.tsx

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  const { locale, isRTL } = useLocale()

  return (
    <div 
      dir={isRTL ? 'rtl' : 'ltr'}
      lang={locale}
      className={`
        min-h-screen bg-[#F8F5F0]
        ${isRTL ? 'font-cairo' : 'font-inter'}
      `}
    >
      {/* Toggle langue (subtil, en haut à droite) */}
      <div className="absolute top-2 right-2 z-50">
        <button
          onClick={() => changeLocale(isRTL ? 'fr' : 'ar')}
          className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
        >
          {isRTL ? 'FR' : 'عربي'}
        </button>
      </div>

      {children}
    </div>
  )
}
```

---

## ⚡ OPTIMISATIONS PERFORMANCE

### 1. Images optimisées

```tsx
// Utiliser Next.js Image avec priority pour le premier écran
import Image from 'next/image'

<Image
  src={product.image}
  alt={product.name}
  width={300}
  height={300}
  className="object-cover"
  loading={index < 4 ? "eager" : "lazy"} // Eager pour les 4 premiers
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
/>
```

### 2. Préchargement des catégories

```tsx
// Précharger les données côté serveur
export async function generateStaticParams() {
  const categories = await db.category.findMany({ where: { isActive: true } })
  return categories.map((c) => ({ category: c.id }))
}

// ou ISR avec revalidation
export const revalidate = 60 // Revalider le menu toutes les 60 secondes
```

### 3. Cache des produits

```tsx
// API route avec cache headers
export async function GET() {
  const products = await db.product.findMany({
    where: { isAvailable: true },
    include: { category: true },
  })

  return NextResponse.json(products, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
```

### 4. Virtual scrolling (si +50 produits)

```tsx
// Utiliser react-window ou react-virtualized pour les grandes listes
import { FixedSizeGrid } from 'react-window'

<FixedSizeGrid
  columnCount={2}
  columnWidth={170}
  height={window.innerHeight - 200}
  rowCount={Math.ceil(products.length / 2)}
  rowHeight={280}
  width={window.innerWidth}
>
  {({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * 2 + columnIndex
    const product = products[index]
    if (!product) return null
    return (
      <div style={style}>
        <ProductCard product={product} onAdd={addToCart} />
      </div>
    )
  }}
</FixedSizeGrid>
```

### 5. Skeleton loading

```tsx
// Pendant le chargement des produits
function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="flex justify-between">
          <div className="h-5 bg-gray-200 rounded w-16" />
          <div className="h-10 w-10 bg-gray-200 rounded-full" />
        </div>
      </div>
    </div>
  )
}
```

---

## 🎯 ANIMATIONS MICRO-INTERACTIONS

### Ajout au panier (haptic feedback + visuel)

```tsx
// Quand on ajoute un produit
function handleAdd(productId: string) {
  // 1. Haptic feedback (sur mobile)
  if (navigator.vibrate) navigator.vibrate(50)

  // 2. Animation visuelle
  setAnimatingProduct(productId)
  setTimeout(() => setAnimatingProduct(null), 300)

  // 3. Son subtil (optionnel)
  // const audio = new Audio('/sounds/pop.mp3')
  // audio.play().catch(() => {})

  // 4. Ajouter au panier
  addToCart(productId)
}

// Dans le bouton :
<button
  className={`
    transition-all duration-150
    ${animatingProduct === product.id ? 'add-to-cart-animate scale-90' : 'scale-100'}
  `}
>
```

### Panier flottant qui apparaît

```tsx
// Animation d'entrée du panier
const [showCartBar, setShowCartBar] = useState(false)

useEffect(() => {
  setShowCartBar(cartItems.length > 0)
}, [cartItems.length])

<div className={`
  fixed bottom-0 left-0 right-0 p-4 z-50
  transition-transform duration-300 ease-out
  ${showCartBar ? 'translate-y-0' : 'translate-y-full'}
`}>
  <div className="bg-[#1A1A1A] text-white rounded-2xl p-4 flex items-center justify-between shadow-lg">
    <div className="flex items-center gap-3">
      <div className="relative">
        <span className="text-2xl">🛒</span>
        {cartItems.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#FF6B00] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {cartItems.length}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium">
          {cartItems.length} {isRTL ? 'عناصر' : 'articles'}
        </p>
        <p className="text-lg font-bold">
          {(cartTotal / 100).toLocaleString()} DA
        </p>
      </div>
    </div>
    <button className="bg-[#FF6B00] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#E55A00] active:scale-95 transition-all">
      {isRTL ? 'عرض السلة' : 'Voir le panier'}
    </button>
  </div>
</div>
```

---

## 📱 COMPORTEMENT SPÉCIFIQUE MOBILE

### Pull-to-refresh (natif)

```tsx
// Sur la page menu, permettre le pull-to-refresh
useEffect(() => {
  if ('serviceWorker' in navigator) {
    // Le service worker gère le cache
  }
}, [])

// Ou avec une librairie comme react-pull-to-refresh
```

### Double-tap prevention

```css
/* Empêcher le zoom sur double-tap iOS */
button, a {
  touch-action: manipulation;
}

/* Empêcher le highlight bleu sur mobile */
* {
  -webkit-tap-highlight-color: transparent;
}
```

### Safe areas (iPhone notch)

```css
/* Respecter les safe areas */
.safe-area-top {
  padding-top: env(safe-area-inset-top);
}
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

## 🎨 HERO / PROMO DU JOUR (optionnel)

```tsx
// src/components/menu/PromoBanner.tsx

export function PromoBanner({ locale }: { locale: Locale }) {
  const isRTL = locale === 'ar'

  return (
    <div className="mx-4 mb-4 rounded-2xl overflow-hidden bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white p-4 relative">
      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="text-4xl">🎉</div>
        <div className="flex-1">
          <p className="text-xs font-medium opacity-90">
            {isRTL ? 'عرض اليوم' : 'PROMO DU JOUR'}
          </p>
          <p className="text-lg font-bold">
            {isRTL ? 'قائمة مزدوجة + بطاطا = 650 دج' : 'Menu Double + Frites = 650 DA'}
          </p>
        </div>
        <button className="bg-white text-[#FF6B00] px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap">
          {isRTL ? 'اطلب الآن' : 'Commander'}
        </button>
      </div>
    </div>
  )
}
```

---

## 📝 CHECKLIST D'IMPLEMENTATION

- [ ] Créer `src/components/menu/ProductCard.tsx` avec le design ci-dessus
- [ ] Créer `src/components/menu/CategoryTabs.tsx` avec scroll horizontal
- [ ] Créer `src/components/menu/PromoBanner.tsx` (optionnel)
- [ ] Créer `src/lib/locale.ts` avec détection automatique
- [ ] Créer `src/lib/i18n.ts` avec dictionnaire fr/ar
- [ ] Modifier `src/app/menu/page.tsx` pour intégrer tout
- [ ] Modifier `prisma/schema.prisma` pour ajouter `nameAr`, `descriptionAr` aux produits/catégories
- [ ] Ajouter les fonts Google (Inter, Cairo) dans `layout.tsx`
- [ ] Ajouter les styles RTL globaux dans `globals.css`
- [ ] Tester sur iPhone (Safari) et Android (Chrome)
- [ ] Tester la détection de langue arabe sur téléphone en arabe
- [ ] Vérifier que le panier flottant n'obscure pas le contenu
- [ ] Vérifier que les animations sont fluides (60fps)

---

**Commence par la détection de langue et le dictionnaire, puis le composant ProductCard, puis l'intégration dans la page menu.**
