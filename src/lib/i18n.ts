import type { Locale } from './locale'

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
    if (value === undefined || value === null) return key
    value = value[k]
  }
  return typeof value === 'string' ? value : key
}
