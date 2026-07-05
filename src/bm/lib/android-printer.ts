/**
 * Android Thermal Printer - Goojprt PT-210 (48mm)
 * Méthode 1 : RawBT intent Android (si RawBT installé)
 * Méthode 2 : Fenêtre d'impression dédiée (fallback universel)
 *
 * RawBT est une app Android gratuite qui reçoit des données ESC/POS
 * via un intent Android et les envoie à l'imprimante Bluetooth couplée.
 * Play Store: https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter
 */

// 48mm = ~32 chars par ligne en police normale
const LINE_WIDTH = 32

// ── ESC/POS helpers ──────────────────────────────────────────────────────────
const LF    = '\x0A'
const INIT  = '\x1B\x40'
const CUT   = '\x1D\x56\x00'

const BOLD_ON       = '\x1B\x45\x01'
const BOLD_OFF      = '\x1B\x45\x00'
const ALIGN_LEFT    = '\x1B\x61\x00'
const ALIGN_CENTER  = '\x1B\x61\x01'
const DOUBLE_H      = '\x1B\x21\x10'
const DOUBLE_WH     = '\x1B\x21\x30'
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
      cur = w.slice(0, width)
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

  add(INIT)
  add(ALIGN_CENTER)
  add(DOUBLE_WH + BOLD_ON)
  add('BURGER MINUTE' + LF)
  add(NORMAL + BOLD_OFF)
  add(separator() + LF)

  add(DOUBLE_H + BOLD_ON)
  add(`N ${order.orderNumber}` + LF)
  add(NORMAL + BOLD_OFF)

  const typeLabel = order.type === 'pos' ? 'SUR PLACE' : order.type === 'phone' ? 'TEL' : 'EN LIGNE'
  add(`${typeLabel}  ${dateStr} ${timeStr}` + LF)
  add(separator() + LF)

  if (order.type !== 'pos' && order.clientName) {
    add(ALIGN_LEFT)
    add(BOLD_ON + 'CLIENT:' + BOLD_OFF + LF)
    for (const l of wrap(order.clientName)) add(l + LF)
    if (order.clientPhone)   add(`Tel: ${order.clientPhone}` + LF)
    if (order.clientAddress) for (const l of wrap(order.clientAddress)) add(l + LF)
    if (order.deliveryZone)  add(`Zone: ${order.deliveryZone}` + LF)
    add(separator() + LF)
  }

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

  add(separator() + LF)
  add(ALIGN_CENTER)
  add('Merci!' + LF)
  add('\n\n\n')
  add(CUT)

  return lines.join('')
}

// ── Ticket HTML pour impression navigateur (fallback) ─────────────────────────

