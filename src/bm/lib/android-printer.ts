/**
 * Android Thermal Printer - Goojprt PT-210 (48mm)
 * Méthode : RawBT intent + fallback window.print()
 *
 * RawBT est une app Android gratuite qui reçoit des données ESC/POS
 * via un intent Android et les envoie à l'imprimante Bluetooth couplée.
 * Play Store: https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter
 */

// 48mm = ~32 chars par ligne en police normale
const LINE_WIDTH = 32

// ── ESC/POS helpers ──────────────────────────────────────────────────────────
const ESC   = '\x1B'
const GS    = '\x1D'
const INIT  = '\x1B\x40'
const LF    = '\x0A'
const CUT   = '\x1D\x56\x00'   // coupe partielle

const BOLD_ON       = '\x1B\x45\x01'
const BOLD_OFF      = '\x1B\x45\x00'
const ALIGN_LEFT    = '\x1B\x61\x00'
const ALIGN_CENTER  = '\x1B\x61\x01'
const DOUBLE_H      = '\x1B\x21\x10'  // double hauteur
const DOUBLE_WH     = '\x1B\x21\x30'  // double largeur + hauteur
const NORMAL        = '\x1B\x21\x00'

// ── Utilitaires texte ─────────────────────────────────────────────────────────

function pad(left: string, right: string, width = LINE_WIDTH): string {
  const gap = width - left.length - right.length
  return left + ' '.repeat(Math.max(gap, 1)) + right
}

function separator(char = '-', width = LINE_WIDTH): string {
  return char.repeat(width)
}

function wrap(text: string, width = LINE_WIDTH): string[] {
  if (text.length <= width) return [text]
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur ? cur + ' ' + w : w).length <= width) {
      cur = cur ? cur + ' ' + w : w
    } else {
      if (cur) lines.push(cur)
      cur = w.slice(0, width)          // coupe les mots trop longs
    }
  }
  if (cur) lines.push(cur)
  return lines
}

// ── Construction du ticket ESC/POS ───────────────────────────────────────────

export interface TicketOrder {
  orderNumber: string
  type: 'pos' | 'phone' | 'online'
  items: Array<{
    name: string
    quantity: number
    price: number
    attachedToProductId?: string
  }>
  subtotal: number
  deliveryFee?: number
  total: number
  clientName?: string
  clientPhone?: string
  clientAddress?: string
  deliveryZone?: string
  notes?: string
  createdAt?: Date
}

export function buildTicketESCPOS(order: TicketOrder): string {
  const lines: string[] = []
  const add = (s: string) => lines.push(s)

  const date = (order.createdAt ?? new Date())
  const dateStr = date.toLocaleDateString('fr-DZ', { day: '2-digit', month: '2-digit', year: '2-digit' })
  const timeStr = date.toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })

  // En-tête
  add(INIT)
  add(ALIGN_CENTER)
  add(DOUBLE_WH + BOLD_ON)
  add('BURGER MINUTE' + LF)
  add(NORMAL + BOLD_OFF)
  add(separator() + LF)

  // Numéro commande
  add(DOUBLE_H + BOLD_ON)
  add(`N ${order.orderNumber}` + LF)
  add(NORMAL + BOLD_OFF)

  const typeLabel = order.type === 'pos' ? 'SUR PLACE' : order.type === 'phone' ? 'TEL' : 'EN LIGNE'
  add(`${typeLabel}  ${dateStr} ${timeStr}` + LF)
  add(separator() + LF)

  // Infos client (livraison)
  if (order.type !== 'pos' && order.clientName) {
    add(ALIGN_LEFT)
    add(BOLD_ON + 'CLIENT:' + BOLD_OFF + LF)
    for (const l of wrap(order.clientName)) add(l + LF)
    if (order.clientPhone)  add(`Tel: ${order.clientPhone}` + LF)
    if (order.clientAddress) for (const l of wrap(order.clientAddress)) add(l + LF)
    if (order.deliveryZone)  add(`Zone: ${order.deliveryZone}` + LF)
    add(separator() + LF)
  }

  // Articles
  add(ALIGN_LEFT)
  add(BOLD_ON + 'ARTICLES:' + BOLD_OFF + LF)

  const mainItems = order.items.filter(i => !i.attachedToProductId)
  for (const item of mainItems) {
    const total = (item.price * item.quantity).toFixed(0)
    const label = `${item.quantity}x ${item.name}`
    const labelLines = wrap(label, LINE_WIDTH - 8)
    for (let i = 0; i < labelLines.length; i++) {
      add(i === labelLines.length - 1
        ? pad(labelLines[i], `${total}DA`) + LF
        : labelLines[i] + LF
      )
    }
    // Suppléments / sauces attachés
    for (const att of order.items.filter(a => a.attachedToProductId === item.name)) {
      const attTotal = (att.price * att.quantity).toFixed(0)
      const attLabel = ` +${att.quantity}x ${att.name}`
      const attLines = wrap(attLabel, LINE_WIDTH - 8)
      for (let i = 0; i < attLines.length; i++) {
        add(i === attLines.length - 1
          ? pad(attLines[i], `${attTotal}DA`) + LF
          : attLines[i] + LF
        )
      }
    }
  }

  add(separator() + LF)
  add(pad('Sous-total:', `${order.subtotal.toFixed(0)}DA`) + LF)
  if (order.deliveryFee && order.deliveryFee > 0) {
    add(pad('Livraison:', `${order.deliveryFee.toFixed(0)}DA`) + LF)
  }
  add(separator() + LF)
  add(BOLD_ON + DOUBLE_H)
  add(pad('TOTAL:', `${order.total.toFixed(0)}DA`) + LF)
  add(NORMAL + BOLD_OFF)

  if (order.notes) {
    add(separator() + LF)
    add(BOLD_ON + 'NOTE:' + BOLD_OFF + LF)
    for (const l of wrap(order.notes)) add(l + LF)
  }

  // Pied de page
  add(separator() + LF)
  add(ALIGN_CENTER)
  add('Merci!' + LF)
  add('\n\n\n')
  add(CUT)

  return lines.join('')
}

// ── Envoi vers RawBT (Android) ────────────────────────────────────────────────

/**
 * Envoie le ticket ESC/POS à RawBT via un Intent Android.
 * RawBT doit être installé sur l'appareil Android.
 * L'intent ouvre RawBT qui imprime sur l'imprimante Bluetooth couplée.
 */
export function printViaRawBT(order: TicketOrder): void {
  const escpos = buildTicketESCPOS(order)

  // Encoder en base64 (RawBT attend les données en base64)
  const b64 = btoa(unescape(encodeURIComponent(escpos)))

  // Intent Android : rawbt://x-callback-url/print?data=<base64>
  const intentUrl = `intent://print#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;S.data=${encodeURIComponent(b64)};end`

  // Ouvrir l'intent (Android uniquement)
  window.location.href = intentUrl
}

/**
 * Vérifie si on est sur Android
 */
export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false
  return /android/i.test(navigator.userAgent)
}

/**
 * Impression : RawBT sur Android, window.print() sinon
 */
export function printTicket(order: TicketOrder, fallbackPrint?: () => void): void {
  if (isAndroid()) {
    printViaRawBT(order)
  } else if (fallbackPrint) {
    fallbackPrint()
  } else {
    window.print()
  }
}
