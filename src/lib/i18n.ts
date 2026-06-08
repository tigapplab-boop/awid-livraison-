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
      title: 'Mon Panier',
      empty: 'Votre panier est vide',
      emptyDesc: 'Ajoutez des produits depuis le menu',
      backToMenu: 'Voir le menu',
      suppl: 'Suppl.',
      for: 'Pour',
      deliveryZone: 'Zone de livraison',
      noZone: 'Aucune zone disponible',
      night: 'nuit',
      subtotal: 'Sous-total',
      article: 'article',
      articles: 'articles',
      delivery: 'Livraison',
      total: 'Total',
      selectZone: 'Sélectionnez une zone',
      checkout: 'Commander',
    },
    checkout: {
      title: 'Commander',
      empty: 'Votre panier est vide ou aucune zone sélectionnée',
      backToMenu: 'Voir le menu',
      fullName: 'Nom complet',
      phone: 'Téléphone',
      address: 'Adresse de livraison',
      notes: 'Notes (optionnel)',
      summary: 'Récapitulatif',
      subtotal: 'Sous-total',
      delivery: 'Livraison',
      total: 'Total',
      sending: 'Envoi en cours...',
      confirm: 'Confirmer',
      pendingTitle: 'Commande en attente',
      pendingDesc: 'Vous avez déjà une commande en cours',
      status: 'Statut',
      calling: 'Appel en cours',
      waiting: 'En attente',
      items: 'Articles',
      modifyOrder: 'Modifier cette commande',
      newOrder: 'Créer une nouvelle commande',
      cancel: 'Annuler',
      creating: 'Création...',
      errors: {
        name: 'Le nom doit contenir au moins 2 caractères',
        phone: 'Numéro de téléphone algérien invalide (format: 05XXXXXXXX)',
        address: "L'adresse doit contenir au moins 10 caractères",
      }
    },
    waiting: {
      title: 'Suivi de Commande',
      orderNumber: 'Commande n°',
      status: {
        PENDING: 'En attente',
        CALLING: 'Appel en cours',
        CONFIRMED: 'Confirmée',
        PREPARING: 'En préparation',
        READY: 'Prête',
        DELIVERED: 'Livrée',
        CANCELLED: 'Annulée'
      },
      desc: {
        PENDING: 'Nous avons bien reçu votre commande. Un livreur va vous appeler dans quelques instants pour confirmer.',
        CALLING: 'Un livreur est en train de vous appeler. Merci de répondre pour valider la commande.',
        CONFIRMED: 'Votre commande a été confirmée ! Elle est en route vers la cuisine.',
        PREPARING: 'La cuisine prépare votre commande avec soin.',
        READY: 'Votre commande est prête ! Le livreur est en route.',
        DELIVERED: 'Commande livrée ! Bon appétit !',
        CANCELLED: 'Votre commande a été annulée.'
      },
      refresh: 'Rafraîchir',
      modify: 'Modifier la commande',
      cancel: 'Annuler la commande',
      backToMenu: 'Retour au menu',
      deliveryInfo: 'Informations de livraison',
      orderSummary: 'Récapitulatif de la commande'
    }
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
      title: 'سلتي',
      empty: 'سلتك فارغة',
      emptyDesc: 'أضف بعض المنتجات من القائمة',
      backToMenu: 'عرض القائمة',
      suppl: 'إضافة',
      for: 'لـ',
      deliveryZone: 'منطقة التوصيل',
      noZone: 'لا توجد مناطق متاحة',
      night: 'ليل',
      subtotal: 'المجموع الفرعي',
      article: 'عنصر',
      articles: 'عناصر',
      delivery: 'التوصيل',
      total: 'المجموع',
      selectZone: 'اختر منطقة',
      checkout: 'إتمام الطلب',
    },
    checkout: {
      title: 'إتمام الطلب',
      empty: 'السلة فارغة أو لم يتم اختيار منطقة',
      backToMenu: 'عرض القائمة',
      fullName: 'الاسم الكامل',
      phone: 'رقم الهاتف',
      address: 'عنوان التوصيل',
      notes: 'ملاحظات (اختياري)',
      summary: 'ملخص الطلب',
      subtotal: 'المجموع الفرعي',
      delivery: 'التوصيل',
      total: 'المجموع',
      sending: 'جاري الإرسال...',
      confirm: 'تأكيد',
      pendingTitle: 'طلب قيد الانتظار',
      pendingDesc: 'لديك بالفعل طلب قيد التنفيذ',
      status: 'الحالة',
      calling: 'جاري الاتصال',
      waiting: 'في الانتظار',
      items: 'العناصر',
      modifyOrder: 'تعديل هذا الطلب',
      newOrder: 'إنشاء طلب جديد',
      cancel: 'إلغاء',
      creating: 'جاري الإنشاء...',
      errors: {
        name: 'يجب أن يحتوي الاسم على حرفين على الأقل',
        phone: 'رقم هاتف جزائري غير صالح (صيغة: 05XXXXXXXX)',
        address: 'يجب أن يحتوي العنوان على 10 أحرف على الأقل',
      }
    },
    waiting: {
      title: 'تتبع الطلب',
      orderNumber: 'طلب رقم',
      status: {
        PENDING: 'في الانتظار',
        CALLING: 'جاري الاتصال بك',
        CONFIRMED: 'تم التأكيد',
        PREPARING: 'جاري التحضير',
        READY: 'جاهز',
        DELIVERED: 'تم التوصيل',
        CANCELLED: 'ملغى'
      },
      desc: {
        PENDING: 'لقد استلمنا طلبك. سيتصل بك عامل التوصيل في غضون لحظات للتأكيد.',
        CALLING: 'عامل التوصيل يتصل بك الآن. يرجى الرد لتأكيد الطلب.',
        CONFIRMED: 'تم تأكيد طلبك! وهو في طريقه إلى المطبخ.',
        PREPARING: 'المطبخ يقوم بتحضير طلبك بعناية.',
        READY: 'طلبك جاهز! عامل التوصيل في طريقه إليك.',
        DELIVERED: 'تم التوصيل! شهية طيبة!',
        CANCELLED: 'تم إلغاء طلبك.'
      },
      refresh: 'تحديث',
      modify: 'تعديل الطلب',
      cancel: 'إلغاء الطلب',
      backToMenu: 'العودة للقائمة',
      deliveryInfo: 'معلومات التوصيل',
      orderSummary: 'ملخص الطلب'
    }
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
