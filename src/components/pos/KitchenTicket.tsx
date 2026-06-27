'use client'

// ========================================
// AWID / BURGER MINUTE - Kitchen Ticket
// Ticket cuisine imprimable optimisé 80mm thermal
// Texte GRAND et LISIBLE pour la cuisine
// ========================================

import { forwardRef } from 'react'
import type { Order } from '@/bm/types'

interface KitchenTicketProps {
  order: Order
}

const KitchenTicket = forwardRef<HTMLDivElement, KitchenTicketProps>(
  ({ order }, ref) => {
    return (
      <div ref={ref} className="p-6 bg-white max-w-[80mm] mx-auto font-mono">
        {/* Header - Très visible */}
        <div className="text-center border-b-4 border-black pb-4 mb-6">
          <h1 className="text-3xl font-black mb-3 tracking-wide">BURGER MINUTE</h1>
          <p className="text-2xl font-black bg-black text-white py-2 px-4">CUISINE</p>
        </div>

        {/* Order Info - Grand et clair */}
        <div className="mb-6 space-y-3">
          <div className="bg-black text-white p-3">
            <p className="text-xs font-bold mb-1">N° COMMANDE</p>
            <p className="text-3xl font-black tracking-wider">{order.orderNumber}</p>
          </div>
          
          <div className="flex justify-between items-center text-xl font-bold border-2 border-black p-2">
            <span>Type:</span>
            <span className="bg-yellow-300 px-3 py-1">
              {order.type === 'POS' ? 'SUR PLACE' : 'LIVRAISON'}
            </span>
          </div>
          
          <div className="flex justify-between text-lg">
            <span className="font-bold">Heure:</span>
            <span className="font-black text-xl">{new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* Items - TRÈS LISIBLE */}
        <div className="border-t-4 border-black pt-6 mb-6">
          <p className="font-black text-center mb-5 text-2xl bg-stone-200 py-3">ARTICLES</p>
          {order.items.map((item, idx) => (
            <div key={idx} className="mb-6 border-b-2 border-dashed border-stone-300 pb-4">
              <div className="flex items-start gap-3">
                {/* Quantité très visible */}
                <div className="bg-black text-white font-black text-4xl min-w-[4rem] h-16 flex items-center justify-center rounded">
                  {item.quantity}
                </div>
                
                <div className="flex-1">
                  {/* Nom produit en TRÈS GROS */}
                  <p className="font-black text-2xl uppercase leading-tight mb-2">{item.product.name}</p>
                  
                  {/* Prix unitaire et total */}
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-lg font-bold">Prix unitaire:</span>
                    <span className="text-2xl font-black">{(item.price / 100).toFixed(2)} DA</span>
                  </div>
                  <div className="flex justify-between items-center bg-stone-100 p-2 mt-2">
                    <span className="text-xl font-black">TOTAL:</span>
                    <span className="text-3xl font-black">{((item.price * item.quantity) / 100).toFixed(2)} DA</span>
                  </div>
                  
                  {/* Notes en évidence si présentes */}
                  {item.notes && (
                    <div className="bg-yellow-200 border-2 border-yellow-600 p-3 mt-3">
                      <p className="font-black text-lg mb-1">⚠️ ATTENTION</p>
                      <p className="text-base font-bold">{item.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total Final - TRÈS VISIBLE */}
        <div className="border-4 border-black bg-black text-white p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-2xl font-black">SOUS-TOTAL:</span>
            <span className="text-3xl font-black">{(order.subtotal / 100).toFixed(2)} DA</span>
          </div>
          {order.deliveryFee > 0 && (
            <div className="flex justify-between items-center mb-4 border-t border-white pt-4">
              <span className="text-2xl font-black">LIVRAISON:</span>
              <span className="text-3xl font-black">{(order.deliveryFee / 100).toFixed(2)} DA</span>
            </div>
          )}
          <div className="flex justify-between items-center border-t-4 border-white pt-4">
            <span className="text-3xl font-black">TOTAL:</span>
            <span className="text-5xl font-black bg-white text-black px-4 py-2">{(order.total / 100).toFixed(2)} DA</span>
          </div>
        </div>

        {/* Special Notes - Très visible */}
        {order.notes && (
          <div className="border-4 border-yellow-400 bg-yellow-100 p-4 mb-6">
            <p className="font-black mb-3 text-xl text-center">⚠️ NOTES SPÉCIALES ⚠️</p>
            <p className="text-lg font-bold text-center">{order.notes}</p>
          </div>
        )}

        {/* Delivery Info */}
        {order.type === 'ONLINE' && (
          <div className="border-t-4 border-black pt-4 mb-6">
            <p className="font-black mb-3 text-xl">📍 LIVRAISON</p>
            <p className="text-base font-bold mb-2">{order.clientAddress}</p>
            <p className="text-base font-bold mb-2">Zone: {order.deliveryZone}</p>
            {order.assignedLivreur && (
              <p className="text-lg font-black bg-stone-200 p-2 mt-3">
                Livreur: {order.assignedLivreur.name}
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="border-t-4 border-black pt-4 text-center">
          <p className="text-base font-bold">
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
