'use client'

import { useState } from 'react'
import { Printer, Smartphone, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isAndroid, printTicket, type TicketOrder } from '@/bm/lib/android-printer'

interface PrinterButtonProps {
  order: TicketOrder
  label?: string
  size?: 'sm' | 'default'
  variant?: 'default' | 'outline'
  className?: string
}

export function PrinterButton({
  order,
  label = 'Imprimer',
  size = 'default',
  variant = 'outline',
  className = '',
}: PrinterButtonProps) {
  const [showInfo, setShowInfo] = useState(false)

  const handlePrint = () => {
    printTicket(order, () => {
      // fallback navigateur (PC / iOS)
      window.print()
    })
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        onClick={handlePrint}
        variant={variant}
        size={size}
        className={`gap-2 ${className}`}
      >
        {isAndroid() ? (
          <Smartphone className="h-4 w-4" />
        ) : (
          <Printer className="h-4 w-4" />
        )}
        {label}
      </Button>

      {/* Info RawBT pour Android */}
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="p-1 text-stone-400 hover:text-stone-600"
        title="Aide impression"
      >
        <Info className="h-4 w-4" />
      </button>

      {showInfo && (
        <div className="absolute z-50 mt-2 w-72 bg-white rounded-xl shadow-xl border border-stone-200 p-4 text-sm">
          <p className="font-bold text-stone-800 mb-2">
            {isAndroid() ? '📱 Android détecté' : '💻 PC / iOS détecté'}
          </p>
          {isAndroid() ? (
            <div className="space-y-2 text-stone-600">
              <p>L'impression utilise <strong>RawBT</strong>.</p>
              <p>Si l'imprimante n'imprime pas :</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Installe <strong>RawBT</strong> depuis le Play Store</li>
                <li>Couple la <strong>Goojprt PT-210</strong> en Bluetooth dans les paramètres Android</li>
                <li>Ouvre RawBT et sélectionne l'imprimante</li>
                <li>Reviens ici et clique Imprimer</li>
              </ol>
            </div>
          ) : (
            <div className="space-y-2 text-stone-600 text-xs">
              <p>La boîte d'impression du navigateur va s'ouvrir.</p>
              <p>Sélectionne l'imprimante Goojprt PT-210 dans la liste.</p>
              <p>Elle doit être couplée en Bluetooth sur ce PC.</p>
            </div>
          )}
          <button
            onClick={() => setShowInfo(false)}
            className="mt-3 text-xs text-stone-400 hover:text-stone-600"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Bouton d'impression rapide pour le POS (sans infos)
 */
export function QuickPrintButton({
  order,
  className = '',
}: {
  order: TicketOrder
  className?: string
}) {
  return (
    <Button
      onClick={() => printTicket(order, () => window.print())}
      variant="outline"
      size="sm"
      className={`gap-2 border-bm-primary text-bm-primary hover:bg-bm-primary-50 ${className}`}
    >
      <Printer className="h-4 w-4" />
      {isAndroid() ? 'Imprimer (RawBT)' : 'Imprimer'}
    </Button>
  )
}