export function buildTicketHTML(order: TicketOrder): string {
  const date = (order.createdAt ?? new Date())
  const dateStr = date.toLocaleDateString('fr-DZ', { day: '2-digit', month: '2-digit', year: '2-digit' })
  const timeStr = date.toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })
  const typeLabel = order.type === 'pos' ? 'SUR PLACE' : order.type === 'phone' ? 'TEL' : 'EN LIGNE'

  const mainItems = order.items.filter(i => !i.attachedToProductId)

  const itemsHtml = mainItems.map(item => {
    const attached = order.items.filter(a => a.attachedToProductId === item.name)
    const attachedHtml = attached.map(a =>
      `<tr><td style="padding:1px 0 1px 8px;font-size:11px">+${a.quantity}x ${a.name}</td>
       <td style="text-align:right;font-size:11px">${(a.price * a.quantity).toFixed(0)} DA</td></tr>`
    ).join('')
    return `
      <tr>
        <td style="padding:3px 0;font-size:13px;font-weight:bold">${item.quantity}x ${item.name}</td>
        <td style="text-align:right;font-size:13px;font-weight:bold">${(item.price * item.quantity).toFixed(0)} DA</td>
      </tr>
      ${attachedHtml}
    `
  }).join('')

  const clientHtml = order.type !== 'pos' && order.clientName ? `
    <div style="border-top:1px dashed #000;margin:6px 0;padding-top:6px">
      <b>CLIENT:</b><br>
      ${order.clientName}<br>
      ${order.clientPhone ? `Tel: ${order.clientPhone}<br>` : ''}
      ${order.clientAddress ? `${order.clientAddress}<br>` : ''}
      ${order.deliveryZone ? `Zone: ${order.deliveryZone}` : ''}
    </div>
    <div style="border-top:1px dashed #000;margin:6px 0"></div>
  ` : '<div style="border-top:1px dashed #000;margin:6px 0"></div>'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Ticket ${order.orderNumber}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Courier New', monospace;
          width: 48mm;
          font-size: 12px;
          color: #000;
          background: #fff;
          padding: 4mm;
        }
        @page { size: 48mm auto; margin: 0; }
        @media print { body { width: 48mm; } }
        table { width: 100%; border-collapse: collapse; }
        .center { text-align: center; }
        .sep { border-top: 1px dashed #000; margin: 6px 0; }
        .big { font-size: 16px; font-weight: bold; }
        .huge { font-size: 20px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="center">
        <div class="huge">BURGER MINUTE</div>
        <div class="sep"></div>
        <div class="big">N° ${order.orderNumber}</div>
        <div>${typeLabel} — ${dateStr} ${timeStr}</div>
      </div>
      ${clientHtml}
      <b>ARTICLES:</b>
      <table>
        ${itemsHtml}
      </table>
      <div class="sep"></div>
      <table>
        <tr><td>Sous-total</td><td style="text-align:right">${order.subtotal.toFixed(0)} DA</td></tr>
        ${order.deliveryFee && order.deliveryFee > 0
          ? `<tr><td>Livraison</td><td style="text-align:right">${order.deliveryFee.toFixed(0)} DA</td></tr>`
          : ''}
      </table>
      <div class="sep"></div>
      <table>
        <tr>
          <td class="big">TOTAL</td>
          <td style="text-align:right" class="big">${order.total.toFixed(0)} DA</td>
        </tr>
      </table>
      ${order.notes ? `<div class="sep"></div><b>NOTE:</b> ${order.notes}` : ''}
      <div class="sep"></div>
      <div class="center">Merci!</div>
    </body>
    </html>
  `
}

// ── Envoi vers RawBT (Android) ────────────────────────────────────────────────

export function printViaRawBT(order: TicketOrder): void {
  const escpos = buildTicketESCPOS(order)
  const b64 = btoa(unescape(encodeURIComponent(escpos)))
  const intentUrl = `intent://print#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;S.data=${encodeURIComponent(b64)};end`
  window.location.href = intentUrl
}

// ── Impression via fenêtre dédiée (fallback universel) ────────────────────────

export function printViaWindow(order: TicketOrder): void {
  const html = buildTicketHTML(order)
  const win = window.open('', '_blank', 'width=300,height=600')
  if (!win) {
    // popup bloqué → créer un iframe caché
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none'
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(html)
      doc.close()
      setTimeout(() => {
        iframe.contentWindow?.print()
        setTimeout(() => document.body.removeChild(iframe), 1000)
      }, 300)
    }
    return
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
  win.onload = () => {
    win.print()
    win.close()
  }
}

// ── Détection ────────────────────────────────────────────────────────────────

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false
  return /android/i.test(navigator.userAgent)
}

// ── Point d'entrée principal ──────────────────────────────────────────────────

/**
 * Imprime le ticket :
 * - Android → tente RawBT, sinon fenêtre dédiée
 * - Autre   → fenêtre dédiée (48mm, format ticket)
 */
export function printTicket(order: TicketOrder, _legacyFallback?: () => void): void {
  if (isAndroid()) {
    try {
      printViaRawBT(order)
    } catch {
      printViaWindow(order)
    }
  } else {
    printViaWindow(order)
  }
}
