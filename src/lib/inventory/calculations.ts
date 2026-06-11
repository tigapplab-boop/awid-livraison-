// ========================================
// CALCULS INVENTAIRE - Bénéfices & Marges
// ========================================

export interface ProfitCalculation {
  profit: number           // Bénéfice unitaire (centimes)
  profitMargin: number     // Marge en pourcentage
  totalProfit: number      // Bénéfice total = profit × stock
}

/**
 * Calcule le bénéfice et la marge d'un produit
 */
export function calculateProfit(
  purchasePrice: number,
  sellingPrice: number,
  currentStock: number = 0
): ProfitCalculation {
  const profit = sellingPrice - purchasePrice
  const profitMargin = purchasePrice > 0 
    ? (profit / purchasePrice) * 100 
    : 0
  const totalProfit = profit * currentStock

  return {
    profit,
    profitMargin: Math.round(profitMargin * 100) / 100, // 2 décimales
    totalProfit,
  }
}

/**
 * Formatte un montant en DA
 */
export function formatPrice(centimes: number): string {
  const da = centimes / 100
  return new Intl.NumberFormat('fr-DZ', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(da) + ' DA'
}

/**
 * Formatte une marge en pourcentage
 */
export function formatMargin(margin: number): string {
  return `${margin.toFixed(2)}%`
}

/**
 * Détermine la couleur de la marge
 */
export function getMarginColor(margin: number): string {
  if (margin >= 30) return 'text-emerald-600'
  if (margin >= 15) return 'text-green-600'
  if (margin >= 5) return 'text-yellow-600'
  return 'text-red-600'
}

/**
 * Détermine le statut du stock
 */
export function getStockStatus(
  currentStock: number,
  minStock: number
): 'OK' | 'LOW' | 'OUT' {
  if (currentStock <= 0) return 'OUT'
  if (currentStock <= minStock) return 'LOW'
  return 'OK'
}

/**
 * Couleur du badge de stock
 */
export function getStockBadgeColor(status: 'OK' | 'LOW' | 'OUT'): string {
  switch (status) {
    case 'OUT':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'LOW':
      return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'OK':
      return 'bg-green-100 text-green-700 border-green-200'
  }
}

/**
 * Génère un numéro d'achat unique
 */
export function generatePurchaseNumber(date: Date = new Date()): string {
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 999) + 1
  const seq = random.toString().padStart(3, '0')
  
  return `ACH-${year}${month}${day}-${seq}`
}

/**
 * Calcule le total d'un achat
 */
export function calculatePurchaseTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice)
}
