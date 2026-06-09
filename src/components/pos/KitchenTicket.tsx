'use client'

// ========================================
// AWID / BURGER MINUTE - Kitchen Ticket
// Ticket cuisine imprimable (sans prix)
// ========================================

import { forwardRef } from 'react'
import type { Order } from '@/bm/types'

interface KitchenTicketProps {
  order: Order
}

const KitchenTicket = forwardRef<HTMLDivElement, KitchenTicketProps>(
  ({ order }, ref) => {
    return (
      <div ref={ref} className="p-8 bg-white max-w-[80mm] mx-auto font-mono text-sm">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-4">
          <h1 className="text-2xl font-bold mb-2">BURGER MINUTE</h1>
          <p className="text-lg font-bold">TICKET CUISINE</p>
        </div>

        {/* Order Info */}
        <div className="mb-4 space-y-1">
          <div className="flex justify-between text-base font-bold">
            <span>N° COMMANDE:</span>
            <span>{order.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Type:</span>
            <span className="font-bold">
              {order.type === 'POS' ? 'SUR PLACE' : 'LIVRAISON'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Heure:</span>
            <span>{new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* Items */}
        <div className="border-t-2 border-black pt-4 mb-4">
          <p className="font-bold text-center mb-3 text-base">ARTICLES À PRÉPARER</p>
          {order.items.map((item, idx) => (
            <div key={idx} className="mb-3">
              <div className="flex items-start gap-2">
                <span className="text-2xl font-bold min-w-[2rem]">{item.quantity}x</span>
                <div className="flex-1">
                  <p className="font-bold text-base uppercase">{item.product.name}</p>
                  {item.notes && (
                    <p className="text-sm mt-1 pl-2 border-l-2 border-stone-400">
                      ⚠️ {item.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Special Notes */}
        {order.notes && (
          <div className="border-t-2 border-black pt-4 mb-4">
            <p className="font-bold mb-2">⚠️ NOTES SPÉCIALES:</p>
            <p className="pl-2 border-l-2 border-stone-400">{order.notes}</p>
          </div>
        )}

        {/* Delivery Info (if applicable) */}
        {order.type === 'ONLINE' && (
          <div className="border-t-2 border-black pt-4 mb-4">
            <p className="font-bold mb-2">📍 LIVRAISON:</p>
            <p className="text-xs">{order.clientAddress}</p>
            <p className="text-xs mt-1">Zone: {order.deliveryZone}</p>
            {order.assignedLivreur && (
              <p className="text-xs mt-1 font-bold">
                Livreur: {order.assignedLivreur.name}
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t-2 border-black pt-4 text-center">
          <p className="text-xs">
            {new Date().toLocaleDateString('fr-FR', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      </div>
    )
  }
)

KitchenTicket.displayName = 'KitchenTicket'

export default KitchenTicket
