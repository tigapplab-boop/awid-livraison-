'use client'

import { useState } from 'react'
import { Warehouse } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProductsTab from '@/components/admin/inventory/ProductsTab'
import PurchasesTab from '@/components/admin/inventory/PurchasesTab'
import DebtsTab from '@/components/admin/inventory/DebtsTab'
import ReportsTab from '@/components/admin/inventory/ReportsTab'
import React from 'react'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; tabName: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; tabName: string }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="font-bold text-stone-800 mb-1">Erreur dans {this.props.tabName}</p>
          <p className="text-sm text-stone-500 mb-4">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-bm-primary text-stone-900 rounded-lg font-semibold text-sm"
          >
            Réessayer
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('products')

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-black text-stone-900 flex items-center gap-2">
          <Warehouse className="h-6 w-6 text-bm-primary" />
          Inventaire & Achats
        </h1>
        <p className="text-stone-500 text-sm mt-0.5">
          Gestion des produits, stocks et fournisseurs
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-4 h-auto">
          <TabsTrigger value="products" className="text-xs sm:text-sm py-2">Produits</TabsTrigger>
          <TabsTrigger value="purchases" className="text-xs sm:text-sm py-2">Achats</TabsTrigger>
          <TabsTrigger value="debts" className="text-xs sm:text-sm py-2">Dettes</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs sm:text-sm py-2">Rapports</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <ErrorBoundary tabName="Produits">
            <ProductsTab />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="purchases">
          <ErrorBoundary tabName="Achats">
            <PurchasesTab />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="debts">
          <ErrorBoundary tabName="Dettes">
            <DebtsTab />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="reports">
          <ErrorBoundary tabName="Rapports">
            <ReportsTab />
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  )
}
